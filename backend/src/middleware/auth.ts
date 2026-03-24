import { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import * as userRepository from "../repositories/userRepository";
import { UserRole } from "../types/domain";
import { AppError } from "../utils/errors";
import { verifyToken } from "../utils/token";

export function requireAuth(allowedRoles?: UserRole[]) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const authorization = request.headers.authorization;
      const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

      if (!token) {
        throw new AppError("Authentication required", 401);
      }

      const payload = verifyToken(token, env.jwtSecret);
      const user = await userRepository.findUserById(payload.sub);

      if (!user) {
        throw new AppError("User not found", 401);
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        throw new AppError("You do not have access to this resource", 403);
      }

      request.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

