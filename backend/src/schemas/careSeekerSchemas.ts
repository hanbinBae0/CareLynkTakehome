import { z } from "zod";

export const careSeekerProfileSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().min(7).max(30),
  preferredContactMethod: z.string().max(80).default(""),
  careRecipientName: z.string().max(120).default(""),
  relationshipToRecipient: z.string().max(120).default(""),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  zipCode: z.string().max(20).default(""),
  notes: z.string().max(2000).default(""),
});

export type CareSeekerProfileInput = z.infer<typeof careSeekerProfileSchema>;

