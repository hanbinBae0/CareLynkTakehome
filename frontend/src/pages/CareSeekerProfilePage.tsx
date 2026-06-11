import { FormEvent, useEffect, useState } from "react";

import { api } from "../api/client";
import { InputField } from "../components/InputField";
import { TextAreaField } from "../components/TextAreaField";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { CareSeekerProfile } from "../types/api";

type EditableCareSeekerProfile = Omit<CareSeekerProfile, "userId" | "email">;

const emptyProfile: EditableCareSeekerProfile = {
  firstName: "",
  lastName: "",
  phone: "",
  preferredContactMethod: "",
  careRecipientName: "",
  relationshipToRecipient: "",
  city: "",
  state: "",
  zipCode: "",
  notes: "",
};

function validateProfile(profile: EditableCareSeekerProfile): string | null {
  if (!profile.firstName.trim()) {
    return "First name is required.";
  }

  if (!profile.lastName.trim()) {
    return "Last name is required.";
  }

  if (!profile.phone.trim()) {
    return "Phone is required.";
  }

  if (!profile.city.trim() || !profile.state.trim()) {
    return "City and state are required.";
  }

  return null;
}

function toEditableProfile(profile: CareSeekerProfile): EditableCareSeekerProfile {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    preferredContactMethod: profile.preferredContactMethod,
    careRecipientName: profile.careRecipientName,
    relationshipToRecipient: profile.relationshipToRecipient,
    city: profile.city,
    state: profile.state,
    zipCode: profile.zipCode,
    notes: profile.notes,
  };
}

export function CareSeekerProfilePage() {
  const { token, user, updateUser } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [savedProfile, setSavedProfile] = useState(emptyProfile);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    void api
      .getCareSeekerProfile(token)
      .then((data) => {
        const editableProfile = toEditableProfile(data);
        setProfile(editableProfile);
        setSavedProfile(editableProfile);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load profile");
      });
  }, [token]);

  const hasUnsavedChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user) {
      return;
    }

    setMessage("");
    setError("");

    const profileError = validateProfile(profile);

    if (profileError) {
      setError(profileError);
      return;
    }

    try {
      const saved = await api.saveCareSeekerProfile(token, profile);
      const editableProfile = toEditableProfile(saved);
      setProfile(editableProfile);
      setSavedProfile(editableProfile);
      updateUser({
        ...user,
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone,
      });
      setMessage("Care seeker profile saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save profile");
    }
  }

  return (
    <PortalLayout title="Care seeker profile" subtitle="Contact and care recipient information">
      <section className="panel">
        <div className="profile-actions">
          <h2>Profile details</h2>
          <p className="muted">Keep these details current for caregivers who accept your requests.</p>
        </div>

        <form className="stack" onSubmit={saveProfile}>
          {hasUnsavedChanges && (
            <div className="draft-banner">
              <span className="status-pill unsaved">Unsaved changes</span>
              <p>Your changes remain local until you save the profile.</p>
            </div>
          )}

          <div className="grid two-up">
            <InputField label="First name" value={profile.firstName} onChange={(value) => setProfile({ ...profile, firstName: value })} />
            <InputField label="Last name" value={profile.lastName} onChange={(value) => setProfile({ ...profile, lastName: value })} />
            <InputField label="Phone" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
            <InputField
              label="Preferred contact method"
              value={profile.preferredContactMethod}
              onChange={(value) => setProfile({ ...profile, preferredContactMethod: value })}
              placeholder="Phone, text, or email"
            />
            <InputField
              label="Care recipient name"
              value={profile.careRecipientName}
              onChange={(value) => setProfile({ ...profile, careRecipientName: value })}
            />
            <InputField
              label="Relationship to recipient"
              value={profile.relationshipToRecipient}
              onChange={(value) => setProfile({ ...profile, relationshipToRecipient: value })}
            />
            <InputField label="City" value={profile.city} onChange={(value) => setProfile({ ...profile, city: value })} />
            <InputField label="State" value={profile.state} onChange={(value) => setProfile({ ...profile, state: value })} />
            <InputField label="ZIP code" value={profile.zipCode} onChange={(value) => setProfile({ ...profile, zipCode: value })} />
          </div>

          <TextAreaField
            label="Profile notes"
            value={profile.notes}
            onChange={(value) => setProfile({ ...profile, notes: value })}
          />

          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}

          <button className="primary-button" type="submit">
            {hasUnsavedChanges ? "Save care seeker profile" : "Profile saved"}
          </button>
        </form>
      </section>
    </PortalLayout>
  );
}
