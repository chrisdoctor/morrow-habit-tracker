import type { RowDataPacket } from "mysql2";

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

type HabitRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  unit: string;
  target_value: string;
  frequency: string;
  is_active: 0 | 1;
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
