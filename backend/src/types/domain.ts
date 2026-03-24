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
  scheduleSummary: string;
  frequency: string;
  duration: string;
  requestedWeekdays: number[];
  preferredStartTime: string | null;
  preferredEndTime: string | null;
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

