import express from "express";

import { habitRoutes } from "./habits/habit.routes.js";
import { progressRoutes } from "./progress/progress.routes.js";

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/habits", habitRoutes);
app.use("/api/progress", progressRoutes);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  },
);
