import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client";
import { InputField } from "../components/InputField";
import { TextAreaField } from "../components/TextAreaField";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { AvailabilitySlot, Job } from "../types/api";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const schedulePresets = [
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [0, 6] },
  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
];

interface EditableAvailabilitySlot extends AvailabilitySlot {
  uiId: string;
}

type JobDraft = Omit<
  Job,
  "id" | "careSeekerUserId" | "status" | "createdAt" | "requestedAvailabilities"
> & {
  requestedAvailabilities: EditableAvailabilitySlot[];
};

function createEditableAvailability(slot: AvailabilitySlot): EditableAvailabilitySlot {
  return {
    ...slot,
    uiId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  };
}

function createDefaultSlot(weekday: number): EditableAvailabilitySlot {
  return createEditableAvailability({
    weekday,
    startTime: "09:00",
    endTime: "17:00",
  });
}

const emptyJob: JobDraft = {
  title: "",
  careType: "",
  locationCity: "",
  locationState: "",
  zipCode: "",
  duration: "",
  requestedWeekdays: [],
  preferredStartTime: null,
  preferredEndTime: null,
  requestedAvailabilities: [],
  requiredSkills: [],
  notes: "",
};

function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function findDuplicateAvailability(slots: AvailabilitySlot[]) {
  const seen = new Set<string>();

  return (
    slots.find((slot) => {
      const key = `${slot.weekday}:${slot.startTime}:${slot.endTime}`;
      if (seen.has(key)) {
        return true;
      }
      seen.add(key);
      return false;
    }) ?? null
  );
}

function validateJob(jobForm: JobDraft, requiredSkills: string[]): string | null {
  if (!jobForm.title.trim()) {
    return "Job title is required.";
  }

  if (!jobForm.careType.trim()) {
    return "Care type is required.";
  }

  if (!jobForm.locationCity.trim() || !jobForm.locationState.trim()) {
    return "Job location city and state are required.";
  }

  if (!jobForm.duration.trim()) {
    return "Duration is required.";
  }

  const invalidSlot = jobForm.requestedAvailabilities.find(
    (slot) => slot.startTime >= slot.endTime,
  );

  if (invalidSlot) {
    return `${weekdays[invalidSlot.weekday]} availability must end after it starts.`;
  }

  const duplicateSlot = findDuplicateAvailability(jobForm.requestedAvailabilities);

  if (duplicateSlot) {
    return `Duplicate requested period on ${weekdays[duplicateSlot.weekday]}.`;
  }

  if (requiredSkills.some((skill) => skill.length > 60)) {
    return "Each required skill must be 60 characters or fewer.";
  }

  return null;
}

interface CareSeekerJobFormPageProps {
  mode: "create" | "edit";
}

