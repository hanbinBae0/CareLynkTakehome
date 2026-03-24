import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createJobSchema = z.object({
  title: z.string().min(1).max(120),
  careType: z.string().min(1).max(120),
  locationCity: z.string().min(1).max(120),
  locationState: z.string().min(1).max(120),
  zipCode: z.string().max(20).default(""),
  scheduleSummary: z.string().min(1).max(300),
  frequency: z.string().min(1).max(120),
  duration: z.string().min(1).max(120),
  requestedWeekdays: z.array(z.number().int().min(0).max(6)).max(7),
  preferredStartTime: z.string().regex(timePattern).nullable(),
  preferredEndTime: z.string().regex(timePattern).nullable(),
  requiredSkills: z.array(z.string().min(1).max(60)).max(20),
  notes: z.string().max(2000).default(""),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

