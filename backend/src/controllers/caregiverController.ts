import { Request, Response } from "express";

import { caregiverProfileSchema } from "../schemas/caregiverSchemas";
import * as caregiverService from "../services/caregiverService";

export async function getProfile(request: Request, response: Response) {
  const profile = await caregiverService.getProfile(request.user!.id);
  return response.json({ data: profile });
}

export async function updateProfile(request: Request, response: Response) {
  const input = caregiverProfileSchema.parse(request.body);
  const profile = await caregiverService.upsertProfile(request.user!.id, input);
  return response.json({ data: profile });
}

