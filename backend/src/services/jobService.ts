import { withTransaction } from "../db/pool";
import * as jobRepository from "../repositories/jobRepository";
import * as jobRequestRepository from "../repositories/jobRequestRepository";
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

export async function updateJob(jobId: string, userId: string, input: CreateJobInput) {
  const job = await withTransaction(async (client) => {
    const existingJob = await jobRepository.lockById(jobId, userId, client);

    if (!existingJob) {
      throw new AppError("Job not found", 404);
    }

    if (existingJob.status !== "open") {
      throw new AppError("Only open jobs can be edited", 409);
    }

    const updatedJob = await jobRepository.updateJob(jobId, userId, input, client);
    await jobRequestRepository.cancelPendingForJob(jobId, client);
    return updatedJob!;
  });

  const matches = await recomputeMatches(jobId, userId);
  return { job, matches };
}

export async function deleteJob(jobId: string, userId: string) {
  await withTransaction(async (client) => {
    const job = await jobRepository.lockById(jobId, userId, client);

    if (!job) {
      throw new AppError("Job not found", 404);
    }

    if (job.status !== "open") {
      throw new AppError("Only open jobs can be deleted", 409);
    }

    await jobRepository.deleteJob(jobId, userId, client);
  });
}

