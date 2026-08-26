import { Router } from "express";

import { getWeeklyProgress } from "./progress.service.js";

const demoUserId = 1;

export const progressRoutes = Router();

progressRoutes.get("/", async (req, res, next) => {
  try {
    const weekDate = parseLocalDate(req.query.week);

    if (weekDate === null) {
      res.status(400).json({ error: "week must be a valid YYYY-MM-DD date" });
      return;
    }

    const progress = await getWeeklyProgress({
      userId: demoUserId,
      weekDate,
    });

    res.json(progress);
  } catch (error) {
    next(error);
  }
});

function parseLocalDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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
