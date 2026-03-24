import { Router } from "express";

import * as careSeekerController from "../controllers/careSeekerController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const careSeekerRouter = Router();

careSeekerRouter.use(requireAuth(["care_seeker"]));
careSeekerRouter.get("/profile", asyncHandler(careSeekerController.getProfile));
careSeekerRouter.put("/profile", asyncHandler(careSeekerController.updateProfile));

