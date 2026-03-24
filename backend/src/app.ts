import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/authRoutes";
import { caregiverRouter } from "./routes/caregiverRoutes";
import { careSeekerRouter } from "./routes/careSeekerRoutes";
import { jobRouter } from "./routes/jobRoutes";

export const app = express();

app.use(
  cors({
    origin: env.clientUrl,
  }),
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ data: { ok: true } });
});

app.use("/api/auth", authRouter);
app.use("/api/caregiver", caregiverRouter);
app.use("/api/care-seeker", careSeekerRouter);
app.use("/api/jobs", jobRouter);

app.use(errorHandler);

