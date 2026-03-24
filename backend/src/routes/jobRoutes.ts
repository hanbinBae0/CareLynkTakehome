import { Router } from "express";

import * as jobController from "../controllers/jobController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const jobRouter = Router();

jobRouter.use(requireAuth(["care_seeker"]));
jobRouter.post("/", asyncHandler(jobController.createJob));
jobRouter.get("/", asyncHandler(jobController.listJobs));
jobRouter.get("/:jobId", asyncHandler(jobController.getJob));
jobRouter.get("/:jobId/matches", asyncHandler(jobController.getMatches));

