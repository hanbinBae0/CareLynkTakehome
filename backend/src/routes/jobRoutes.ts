import { Router } from "express";

import * as jobController from "../controllers/jobController";
import * as jobRequestController from "../controllers/jobRequestController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const jobRouter = Router();

jobRouter.use(requireAuth(["care_seeker"]));
jobRouter.post("/", asyncHandler(jobController.createJob));
jobRouter.get("/", asyncHandler(jobController.listJobs));
jobRouter.get("/:jobId", asyncHandler(jobController.getJob));
jobRouter.put("/:jobId", asyncHandler(jobController.updateJob));
jobRouter.delete("/:jobId", asyncHandler(jobController.deleteJob));
jobRouter.get("/:jobId/matches", asyncHandler(jobController.getMatches));
jobRouter.post("/:jobId/requests", asyncHandler(jobRequestController.createJobRequest));
jobRouter.get("/:jobId/requests", asyncHandler(jobRequestController.listJobRequests));
jobRouter.delete(
  "/:jobId/requests/:requestId",
  asyncHandler(jobRequestController.cancelJobRequest),
);

