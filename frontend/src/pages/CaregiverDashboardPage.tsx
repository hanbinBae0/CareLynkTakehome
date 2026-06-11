import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { CaregiverJobRequest, CaregiverProfile } from "../types/api";

export function CaregiverDashboardPage() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [requests, setRequests] = useState<CaregiverJobRequest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    void Promise.all([
      api.getCaregiverProfile(token),
      api.listCaregiverRequests(token),
    ])
      .then(([profileData, requestData]) => {
        setProfile(profileData);
        setRequests(requestData);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load dashboard");
      });
  }, [token]);

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const acceptedRequests = requests.filter((request) => request.status === "accepted");
  const profileReady = Boolean(
    profile?.headline &&
      profile.city &&
      profile.state &&
      profile.bio &&
      profile.availabilities.length > 0,
  );

  return (
    <PortalLayout
      title={`Welcome${user ? `, ${user.firstName}` : ""}`}
      subtitle="Caregiver dashboard and activity overview"
    >
      {error && <p className="error-text">{error}</p>}

      <section className="dashboard-grid">
        <article className="panel dashboard-summary-card">
          <p className="eyebrow">Profile</p>
          <h2>{profileReady ? "Ready for matching" : "Profile needs attention"}</h2>
          <p className="muted">
            {profileReady
              ? "Your profile includes location, experience, and availability."
              : "Complete your profile and availability so care seekers can match with you."}
          </p>
          <div className="dashboard-metric">
            <strong>{profile?.availabilities.length ?? 0}</strong>
            <span>availability slots</span>
          </div>
          <Link className="secondary-button" to="/caregiver/profile">
            Manage profile
          </Link>
        </article>

        <article className="panel dashboard-summary-card">
          <p className="eyebrow">Requests</p>
          <h2>{pendingRequests.length} pending</h2>
          <p className="muted">
            Review incoming care requests and accept or decline each opportunity.
          </p>
          <div className="dashboard-metric">
            <strong>{acceptedRequests.length}</strong>
            <span>accepted requests</span>
          </div>
          <Link className="primary-button" to="/caregiver/requests">
            View care requests
          </Link>
        </article>
      </section>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Recent Activity</p>
          <h2>Latest care requests</h2>
        </div>

        {requests.length === 0 && !error && (
          <p className="muted">No care requests have been sent to you yet.</p>
        )}

        {requests.slice(0, 3).map((request) => (
          <article className="dashboard-request-row" key={request.id}>
            <div>
              <strong>{request.job.title}</strong>
              <p className="muted">
                {request.careSeeker.firstName} {request.careSeeker.lastName} ·{" "}
                {request.job.locationCity}, {request.job.locationState}
              </p>
            </div>
            <span className={`status-chip ${request.status}`}>{request.status}</span>
          </article>
        ))}
      </section>
    </PortalLayout>
  );
}
