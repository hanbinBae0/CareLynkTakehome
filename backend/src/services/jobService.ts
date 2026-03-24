import * as jobRepository from "../repositories/jobRepository";
import { CreateJobInput } from "../schemas/jobSchemas";
import { AppError } from "../utils/errors";
import { recomputeMatches } from "./matchingService";

export async function createJob(userId: string, input: CreateJobInput) {
  const job = await jobRepository.createJob(userId, input);
  const matches = await recomputeMatches(job.id, userId);
  return { job, matches };
}

export async function listJobs(userId: string) {
  return jobRepository.listByCareSeeker(userId);
}

export async function getJob(jobId: string, userId: string) {
  const job = await jobRepository.findById(jobId, userId);

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  return job;
}

export async function getJobMatches(jobId: string, userId: string) {
  await getJob(jobId, userId);
  return recomputeMatches(jobId, userId);
}

