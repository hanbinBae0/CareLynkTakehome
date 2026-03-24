import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { Job, MatchResult } from "../types/api";

export function JobMatchesPage() {
  const { jobId } = useParams();
  const { token } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !jobId) {
      return;
    }

    void Promise.all([api.getJob(token, jobId), api.getMatches(token, jobId)])
      .then(([jobData, matchesData]) => {
        setJob(jobData);
        setMatches(matchesData);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load job matches");
      });
  }, [jobId, token]);

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
          <Link className="secondary-button" to="/care-seeker/dashboard">
            Back to dashboard
          </Link>
        </div>

        {job && (
          <div className="job-summary">
            <p>
              <strong>Schedule:</strong> {job.scheduleSummary}
            </p>
            <p>
              <strong>Frequency:</strong> {job.frequency}
            </p>
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

        <div className="stack">
          {matches.length === 0 && !error && <p className="muted">No caregivers met the current matching threshold.</p>}

          {matches.map((match) => (
            <article className="match-card" key={match.caregiverUserId}>
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
            </article>
          ))}
        </div>
      </section>
    </PortalLayout>
  );
}

