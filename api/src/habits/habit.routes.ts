import { Router } from "express";

import { findHabitsByUserId } from "./habit.repository.js";

const demoUserId = 1;

export const habitRoutes = Router();

habitRoutes.get("/", async (_req, res, next) => {
  try {
    const habits = await findHabitsByUserId(demoUserId);

    res.json({ habits });
  } catch (error) {
    next(error);
  }
});
