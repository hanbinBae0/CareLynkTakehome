import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { CareSeekerProfile, Job } from "../types/api";

export function CareSeekerDashboardPage() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<CareSeekerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    void Promise.all([api.getCareSeekerProfile(token), api.listJobs(token)])
      .then(([profileData, jobData]) => {
        setProfile(profileData);
        setJobs(jobData);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load dashboard");
      });
  }, [token]);

  const openJobs = jobs.filter((job) => job.status === "open");
  const matchedJobs = jobs.filter((job) => job.status === "matched");
  const profileReady = Boolean(
    profile?.firstName &&
      profile.lastName &&
      profile.phone &&
      profile.city &&
      profile.state &&
      profile.careRecipientName,
  );

  return (
    <PortalLayout
      title={`Welcome${user ? `, ${user.firstName}` : ""}`}
      subtitle="Care seeker dashboard and activity overview"
    >
      {error && <p className="error-text">{error}</p>}

      <section className="dashboard-grid">
        <article className="panel dashboard-summary-card">
          <p className="eyebrow">Profile</p>
          <h2>{profileReady ? "Profile ready" : "Complete your profile"}</h2>
          <p className="muted">
            {profileReady
              ? `Care information is set up for ${profile?.careRecipientName}.`
              : "Add contact and care recipient details before contacting caregivers."}
          </p>
          <Link className="secondary-button" to="/care-seeker/profile">
            Manage profile
          </Link>
        </article>

        <article className="panel dashboard-summary-card">
          <p className="eyebrow">Jobs</p>
          <h2>{openJobs.length} open jobs</h2>
          <p className="muted">{matchedJobs.length} jobs currently have an accepted caregiver.</p>
          <div className="dashboard-metric">
            <strong>{jobs.length}</strong>
            <span>total jobs</span>
          </div>
          <Link className="primary-button" to="/care-seeker/jobs">
            View my jobs
          </Link>
        </article>
      </section>

      <section className="panel stack">
        <div className="section-row">
          <div>
            <p className="eyebrow">Recent Activity</p>
            <h2>Latest jobs</h2>
          </div>
          <Link className="secondary-button" to="/care-seeker/jobs/new">
            Create a job
          </Link>
        </div>

        {jobs.length === 0 && !error && (
          <p className="muted">No jobs created yet.</p>
        )}

        {jobs.slice(0, 3).map((job) => (
          <article className="dashboard-request-row" key={job.id}>
            <div>
              <strong>{job.title}</strong>
              <p className="muted">
                {job.careType} · {job.locationCity}, {job.locationState}
              </p>
            </div>
            <div className="card-actions">
              <span className={`status-chip ${job.status}`}>{job.status}</span>
              <Link className="secondary-button" to={`/care-seeker/jobs/${job.id}`}>
                View matches
              </Link>
            </div>
          </article>
        ))}
      </section>
    </PortalLayout>
  );
}
