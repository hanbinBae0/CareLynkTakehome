import { FormEvent, useEffect, useState } from "react";

import { api } from "../api/client";
import { InputField } from "../components/InputField";
import { TextAreaField } from "../components/TextAreaField";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { AvailabilitySlot, CaregiverProfile } from "../types/api";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaultAvailability: AvailabilitySlot = { weekday: 1, startTime: "09:00", endTime: "17:00" };

interface EditableAvailabilitySlot extends AvailabilitySlot {
  uiId: string;
}

type LocalCaregiverProfile = Omit<CaregiverProfile, "userId" | "email" | "availabilities"> & {
  availabilities: EditableAvailabilitySlot[];
};

interface SavedProfileSnapshot {
  profile: LocalCaregiverProfile;
  skillsText: string;
  certificationsText: string;
}

function createEditableAvailability(slot: AvailabilitySlot): EditableAvailabilitySlot {
  return {
    ...slot,
    uiId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  };
}

const emptyProfile: LocalCaregiverProfile = {
  firstName: "",
  lastName: "",
  phone: "",
  headline: "",
  city: "",
  state: "",
  zipCode: "",
  bio: "",
  yearsExperience: 0,
  skills: [],
  certifications: [],
  acceptingNewJobs: true,
  availabilities: [createEditableAvailability(defaultAvailability)],
};

const emptySavedProfile: LocalCaregiverProfile = {
  ...emptyProfile,
  availabilities: [],
};

function availabilityKey(slot: AvailabilitySlot) {
  return `${slot.weekday}:${slot.startTime}:${slot.endTime}`;
}

function summarizeAvailability(slot: AvailabilitySlot) {
  return `${weekdays[slot.weekday]} ${slot.startTime}-${slot.endTime}`;
}

function findDuplicateAvailability(slots: AvailabilitySlot[]) {
  const seen = new Set<string>();

  for (const slot of slots) {
    const key = availabilityKey(slot);

    if (seen.has(key)) {
      return slot;
    }

    seen.add(key);
  }

  return null;
}

function createSavedSnapshot(profile: LocalCaregiverProfile, skillsText: string, certificationsText: string): SavedProfileSnapshot {
  return {
    profile: {
      ...profile,
      availabilities: profile.availabilities.map((slot) => ({ ...slot })),
    },
    skillsText,
    certificationsText,
  };
}

