import { DatabaseError } from "pg";

import { withTransaction } from "../db/pool";
import * as jobRepository from "../repositories/jobRepository";
import * as jobRequestRepository from "../repositories/jobRequestRepository";
import * as matchRepository from "../repositories/matchRepository";
import {
  CreateJobRequestInput,
  RespondToJobRequestInput,
} from "../schemas/jobRequestSchemas";
import { AppError } from "../utils/errors";

export async function createJobRequest(
  jobId: string,
  careSeekerUserId: string,
  input: CreateJobRequestInput,
) {
  const job = await jobRepository.findById(jobId, careSeekerUserId);

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  if (job.status !== "open") {
    throw new AppError("Requests can only be sent for open jobs", 409);
  }

  const isMatch = await matchRepository.matchExists(jobId, input.caregiverUserId);

  if (!isMatch) {
    throw new AppError("This caregiver is not a current match for the job", 400);
  }

  try {
    await jobRequestRepository.create(jobId, input.caregiverUserId, input.message);
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "23505") {
      throw new AppError("A request has already been sent to this caregiver", 409);
    }
    throw error;
  }

  const requests = await jobRequestRepository.listForJob(jobId, careSeekerUserId);
  return requests.find((request) => request.caregiverUserId === input.caregiverUserId)!;
}

export async function listJobRequests(jobId: string, careSeekerUserId: string) {
  const job = await jobRepository.findById(jobId, careSeekerUserId);

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  return jobRequestRepository.listForJob(jobId, careSeekerUserId);
}

export async function cancelJobRequest(
  requestId: string,
  jobId: string,
  careSeekerUserId: string,
) {
  const cancelled = await jobRequestRepository.cancelPendingForCareSeeker(
    requestId,
    jobId,
    careSeekerUserId,
  );

  if (!cancelled) {
    throw new AppError("Pending request not found", 404);
  }
}

export async function listCaregiverRequests(caregiverUserId: string) {
  return jobRequestRepository.listForCaregiver(caregiverUserId);
}

export async function respondToJobRequest(
  requestId: string,
  caregiverUserId: string,
  input: RespondToJobRequestInput,
) {
  await withTransaction(async (client) => {
    const request = await jobRequestRepository.lockForCaregiver(
      requestId,
      caregiverUserId,
      client,
    );

    if (!request) {
      throw new AppError("Request not found", 404);
    }

    if (request.status !== "pending") {
      throw new AppError("This request has already been resolved", 409);
    }

    if (input.status === "accepted") {
      if (request.jobStatus !== "open") {
        throw new AppError("This job is no longer available", 409);
      }

      await jobRequestRepository.updateStatus(request.id, "accepted", client);
      await jobRequestRepository.cancelOtherPending(request.jobId, request.id, client);
      await jobRepository.updateStatus(request.jobId, "matched", client);
      return;
    }

    await jobRequestRepository.updateStatus(request.id, "declined", client);
  });

  const requests = await jobRequestRepository.listForCaregiver(caregiverUserId);
  return requests.find((request) => request.id === requestId)!;
}
