import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db } from "../db/pool.js";

export type Habit = {
  id: number;
  userId: number;
  name: string;
  unit: string;
  targetValue: number;
  frequency: string;
  isActive: boolean;
};

export type HabitLog = {
  id: number;
  habitId: number;
  logDate: string;
  value: number;
};

type HabitRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  unit: string;
  target_value: string;
  frequency: string;
  is_active: 0 | 1;
};

type HabitLogRow = RowDataPacket & {
  id: number;
  habit_id: number;
  log_date: string;
  value: string;
};

export async function findHabitsByUserId(userId: number): Promise<Habit[]> {
  const [rows] = await db.execute<HabitRow[]>(
    `
      SELECT
        id,
        user_id,
        name,
        unit,
        target_value,
        frequency,
        is_active
      FROM habits
      WHERE user_id = ?
        AND is_active = TRUE
      ORDER BY id
    `,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    unit: row.unit,
    targetValue: Number(row.target_value),
    frequency: row.frequency,
    isActive: Boolean(row.is_active),
  }));
}

export async function habitExistsForUser(
  habitId: number,
  userId: number,
): Promise<boolean> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `
      SELECT id
      FROM habits
      WHERE id = ?
        AND user_id = ?
        AND is_active = TRUE
      LIMIT 1
    `,
    [habitId, userId],
  );

  return rows.length > 0;
}

export async function upsertHabitLog(input: {
  habitId: number;
  logDate: string;
  value: number;
}): Promise<HabitLog> {
  await db.execute<ResultSetHeader>(
    `
      INSERT INTO habit_logs (
        habit_id,
        log_date,
        value
      )
      VALUES (?, ?, ?) AS new
      ON DUPLICATE KEY UPDATE
        value = new.value
    `,
    [input.habitId, input.logDate, input.value],
  );

  const [rows] = await db.execute<HabitLogRow[]>(
    `
      SELECT
        id,
        habit_id,
        DATE_FORMAT(log_date, '%Y-%m-%d') AS log_date,
        value
      FROM habit_logs
      WHERE habit_id = ?
        AND log_date = ?
      LIMIT 1
    `,
    [input.habitId, input.logDate],
  );

  const log = rows[0];

  if (!log) {
    throw new Error("Habit log was not found after upsert");
  }

  return {
    id: log.id,
    habitId: log.habit_id,
    logDate: log.log_date,
    value: Number(log.value),
  };
}
