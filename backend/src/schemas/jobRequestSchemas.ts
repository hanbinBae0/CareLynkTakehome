import { z } from "zod";

export const createJobRequestSchema = z.object({
  caregiverUserId: z.string().uuid(),
  message: z.string().max(1000).default(""),
});

export const respondToJobRequestSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

export type CreateJobRequestInput = z.infer<typeof createJobRequestSchema>;
export type RespondToJobRequestInput = z.infer<typeof respondToJobRequestSchema>;
