import {
  ApiEnvelope,
  CaregiverJobRequest,
  CaregiverProfile,
  CareSeekerJobRequest,
  CareSeekerProfile,
  Job,
  MatchResult,
  SessionResponse,
  User,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiEnvelope<T> & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload.data;
}

export const api = {
  register(input: {
    role: "caregiver" | "care_seeker";
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) {
    return request<SessionResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  login(input: { role: "caregiver" | "care_seeker"; email: string; password: string }) {
    return request<SessionResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  me(token: string) {
    return request<User>("/auth/me", { token });
  },
  getCaregiverProfile(token: string) {
    return request<CaregiverProfile>("/caregiver/profile", { token });
  },
  saveCaregiverProfile(token: string, input: Omit<CaregiverProfile, "userId" | "email">) {
    return request<CaregiverProfile>("/caregiver/profile", {
      method: "PUT",
      token,
      body: JSON.stringify(input),
    });
  },
  getCareSeekerProfile(token: string) {
    return request<CareSeekerProfile>("/care-seeker/profile", { token });
  },
  saveCareSeekerProfile(token: string, input: Omit<CareSeekerProfile, "userId" | "email">) {
    return request<CareSeekerProfile>("/care-seeker/profile", {
      method: "PUT",
      token,
      body: JSON.stringify(input),
    });
  },
  createJob(
    token: string,
    input: Omit<Job, "id" | "careSeekerUserId" | "status" | "createdAt">,
  ) {
    return request<{ job: Job; matches: MatchResult[] }>("/jobs", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    });
  },
  updateJob(
    token: string,
    jobId: string,
    input: Omit<Job, "id" | "careSeekerUserId" | "status" | "createdAt">,
  ) {
    return request<{ job: Job; matches: MatchResult[] }>(`/jobs/${jobId}`, {
      method: "PUT",
      token,
      body: JSON.stringify(input),
    });
  },
  deleteJob(token: string, jobId: string) {
    return request<void>(`/jobs/${jobId}`, {
      method: "DELETE",
      token,
    });
  },
  listJobs(token: string) {
    return request<Job[]>("/jobs", { token });
  },
  getJob(token: string, jobId: string) {
    return request<Job>(`/jobs/${jobId}`, { token });
  },
  getMatches(token: string, jobId: string) {
    return request<MatchResult[]>(`/jobs/${jobId}/matches`, { token });
  },
  listJobRequests(token: string, jobId: string) {
    return request<CareSeekerJobRequest[]>(`/jobs/${jobId}/requests`, { token });
  },
  sendJobRequest(token: string, jobId: string, caregiverUserId: string, message: string) {
    return request<CareSeekerJobRequest>(`/jobs/${jobId}/requests`, {
      method: "POST",
      token,
      body: JSON.stringify({ caregiverUserId, message }),
    });
  },
  cancelJobRequest(token: string, jobId: string, requestId: string) {
    return request<void>(`/jobs/${jobId}/requests/${requestId}`, {
      method: "DELETE",
      token,
    });
  },
  listCaregiverRequests(token: string) {
    return request<CaregiverJobRequest[]>("/caregiver/requests", { token });
  },
  respondToJobRequest(token: string, requestId: string, status: "accepted" | "declined") {
    return request<CaregiverJobRequest>(`/caregiver/requests/${requestId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status }),
    });
  },
};

