import { Request, Response } from "express";

import {
  createJobRequestSchema,
  respondToJobRequestSchema,
} from "../schemas/jobRequestSchemas";
import * as jobRequestService from "../services/jobRequestService";
import { AppError } from "../utils/errors";

function getParam(request: Request, name: "jobId" | "requestId"): string {
  const value = request.params[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`Invalid ${name === "jobId" ? "job" : "request"} id`, 400);
  }

  return value;
}

export async function createJobRequest(request: Request, response: Response) {
  const input = createJobRequestSchema.parse(request.body);
  const result = await jobRequestService.createJobRequest(
    getParam(request, "jobId"),
    request.user!.id,
    input,
  );
  return response.status(201).json({ data: result });
}

export async function listJobRequests(request: Request, response: Response) {
  const result = await jobRequestService.listJobRequests(
    getParam(request, "jobId"),
    request.user!.id,
  );
  return response.json({ data: result });
}

export async function cancelJobRequest(request: Request, response: Response) {
  await jobRequestService.cancelJobRequest(
    getParam(request, "requestId"),
    getParam(request, "jobId"),
    request.user!.id,
  );
  return response.status(204).send();
}

export async function listCaregiverRequests(request: Request, response: Response) {
  const result = await jobRequestService.listCaregiverRequests(request.user!.id);
  return response.json({ data: result });
}

export async function respondToJobRequest(request: Request, response: Response) {
  const input = respondToJobRequestSchema.parse(request.body);
  const result = await jobRequestService.respondToJobRequest(
    getParam(request, "requestId"),
    request.user!.id,
    input,
  );
  return response.json({ data: result });
}
