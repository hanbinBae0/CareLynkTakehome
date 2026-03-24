import { Request, Response } from "express";

import { careSeekerProfileSchema } from "../schemas/careSeekerSchemas";
import * as careSeekerService from "../services/careSeekerService";

export async function getProfile(request: Request, response: Response) {
  const profile = await careSeekerService.getProfile(request.user!.id);
  return response.json({ data: profile });
}

export async function updateProfile(request: Request, response: Response) {
  const input = careSeekerProfileSchema.parse(request.body);
  const profile = await careSeekerService.upsertProfile(request.user!.id, input);
  return response.json({ data: profile });
}

