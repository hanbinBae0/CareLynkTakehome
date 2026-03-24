import { withTransaction } from "../db/pool";
import * as careSeekerRepository from "../repositories/careSeekerRepository";
import * as userRepository from "../repositories/userRepository";
import { CareSeekerProfileInput } from "../schemas/careSeekerSchemas";
import { AppError } from "../utils/errors";

export async function getProfile(userId: string) {
  const profile = await careSeekerRepository.findByUserId(userId);

  if (!profile) {
    throw new AppError("Care seeker profile not found", 404);
  }

  return profile;
}

export async function upsertProfile(userId: string, input: CareSeekerProfileInput) {
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

    await careSeekerRepository.upsertProfile(
      userId,
      {
        preferredContactMethod: input.preferredContactMethod,
        careRecipientName: input.careRecipientName,
        relationshipToRecipient: input.relationshipToRecipient,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        notes: input.notes,
      },
      client,
    );
  });

  return getProfile(userId);
}

