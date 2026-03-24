import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const availabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(timePattern),
  endTime: z.string().regex(timePattern),
});

export const caregiverProfileSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().min(7).max(30),
  headline: z.string().max(120).default(""),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  zipCode: z.string().max(20).default(""),
  bio: z.string().max(2000).default(""),
  yearsExperience: z.number().int().min(0).max(60),
  skills: z.array(z.string().min(1).max(60)).max(20),
  certifications: z.array(z.string().min(1).max(120)).max(20),
  acceptingNewJobs: z.boolean(),
  availabilities: z.array(availabilitySchema).max(21),
});

export type CaregiverProfileInput = z.infer<typeof caregiverProfileSchema>;

