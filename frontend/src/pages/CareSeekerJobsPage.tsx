import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { Job } from "../types/api";

export function CareSeekerJobsPage() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [deletingJobId, setDeletingJobId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    void api
      .listJobs(token)
      .then(setJobs)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load jobs");
      });
  }, [token]);

  async function deleteJob(job: Job) {
    if (!token || !window.confirm(`Delete "${job.title}"? This cannot be undone.`)) {
      return;
    }

    setError("");
    setDeletingJobId(job.id);

    try {
      await api.deleteJob(token, job.id);
      setJobs((current) => current.filter((item) => item.id !== job.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete job");
    } finally {
      setDeletingJobId("");
    }
  }

  return (
    <PortalLayout title="My jobs" subtitle="Review jobs, matches, and caregiver requests">
      <section className="panel">
        <div className="section-row">
          <div>
            <h2>Your care jobs</h2>
            <p className="muted">Open a job to review matches and request a caregiver.</p>
          </div>
          <Link className="primary-button" to="/care-seeker/jobs/new">
            Create job
          </Link>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="stack">
          {jobs.length === 0 && !error && <p className="muted">No jobs created yet.</p>}
          {jobs.map((job) => (
            <article className="job-card" key={job.id}>
              <div>
                <h3>{job.title}</h3>
                <p className="muted">
                  {job.careType} · {job.locationCity}, {job.locationState}
                </p>
                <p>{job.duration}</p>
              </div>
              <div className="card-actions">
                <span className={`status-chip ${job.status}`}>{job.status}</span>
                <Link className="secondary-button" to={`/care-seeker/jobs/${job.id}`}>
                  View matches
                </Link>
                {job.status === "open" && (
                  <>
                    <Link className="secondary-button" to={`/care-seeker/jobs/${job.id}/edit`}>
                      Edit
                    </Link>
                    <button
                      className="ghost-button"
                      disabled={deletingJobId === job.id}
                      onClick={() => void deleteJob(job)}
                      type="button"
                    >
                      {deletingJobId === job.id ? "Deleting..." : "Delete"}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </PortalLayout>
  );
}
