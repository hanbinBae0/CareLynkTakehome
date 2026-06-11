import { Request, Response } from "express";

import { createJobSchema } from "../schemas/jobSchemas";
import * as jobService from "../services/jobService";
import { AppError } from "../utils/errors";

function getJobIdParam(request: Request): string {
  const { jobId } = request.params;

  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new AppError("Invalid job id", 400);
  }

  return jobId;
}

export async function createJob(request: Request, response: Response) {
  const input = createJobSchema.parse(request.body);
  const result = await jobService.createJob(request.user!.id, input);
  return response.status(201).json({ data: result });
}

export async function listJobs(request: Request, response: Response) {
  const jobs = await jobService.listJobs(request.user!.id);
  return response.json({ data: jobs });
}

export async function getJob(request: Request, response: Response) {
  const job = await jobService.getJob(getJobIdParam(request), request.user!.id);
  return response.json({ data: job });
}

export async function getMatches(request: Request, response: Response) {
  const matches = await jobService.getJobMatches(getJobIdParam(request), request.user!.id);
  return response.json({ data: matches });
}

export async function updateJob(request: Request, response: Response) {
  const input = createJobSchema.parse(request.body);
  const result = await jobService.updateJob(getJobIdParam(request), request.user!.id, input);
  return response.json({ data: result });
}

export async function deleteJob(request: Request, response: Response) {
  await jobService.deleteJob(getJobIdParam(request), request.user!.id);
  return response.status(204).send();
}