function serializeDraft(profile: LocalCaregiverProfile, skillsText: string, certificationsText: string): string {
  return JSON.stringify({
    ...profile,
    skillsText,
    certificationsText,
    availabilities: profile.availabilities
      .map((slot) => ({
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
      .sort((left, right) => availabilityKey(left).localeCompare(availabilityKey(right))),
  });
}

export function CaregiverProfilePage() {
  const { token, user, updateUser } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [skillsText, setSkillsText] = useState("");
  const [certificationsText, setCertificationsText] = useState("");
  const [savedProfileSnapshot, setSavedProfileSnapshot] = useState<SavedProfileSnapshot>(
    createSavedSnapshot(emptySavedProfile, "", ""),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    void api
      .getCaregiverProfile(token)
      .then((data) => {
        const savedAvailabilities = data.availabilities.map(createEditableAvailability);
        const nextProfile = {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          headline: data.headline,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          bio: data.bio,
          yearsExperience: data.yearsExperience,
          skills: data.skills,
          certifications: data.certifications,
          acceptingNewJobs: data.acceptingNewJobs,
          availabilities: savedAvailabilities.length > 0 ? savedAvailabilities : emptyProfile.availabilities,
        };
        const nextSavedProfile = {
          ...nextProfile,
          availabilities: savedAvailabilities,
        };
        const nextSkillsText = data.skills.join(", ");
        const nextCertificationsText = data.certifications.join(", ");

        setProfile(nextProfile);
        setSkillsText(nextSkillsText);
        setCertificationsText(nextCertificationsText);
        setSavedProfileSnapshot(createSavedSnapshot(nextSavedProfile, nextSkillsText, nextCertificationsText));
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load profile");
      });
  }, [token]);

  function updateAvailability(index: number, patch: Partial<AvailabilitySlot>) {
    const next = [...profile.availabilities];
    next[index] = { ...next[index], ...patch };
    setError("");
    setProfile({ ...profile, availabilities: next });
  }

  function addAvailability() {
    const duplicateDefault = profile.availabilities.some((slot) => availabilityKey(slot) === availabilityKey(defaultAvailability));

    if (duplicateDefault) {
      setError("This Monday 09:00-17:00 slot already exists. Edit an existing row instead of adding the same slot twice.");
      return;
    }

    setError("");
    setProfile({
      ...profile,
      availabilities: [...profile.availabilities, createEditableAvailability(defaultAvailability)],
    });
  }

  const savedAvailabilityKeys = new Set(
    savedProfileSnapshot.profile.availabilities.map((slot) => availabilityKey(slot)),
  );
  const savedSlots = savedProfileSnapshot.profile.availabilities.map((slot) => ({
    ...slot,
    label: summarizeAvailability(slot),
  }));
  const hasUnsavedChanges =
    serializeDraft(profile, skillsText, certificationsText) !==
    serializeDraft(savedProfileSnapshot.profile, savedProfileSnapshot.skillsText, savedProfileSnapshot.certificationsText);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user) {
      return;
    }

    setError("");
    setMessage("");

    const duplicateAvailability = findDuplicateAvailability(profile.availabilities);

    if (duplicateAvailability) {
      setError(
        `Duplicate availability slot: ${weekdays[duplicateAvailability.weekday]} ${duplicateAvailability.startTime}-${duplicateAvailability.endTime}.`,
      );
      return;
    }

    try {
      const saved = await api.saveCaregiverProfile(token, {
        ...profile,
        availabilities: profile.availabilities.map(({ uiId: _uiId, ...slot }) => slot),
        skills: skillsText.split(",").map((item) => item.trim()).filter(Boolean),
        certifications: certificationsText.split(",").map((item) => item.trim()).filter(Boolean),
      });

      const nextProfile = {
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone,
        headline: saved.headline,
        city: saved.city,
        state: saved.state,
        zipCode: saved.zipCode,
        bio: saved.bio,
        yearsExperience: saved.yearsExperience,
        skills: saved.skills,
        certifications: saved.certifications,
        acceptingNewJobs: saved.acceptingNewJobs,
        availabilities: saved.availabilities.map(createEditableAvailability),
      };
      const nextSkillsText = saved.skills.join(", ");
      const nextCertificationsText = saved.certifications.join(", ");

      setProfile(nextProfile);
      setSkillsText(nextSkillsText);
      setCertificationsText(nextCertificationsText);
      setSavedProfileSnapshot(createSavedSnapshot(nextProfile, nextSkillsText, nextCertificationsText));
      updateUser({
        ...user,
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone,
      });
      setMessage("Profile saved. This caregiver is now available for matching.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save profile");
    }
  }

  return (
    <PortalLayout title="Caregiver onboarding" subtitle="Profile, availability, and qualifications">
      <section className="panel">
        <form className="stack" onSubmit={handleSubmit}>
          {hasUnsavedChanges && (
            <div className="draft-banner">
              <span className="status-pill unsaved">Unsaved changes</span>
              <p>Changes in this form are local only until you click `Save caregiver profile`.</p>
            </div>
          )}

          <div className="grid two-up">
            <InputField label="First name" value={profile.firstName} onChange={(value) => setProfile({ ...profile, firstName: value })} />
            <InputField label="Last name" value={profile.lastName} onChange={(value) => setProfile({ ...profile, lastName: value })} />
            <InputField label="Phone" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
            <InputField
              label="Years of experience"
              type="number"
              value={profile.yearsExperience}
              onChange={(value) => setProfile({ ...profile, yearsExperience: Number(value) })}
            />
            <InputField label="City" value={profile.city} onChange={(value) => setProfile({ ...profile, city: value })} />
            <InputField label="State" value={profile.state} onChange={(value) => setProfile({ ...profile, state: value })} />
            <InputField label="ZIP code" value={profile.zipCode} onChange={(value) => setProfile({ ...profile, zipCode: value })} />
            <InputField label="Headline" value={profile.headline} onChange={(value) => setProfile({ ...profile, headline: value })} />
          </div>

          <TextAreaField label="Short bio" value={profile.bio} onChange={(value) => setProfile({ ...profile, bio: value })} />
          <InputField label="Skills (comma-separated)" value={skillsText} onChange={setSkillsText} />
          <InputField label="Certifications (comma-separated)" value={certificationsText} onChange={setCertificationsText} />

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={profile.acceptingNewJobs}
              onChange={(event) => setProfile({ ...profile, acceptingNewJobs: event.target.checked })}
            />
            <span>Accepting new jobs</span>
          </label>

          <div className="stack">
            <div className="section-row">
              <div>
                <h3>Availability</h3>
                <p className="muted">Saved slots are shown separately from your current editable draft.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={addAvailability}
              >
                Add another time slot
              </button>
            </div>

            <div className="availability-group">
              <div className="section-row">
                <h4>Saved slots</h4>
                <span className="status-pill saved">Persisted</span>
              </div>
              {savedSlots.length === 0 ? (
                <p className="muted">No availability has been saved yet.</p>
              ) : (
                <div className="saved-slot-list">
                  {savedSlots.map((slot) => (
                    <span className="saved-slot-chip" key={slot.uiId}>
                      {slot.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="availability-group">
              <div className="section-row">
                <h4>Current draft</h4>
                <span className="status-pill draft">Editable</span>
              </div>
              <p className="muted">Review and save this draft to replace the currently saved availability.</p>

            {profile.availabilities.map((slot, index) => (
              <div className={`grid availability-row ${savedAvailabilityKeys.has(availabilityKey(slot)) ? "saved-row" : "new-row"}`} key={slot.uiId}>
                <div className="availability-row-header">
                  <span className={savedAvailabilityKeys.has(availabilityKey(slot)) ? "status-pill saved" : "status-pill unsaved"}>
                    {savedAvailabilityKeys.has(availabilityKey(slot)) ? "Saved in profile" : "Unsaved draft"}
                  </span>
                </div>
                <label className="field">
                  <span>Day</span>
                  <select value={slot.weekday} onChange={(event) => updateAvailability(index, { weekday: Number(event.target.value) })}>
                    {weekdays.map((day, dayIndex) => (
                      <option key={day} value={dayIndex}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <InputField label="Start" type="time" value={slot.startTime} onChange={(value) => updateAvailability(index, { startTime: value })} />
                <InputField label="End" type="time" value={slot.endTime} onChange={(value) => updateAvailability(index, { endTime: value })} />
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    setProfile({
                      ...profile,
                      availabilities: profile.availabilities.filter((_, availabilityIndex) => availabilityIndex !== index),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            </div>
          </div>

          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}

          <button className="primary-button" type="submit">
            {hasUnsavedChanges ? "Save caregiver profile" : "Caregiver profile saved"}
          </button>
        </form>
      </section>
    </PortalLayout>
  );
}
