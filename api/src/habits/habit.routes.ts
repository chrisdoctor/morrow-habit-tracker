import { Router } from "express";

import {
  findHabitsByUserId,
  habitExistsForUser,
  upsertHabitLog,
} from "./habit.repository.js";

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

habitRoutes.put("/:habitId/logs/:date", async (req, res, next) => {
  try {
    const habitId = parsePositiveInteger(req.params.habitId);
    const logDate = parseLocalDate(req.params.date);
    const value = parseLogValue(req.body);

    if (habitId === null) {
      res.status(400).json({ error: "habitId must be a positive integer" });
      return;
    }

    if (logDate === null) {
      res.status(400).json({ error: "date must be a valid YYYY-MM-DD date" });
      return;
    }

    if (value === null) {
      res.status(400).json({
        error: "value must be a number between 0 and 99999999.99",
      });
      return;
    }

    const habitExists = await habitExistsForUser(habitId, demoUserId);

    if (!habitExists) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    const habitLog = await upsertHabitLog({
      habitId,
      logDate,
      value,
    });

    res.json({ habitLog });
  } catch (error) {
    next(error);
  }
});

function parsePositiveInteger(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed;
}

function parseLocalDate(value: string | undefined): string | null {
  if (value === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return value;
}

function parseLogValue(body: unknown): number | null {
  if (body === null || typeof body !== "object" || !("value" in body)) {
    return null;
  }

  const value = (body as { value: unknown }).value;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 99999999.99
  ) {
    return null;
  }

  return Math.round(value * 100) / 100;
}
