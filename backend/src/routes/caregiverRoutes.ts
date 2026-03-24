import { Router } from "express";

import * as caregiverController from "../controllers/caregiverController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const caregiverRouter = Router();

caregiverRouter.use(requireAuth(["caregiver"]));
caregiverRouter.get("/profile", asyncHandler(caregiverController.getProfile));
caregiverRouter.put("/profile", asyncHandler(caregiverController.updateProfile));

