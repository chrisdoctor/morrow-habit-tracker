import type { RowDataPacket } from "mysql2";

import { db } from "../db/pool.js";

export type ProgressSourceRow = RowDataPacket & {
  habit_id: number;
  name: string;
  unit: string;
  frequency: string;
  log_date: string | null;
  log_value: string | null;
};

type UserTimezoneRow = RowDataPacket & {
  timezone: string;
};

export async function findUserTimezone(
  userId: number,
): Promise<string | null> {
  const [rows] = await db.execute<UserTimezoneRow[]>(
    `
      SELECT timezone
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId],
  );

  return rows[0]?.timezone ?? null;
}

export async function findProgressSourceRows(input: {
  userId: number;
  throughDate: string;
}): Promise<ProgressSourceRow[]> {
  const [rows] = await db.execute<ProgressSourceRow[]>(
    `
      SELECT
        h.id AS habit_id,
        h.name,
        h.unit,
        h.frequency,
        DATE_FORMAT(l.log_date, '%Y-%m-%d') AS log_date,
        l.value AS log_value
      FROM habits h
      LEFT JOIN habit_logs l
        ON l.habit_id = h.id
        AND l.log_date <= ?
      WHERE h.user_id = ?
        AND h.is_active = TRUE
      ORDER BY h.id, l.log_date
    `,
    [input.throughDate, input.userId],
  );

  return rows;
}
