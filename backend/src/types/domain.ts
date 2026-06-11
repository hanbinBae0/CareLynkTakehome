export type UserRole = "caregiver" | "care_seeker";

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface AvailabilitySlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface CaregiverProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  headline: string;
  city: string;
  state: string;
  zipCode: string;
  bio: string;
  yearsExperience: number;
  skills: string[];
  certifications: string[];
  acceptingNewJobs: boolean;
  availabilities: AvailabilitySlot[];
}

export interface CareSeekerProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  preferredContactMethod: string;
  careRecipientName: string;
  relationshipToRecipient: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
}

export interface Job {
  id: string;
  careSeekerUserId: string;
  title: string;
  careType: string;
  locationCity: string;
  locationState: string;
  zipCode: string;
  duration: string;
  requestedWeekdays: number[];
  preferredStartTime: string | null;
  preferredEndTime: string | null;
  requestedAvailabilities: AvailabilitySlot[];
  requiredSkills: string[];
  notes: string;
  status: "open" | "matched" | "closed";
  createdAt: string;
}

export interface MatchResult {
  caregiverUserId: string;
  score: number;
  reasons: string[];
  caregiver: CaregiverProfile;
}

export type JobRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface CareSeekerJobRequest {
  id: string;
  jobId: string;
  caregiverUserId: string;
  status: JobRequestStatus;
  message: string;
  createdAt: string;
  respondedAt: string | null;
  caregiver: {
    firstName: string;
    lastName: string;
    headline: string;
  };
}

export interface CaregiverJobRequest {
  id: string;
  jobId: string;
  caregiverUserId: string;
  status: JobRequestStatus;
  message: string;
  createdAt: string;
  respondedAt: string | null;
  job: Job;
  careSeeker: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    preferredContactMethod: string;
    careRecipientName: string;
    relationshipToRecipient: string;
  };
}

