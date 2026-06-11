import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { TextAreaField } from "../components/TextAreaField";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { CareSeekerJobRequest, Job, MatchResult } from "../types/api";

export function JobMatchesPage() {
  const { jobId } = useParams();
  const { token } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [requests, setRequests] = useState<CareSeekerJobRequest[]>([]);
  const [requestMessages, setRequestMessages] = useState<Record<string, string>>({});
  const [workingCaregiverId, setWorkingCaregiverId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !jobId) {
      return;
    }

    void Promise.all([
      api.getJob(token, jobId),
      api.getMatches(token, jobId),
      api.listJobRequests(token, jobId),
    ])
      .then(([jobData, matchesData, requestData]) => {
        setJob(jobData);
        setMatches(matchesData);
        setRequests(requestData);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load job matches");
      });
  }, [jobId, token]);

  async function sendRequest(caregiverUserId: string) {
    if (!token || !jobId) {
      return;
    }

    setError("");
    setMessage("");
    setWorkingCaregiverId(caregiverUserId);

    try {
      const created = await api.sendJobRequest(
        token,
        jobId,
        caregiverUserId,
        requestMessages[caregiverUserId] ?? "",
      );
      setRequests((current) => [created, ...current]);
      setMessage("Request sent to the caregiver.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to send request");
    } finally {
      setWorkingCaregiverId("");
    }
  }

  async function cancelRequest(request: CareSeekerJobRequest) {
    if (!token || !jobId) {
      return;
    }

    setError("");
    setMessage("");
    setWorkingCaregiverId(request.caregiverUserId);

    try {
      await api.cancelJobRequest(token, jobId, request.id);
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, status: "cancelled", respondedAt: new Date().toISOString() }
            : item,
        ),
      );
      setMessage("Request cancelled.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to cancel request");
    } finally {
      setWorkingCaregiverId("");
    }
  }

  return (
    <PortalLayout title="Job matches" subtitle="Review the ranked caregiver list for a care request">
      <section className="panel">
        <div className="section-row">
          <div>
            <h2>{job?.title ?? "Loading..."}</h2>
            {job && (
              <p className="muted">
                {job.careType} · {job.locationCity}, {job.locationState}
              </p>
            )}
          </div>
          <Link className="secondary-button" to="/care-seeker/jobs">
            Back to jobs
          </Link>
        </div>

        {job && (
          <div className="job-summary">
            <p>
              <strong>Duration:</strong> {job.duration}
            </p>
            <p>
              <strong>Skills:</strong> {job.requiredSkills.join(", ") || "None specified"}
            </p>
            <p>
              <strong>Notes:</strong> {job.notes || "No additional notes"}
            </p>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <div className="stack">
          {matches.length === 0 && !error && <p className="muted">No caregivers met the current matching threshold.</p>}

          {matches.map((match) => {
            const sentRequest = requests.find(
              (request) => request.caregiverUserId === match.caregiverUserId,
            );

            return (
            <article className="match-card stack" key={match.caregiverUserId}>
              <div className="match-card-header">
                <div>
                  <h3>
                    {match.caregiver.firstName} {match.caregiver.lastName}
                  </h3>
                  <p className="muted">
                    {match.caregiver.city}, {match.caregiver.state}
                  </p>
                </div>
                <div className="score-pill">{match.score}</div>
              </div>

              <p>{match.caregiver.headline || "General caregiver profile"}</p>
              <p className="muted">{match.caregiver.bio || "No bio provided."}</p>
              <p>
                <strong>Skills:</strong> {match.caregiver.skills.join(", ") || "None listed"}
              </p>
              <ul className="reason-list">
                {match.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {sentRequest ? (
                <div className="request-action-row">
                  <span className={`status-chip ${sentRequest.status}`}>
                    Request {sentRequest.status}
                  </span>
                  {sentRequest.status === "pending" && (
                    <button
                      className="ghost-button"
                      disabled={workingCaregiverId === match.caregiverUserId}
                      onClick={() => void cancelRequest(sentRequest)}
                      type="button"
                    >
                      Cancel request
                    </button>
                  )}
                </div>
              ) : (
                <div className="stack">
                  <TextAreaField
                    label="Message to caregiver (optional)"
                    value={requestMessages[match.caregiverUserId] ?? ""}
                    onChange={(value) =>
                      setRequestMessages((current) => ({
                        ...current,
                        [match.caregiverUserId]: value,
                      }))
                    }
                  />
                  <button
                    className="primary-button"
                    disabled={job?.status !== "open" || workingCaregiverId === match.caregiverUserId}
                    onClick={() => void sendRequest(match.caregiverUserId)}
                    type="button"
                  >
                    {workingCaregiverId === match.caregiverUserId
                      ? "Sending..."
                      : "Send care request"}
                  </button>
                </div>
              )}
            </article>
            );
          })}
        </div>
      </section>
    </PortalLayout>
  );
}

