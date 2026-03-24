import { Request, Response } from "express";

import { loginSchema, registerSchema } from "../schemas/authSchemas";
import * as authService from "../services/authService";

export async function register(request: Request, response: Response) {
  const input = registerSchema.parse(request.body);
  const result = await authService.register(input);
  return response.status(201).json({ data: result });
}

export async function login(request: Request, response: Response) {
  const input = loginSchema.parse(request.body);
  const result = await authService.login(input);
  return response.json({ data: result });
}

export async function me(request: Request, response: Response) {
  return response.json({ data: request.user });
}

