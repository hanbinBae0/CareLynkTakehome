import { withTransaction } from "../db/pool";
import * as caregiverRepository from "../repositories/caregiverRepository";
import * as userRepository from "../repositories/userRepository";
import { CaregiverProfileInput } from "../schemas/caregiverSchemas";
import { AppError } from "../utils/errors";

export async function getProfile(userId: string) {
  const profile = await caregiverRepository.findByUserId(userId);

  if (!profile) {
    throw new AppError("Caregiver profile not found", 404);
  }

  return profile;
}

export async function upsertProfile(userId: string, input: CaregiverProfileInput) {
  await withTransaction(async (client) => {
    await userRepository.updateUserBasics(
      userId,
      {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
      client,
    );

    await caregiverRepository.upsertProfile(
      userId,
      {
        headline: input.headline,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        bio: input.bio,
        yearsExperience: input.yearsExperience,
        skills: input.skills,
        certifications: input.certifications,
        acceptingNewJobs: input.acceptingNewJobs,
        availabilities: input.availabilities,
      },
      client,
    );
  });

  return getProfile(userId);
}

