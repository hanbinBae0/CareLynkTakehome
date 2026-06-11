import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const requestedAvailabilitySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(timePattern),
    endTime: z.string().regex(timePattern),
  })
  .refine((slot) => slot.startTime < slot.endTime, {
    message: "Availability end time must be later than start time",
  });

export const createJobSchema = z.object({
  title: z.string().min(1).max(120),
  careType: z.string().min(1).max(120),
  locationCity: z.string().min(1).max(120),
  locationState: z.string().min(1).max(120),
  zipCode: z.string().max(20).default(""),
  duration: z.string().min(1).max(120),
  requestedWeekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  preferredStartTime: z.string().regex(timePattern).nullable().default(null),
  preferredEndTime: z.string().regex(timePattern).nullable().default(null),
  requestedAvailabilities: z.array(requestedAvailabilitySchema).max(21).default([]),
  requiredSkills: z.array(z.string().min(1).max(60)).max(20),
  notes: z.string().max(2000).default(""),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

