import { withTransaction } from "../db/pool";
import { LoginInput, RegisterInput } from "../schemas/authSchemas";
import * as userRepository from "../repositories/userRepository";
import { AppError } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/password";
import { createToken } from "../utils/token";
import { env } from "../config/env";

export async function register(input: RegisterInput) {
  const existingUser = await userRepository.findUserRowByEmail(input.email);

  if (existingUser) {
    throw new AppError("An account with that email already exists", 409);
  }

  const passwordHash = hashPassword(input.password);

  const user = await withTransaction(async (client) => {
    const createdUser = await userRepository.createUser(
      {
        role: input.role,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
      client,
    );

    await userRepository.createEmptyRoleProfile(createdUser.id, createdUser.role, client);
    return createdUser;
  });

  const token = createToken(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
  );

  return { token, user };
}

export async function login(input: LoginInput) {
  const foundUser = await userRepository.findUserRowByEmail(input.email);

  if (
    !foundUser ||
    !verifyPassword(input.password, foundUser.password_hash) ||
    foundUser.role !== input.role
  ) {
    throw new AppError("Invalid email or password", 401);
  }

  const user = userRepository.mapUserWithPassword(foundUser).user;
  const token = createToken(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
  );

  return { token, user };
}

