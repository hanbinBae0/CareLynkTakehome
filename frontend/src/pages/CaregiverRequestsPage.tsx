import { useEffect, useState } from "react";

import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PortalLayout } from "../layouts/PortalLayout";
import { CaregiverJobRequest } from "../types/api";

export function CaregiverRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<CaregiverJobRequest[]>([]);
  const [workingRequestId, setWorkingRequestId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    void api
      .listCaregiverRequests(token)
      .then(setRequests)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load requests");
      });
  }, [token]);

  async function respond(requestId: string, status: "accepted" | "declined") {
    if (!token) {
      return;
    }

    setError("");
    setMessage("");
    setWorkingRequestId(requestId);

    try {
      const updated = await api.respondToJobRequest(token, requestId, status);
      setRequests((current) =>
        current.map((request) => {
          if (request.id === requestId) {
            return updated;
          }

          if (
            status === "accepted" &&
            request.jobId === updated.jobId &&
            request.status === "pending"
          ) {
            return {
              ...request,
              status: "cancelled",
              respondedAt: updated.respondedAt,
            };
          }

          return request;
        }),
      );
      setMessage(status === "accepted" ? "Care request accepted." : "Care request declined.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update request");
    } finally {
      setWorkingRequestId("");
    }
  }

  return (
    <PortalLayout title="Care requests" subtitle="Review and respond to requests from care seekers">
      <section className="panel stack">
        <div className="section-row">
          <div>
            <h2>Incoming requests</h2>
            <p className="muted">Accepting a request matches the job and closes its other pending requests.</p>
          </div>
        </div>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}
        {requests.length === 0 && !error && (
          <p className="muted">No care requests have been sent to you yet.</p>
        )}

        {requests.map((request) => (
          <article className="request-card stack" key={request.id}>
            <div className="section-row">
              <div>
                <h3>{request.job.title}</h3>
                <p className="muted">
                  {request.job.careType} · {request.job.locationCity}, {request.job.locationState}
                </p>
              </div>
              <span className={`status-chip ${request.status}`}>{request.status}</span>
            </div>

            <div className="job-summary">
              <p>
                <strong>From:</strong> {request.careSeeker.firstName} {request.careSeeker.lastName}
              </p>
              <p>
                <strong>Recipient:</strong> {request.careSeeker.careRecipientName || "Not specified"}
              </p>
              <p>
                <strong>Relationship:</strong>{" "}
                {request.careSeeker.relationshipToRecipient || "Not specified"}
              </p>
              <p>
                <strong>Duration:</strong> {request.job.duration}
              </p>
              <p>
                <strong>Required skills:</strong>{" "}
                {request.job.requiredSkills.join(", ") || "None specified"}
              </p>
              <p>
                <strong>Job notes:</strong> {request.job.notes || "No additional notes"}
              </p>
              <p>
                <strong>Message:</strong> {request.message || "No message included"}
              </p>
            </div>

            {request.status === "accepted" && (
              <div className="contact-card">
                <strong>Contact details</strong>
                <span>{request.careSeeker.phone}</span>
                <span>{request.careSeeker.email}</span>
                <span>
                  Preferred contact: {request.careSeeker.preferredContactMethod || "Not specified"}
                </span>
              </div>
            )}

            {request.status === "pending" && (
              <div className="request-action-row">
                <button
                  className="primary-button"
                  disabled={workingRequestId === request.id}
                  onClick={() => void respond(request.id, "accepted")}
                  type="button"
                >
                  Accept request
                </button>
                <button
                  className="ghost-button"
                  disabled={workingRequestId === request.id}
                  onClick={() => void respond(request.id, "declined")}
                  type="button"
                >
                  Decline request
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </PortalLayout>
  );
}