export function CareSeekerJobFormPage({ mode }: CareSeekerJobFormPageProps) {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { token } = useAuth();
  const [jobForm, setJobForm] = useState(emptyJob);
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(mode === "edit");
  const [canEdit, setCanEdit] = useState(mode === "create");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !token || !jobId) {
      return;
    }

    void api
      .getJob(token, jobId)
      .then((job) => {
        setJobForm({
          title: job.title,
          careType: job.careType,
          locationCity: job.locationCity,
          locationState: job.locationState,
          zipCode: job.zipCode,
          duration: job.duration,
          requestedWeekdays: job.requestedWeekdays,
          preferredStartTime: job.preferredStartTime,
          preferredEndTime: job.preferredEndTime,
          requestedAvailabilities: job.requestedAvailabilities.map(createEditableAvailability),
          requiredSkills: job.requiredSkills,
          notes: job.notes,
        });
        setSkillsText(job.requiredSkills.join(", "));
        setCanEdit(job.status === "open");

        if (job.status !== "open") {
          setError("Only open jobs can be edited.");
        }
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load job");
      })
      .finally(() => setLoading(false));
  }, [jobId, mode, token]);

  function toggleDay(weekday: number) {
    const enabled = jobForm.requestedAvailabilities.some((slot) => slot.weekday === weekday);
    setError("");
    setJobForm({
      ...jobForm,
      requestedAvailabilities: enabled
        ? jobForm.requestedAvailabilities.filter((slot) => slot.weekday !== weekday)
        : [...jobForm.requestedAvailabilities, createDefaultSlot(weekday)],
    });
  }

  function updateAvailability(uiId: string, patch: Partial<AvailabilitySlot>) {
    setError("");
    setJobForm({
      ...jobForm,
      requestedAvailabilities: jobForm.requestedAvailabilities.map((slot) =>
        slot.uiId === uiId ? { ...slot, ...patch } : slot,
      ),
    });
  }

  function addAvailability(weekday: number) {
    const daySlots = jobForm.requestedAvailabilities.filter((slot) => slot.weekday === weekday);
    const suggestions = [
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "13:00", endTime: "17:00" },
      { startTime: "18:00", endTime: "20:00" },
    ];
    const suggestion = suggestions.find(
      (period) =>
        !daySlots.some(
          (slot) => slot.startTime === period.startTime && slot.endTime === period.endTime,
        ),
    );

    setJobForm({
      ...jobForm,
      requestedAvailabilities: [
        ...jobForm.requestedAvailabilities,
        createEditableAvailability({
          weekday,
          startTime: suggestion?.startTime ?? "20:00",
          endTime: suggestion?.endTime ?? "22:00",
        }),
      ],
    });
  }

  function applySchedulePreset(days: number[]) {
    setError("");
    setJobForm({
      ...jobForm,
      requestedAvailabilities: days.map(createDefaultSlot),
    });
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setError("");
    const requiredSkills = parseSkills(skillsText);
    const jobError = validateJob(jobForm, requiredSkills);

    if (jobError) {
      setError(jobError);
      return;
    }

    setSubmitting(true);

    try {
      const requestedAvailabilities = jobForm.requestedAvailabilities.map(
        ({ uiId: _uiId, ...slot }) => slot,
      );
      const input = {
        ...jobForm,
        requestedWeekdays: [...new Set(requestedAvailabilities.map((slot) => slot.weekday))].sort(),
        preferredStartTime: null,
        preferredEndTime: null,
        requestedAvailabilities,
        requiredSkills,
      };
      const result =
        mode === "edit" && jobId
          ? await api.updateJob(token, jobId, input)
          : await api.createJob(token, input);

      navigate(`/care-seeker/jobs/${result.job.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Failed to ${mode === "edit" ? "update" : "create"} job`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalLayout
      title={mode === "edit" ? "Edit job" : "Create job"}
      subtitle="Describe care needs and requested weekly times"
    >
      <section className="panel">
        <div className="profile-actions">
          <h2>Job details</h2>
          <p className="muted">
            {mode === "edit"
              ? "Saving changes cancels pending caregiver requests and recomputes matches."
              : "Matches are computed immediately after the job is created."}
          </p>
        </div>

        {loading ? (
          <p className="muted">Loading job...</p>
        ) : (
        <form className="stack" onSubmit={saveJob}>
          <fieldset className="form-fieldset" disabled={!canEdit || submitting}>
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
            <InputField label="Duration" value={jobForm.duration} onChange={(value) => setJobForm({ ...jobForm, duration: value })} />
          </div>

          <div className="stack">
            <div>
              <h3>Requested weekly schedule</h3>
              <p className="muted">Turn days on and set the care period needed for each day.</p>
            </div>

            <div className="schedule-presets" aria-label="Requested schedule presets">
              <span className="field-label">Quick setup</span>
              <div className="pills">
                {schedulePresets.map((preset) => (
                  <button
                    className="pill"
                    key={preset.label}
                    onClick={() => applySchedulePreset(preset.days)}
                    type="button"
                  >
                    {preset.label} 9–5
                  </button>
                ))}
                <button
                  className="pill"
                  onClick={() => setJobForm({ ...jobForm, requestedAvailabilities: [] })}
                  type="button"
                >
                  Flexible schedule
                </button>
              </div>
            </div>

            <div className="weekly-schedule">
              {weekdays.map((day, weekday) => {
                const daySlots = jobForm.requestedAvailabilities
                  .filter((slot) => slot.weekday === weekday)
                  .sort((left, right) => left.startTime.localeCompare(right.startTime));
                const enabled = daySlots.length > 0;

                return (
                  <section className={enabled ? "schedule-day active" : "schedule-day"} key={day}>
                    <div className="schedule-day-header">
                      <label className="day-toggle">
                        <input checked={enabled} onChange={() => toggleDay(weekday)} type="checkbox" />
                        <span className="day-toggle-control" aria-hidden="true" />
                        <span>{day}</span>
                      </label>
                      <span className="schedule-day-status">
                        {enabled ? `${daySlots.length} period${daySlots.length === 1 ? "" : "s"}` : "Not requested"}
                      </span>
                    </div>

                    {enabled && (
                      <div className="day-periods">
                        {daySlots.map((slot) => (
                          <div className="time-period-row" key={slot.uiId}>
                            <InputField
                              label="From"
                              type="time"
                              value={slot.startTime}
                              onChange={(value) => updateAvailability(slot.uiId, { startTime: value })}
                            />
                            <InputField
                              label="To"
                              type="time"
                              value={slot.endTime}
                              onChange={(value) => updateAvailability(slot.uiId, { endTime: value })}
                            />
                            <button
                              className="remove-period-button"
                              onClick={() =>
                                setJobForm({
                                  ...jobForm,
                                  requestedAvailabilities: jobForm.requestedAvailabilities.filter(
                                    (availability) => availability.uiId !== slot.uiId,
                                  ),
                                })
                              }
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          className="add-period-button"
                          onClick={() => addAvailability(weekday)}
                          type="button"
                        >
                          + Add another period
                        </button>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>

          <InputField label="Required skills (comma-separated)" value={skillsText} onChange={setSkillsText} />
          <TextAreaField label="Notes / preferences" value={jobForm.notes} onChange={(value) => setJobForm({ ...jobForm, notes: value })} />
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" disabled={submitting || !canEdit} type="submit">
            {submitting
              ? mode === "edit"
                ? "Saving changes..."
                : "Creating job..."
              : mode === "edit"
                ? "Save job changes"
                : "Create care job"}
          </button>
          </fieldset>
        </form>
        )}
      </section>
    </PortalLayout>
  );
}
