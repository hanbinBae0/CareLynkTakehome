import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { InputField } from "../components/InputField";
import { TextAreaField } from "../components/TextAreaField";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { CareSeekerProfile, Job } from "../types/api";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const emptyProfile: Omit<CareSeekerProfile, "userId" | "email"> = {
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

const emptyJob: Omit<Job, "id" | "careSeekerUserId" | "status" | "createdAt"> = {
  title: "",
  careType: "",
  locationCity: "",
  locationState: "",
  zipCode: "",
  scheduleSummary: "",
  frequency: "",
  duration: "",
  requestedWeekdays: [],
  preferredStartTime: null,
  preferredEndTime: null,
  requiredSkills: [],
  notes: "",
};

function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function validateProfile(profile: Omit<CareSeekerProfile, "userId" | "email">): string | null {
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

function validateJob(
  jobForm: Omit<Job, "id" | "careSeekerUserId" | "status" | "createdAt">,
  requiredSkills: string[],
): string | null {
  if (!jobForm.title.trim()) {
    return "Job title is required.";
  }

  if (!jobForm.careType.trim()) {
    return "Care type is required.";
  }

  if (!jobForm.locationCity.trim() || !jobForm.locationState.trim()) {
    return "Job location city and state are required.";
  }

  if (!jobForm.scheduleSummary.trim()) {
    return "Schedule summary is required.";
  }

  if (!jobForm.frequency.trim() || !jobForm.duration.trim()) {
    return "Frequency and duration are required.";
  }

  if ((jobForm.preferredStartTime && !jobForm.preferredEndTime) || (!jobForm.preferredStartTime && jobForm.preferredEndTime)) {
    return "Provide both preferred start and end times, or leave both empty.";
  }

  if (
    jobForm.preferredStartTime &&
    jobForm.preferredEndTime &&
    toMinutes(jobForm.preferredStartTime) >= toMinutes(jobForm.preferredEndTime)
  ) {
    return "Preferred end time must be later than preferred start time.";
  }

  if (requiredSkills.some((skill) => skill.length > 60)) {
    return "Each required skill must be 60 characters or fewer.";
  }

  return null;
}

export function CareSeekerDashboardPage() {
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [skillsText, setSkillsText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    void Promise.all([api.getCareSeekerProfile(token), api.listJobs(token)])
      .then(([profileData, jobsData]) => {
        setProfile({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          preferredContactMethod: profileData.preferredContactMethod,
          careRecipientName: profileData.careRecipientName,
          relationshipToRecipient: profileData.relationshipToRecipient,
          city: profileData.city,
          state: profileData.state,
          zipCode: profileData.zipCode,
          notes: profileData.notes,
        });
        setJobs(jobsData);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load dashboard");
      });
  }, [token]);

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
      setProfile({
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone,
        preferredContactMethod: saved.preferredContactMethod,
        careRecipientName: saved.careRecipientName,
        relationshipToRecipient: saved.relationshipToRecipient,
        city: saved.city,
        state: saved.state,
        zipCode: saved.zipCode,
        notes: saved.notes,
      });
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

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setMessage("");
    setError("");

    const requiredSkills = parseSkills(skillsText);
    const jobError = validateJob(jobForm, requiredSkills);

    if (jobError) {
      setError(jobError);
      return;
    }

    try {
      const result = await api.createJob(token, {
        ...jobForm,
        requiredSkills,
      });

      setJobs((currentJobs) => [result.job, ...currentJobs]);
      setJobForm(emptyJob);
      setSkillsText("");
      navigate(`/care-seeker/jobs/${result.job.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create job");
    }
  }

  function toggleWeekday(dayIndex: number) {
    setJobForm((currentJob) => ({
      ...currentJob,
      requestedWeekdays: currentJob.requestedWeekdays.includes(dayIndex)
        ? currentJob.requestedWeekdays.filter((value) => value !== dayIndex)
        : [...currentJob.requestedWeekdays, dayIndex].sort(),
    }));
  }

  return (
    <PortalLayout title="Care seeker dashboard" subtitle="Profile completion, job creation, and caregiver matching">
      <div className="grid dashboard-grid">
        <section className="panel">
          <div className="section-row">
            <h2>Profile</h2>
            <span className="muted">Onboarding and contact details</span>
          </div>
          <form className="stack" onSubmit={saveProfile}>
            <div className="grid two-up">
              <InputField label="First name" value={profile.firstName} onChange={(value) => setProfile({ ...profile, firstName: value })} />
              <InputField label="Last name" value={profile.lastName} onChange={(value) => setProfile({ ...profile, lastName: value })} />
              <InputField label="Phone" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
              <InputField
                label="Preferred contact method"
                value={profile.preferredContactMethod}
                onChange={(value) => setProfile({ ...profile, preferredContactMethod: value })}
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

            <TextAreaField label="Profile notes" value={profile.notes} onChange={(value) => setProfile({ ...profile, notes: value })} />
            <button className="primary-button" type="submit">
              Save care seeker profile
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-row">
            <h2>Create a job</h2>
            <span className="muted">This will immediately compute caregiver matches</span>
          </div>
          <form className="stack" onSubmit={createJob}>
            <div className="grid two-up">
              <InputField label="Job title" value={jobForm.title} onChange={(value) => setJobForm({ ...jobForm, title: value })} />
              <InputField label="Care type" value={jobForm.careType} onChange={(value) => setJobForm({ ...jobForm, careType: value })} />
              <InputField
                label="Location city"
                value={jobForm.locationCity}
                onChange={(value) => setJobForm({ ...jobForm, locationCity: value })}
              />
              <InputField
                label="Location state"
                value={jobForm.locationState}
                onChange={(value) => setJobForm({ ...jobForm, locationState: value })}
              />
              <InputField label="ZIP code" value={jobForm.zipCode} onChange={(value) => setJobForm({ ...jobForm, zipCode: value })} />
              <InputField label="Frequency" value={jobForm.frequency} onChange={(value) => setJobForm({ ...jobForm, frequency: value })} />
              <InputField label="Duration" value={jobForm.duration} onChange={(value) => setJobForm({ ...jobForm, duration: value })} />
              <InputField
                label="Schedule summary"
                value={jobForm.scheduleSummary}
                onChange={(value) => setJobForm({ ...jobForm, scheduleSummary: value })}
              />
              <InputField
                label="Preferred start time"
                type="time"
                value={jobForm.preferredStartTime ?? ""}
                onChange={(value) => setJobForm({ ...jobForm, preferredStartTime: value || null })}
              />
              <InputField
                label="Preferred end time"
                type="time"
                value={jobForm.preferredEndTime ?? ""}
                onChange={(value) => setJobForm({ ...jobForm, preferredEndTime: value || null })}
              />
            </div>

            <div className="stack">
              <span className="field-label">Requested weekdays</span>
              <div className="pills">
                {weekdays.map((day, dayIndex) => (
                  <button
                    key={day}
                    className={jobForm.requestedWeekdays.includes(dayIndex) ? "pill active" : "pill"}
                    type="button"
                    onClick={() => toggleWeekday(dayIndex)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <InputField label="Required skills (comma-separated)" value={skillsText} onChange={setSkillsText} />
            <TextAreaField label="Notes / preferences" value={jobForm.notes} onChange={(value) => setJobForm({ ...jobForm, notes: value })} />
            <button className="primary-button" type="submit">
              Create care job
            </button>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="section-row">
          <h2>Jobs</h2>
          <span className="muted">Open a job to review ranked caregiver matches</span>
        </div>
        <div className="stack">
          {jobs.length === 0 && <p className="muted">No jobs created yet.</p>}
          {jobs.map((job) => (
            <article className="job-card" key={job.id}>
              <div>
                <h3>{job.title}</h3>
                <p className="muted">
                  {job.careType} · {job.locationCity}, {job.locationState}
                </p>
                <p>{job.scheduleSummary}</p>
              </div>
              <div className="card-actions">
                <span className={`status-chip ${job.status}`}>{job.status}</span>
                <Link className="secondary-button" to={`/care-seeker/jobs/${job.id}`}>
                  View matches
                </Link>
              </div>
            </article>
          ))}
        </div>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}
      </section>
    </PortalLayout>
  );
}
