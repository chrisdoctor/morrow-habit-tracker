import {
  findProgressSourceRows,
  findUserTimezone,
  type ProgressSourceRow,
} from "./progress.repository.js";

export type ProgressDay = {
  date: string;
  value: number | null;
  completed: boolean;
};

export type HabitProgress = {
  id: number;
  name: string;
  unit: string;
  frequency: string;
  weeklyTotal: number;
  completedDays: number;
  currentStreak: number;
  days: ProgressDay[];
};

export type WeeklyProgress = {
  week: {
    startsOn: string;
    endsOn: string;
  };
  today: string;
  habits: HabitProgress[];
};

type HabitAccumulator = {
  id: number;
  name: string;
  unit: string;
  frequency: string;
  logsByDate: Map<string, number>;
};

export async function getWeeklyProgress(input: {
  userId: number;
  weekDate: string;
}): Promise<WeeklyProgress> {
  const timezone = await findUserTimezone(input.userId);

  if (timezone === null) {
    throw new Error(`User ${input.userId} was not found`);
  }

  const weekStart = getMonday(input.weekDate);
  const weekEnd = addDays(weekStart, 6);
  const today = getTodayInTimezone(timezone);
  const rows = await findProgressSourceRows({
    userId: input.userId,
    throughDate: today,
  });
  const habits = groupRowsByHabit(rows);
  const weekDates = Array.from({ length: 7 }, (_value, index) =>
    addDays(weekStart, index),
  );

  return {
    week: {
      startsOn: weekStart,
      endsOn: weekEnd,
    },
    today,
    habits: habits.map((habit) => {
      const days = weekDates.map((date) => {
        const value = habit.logsByDate.get(date) ?? null;

        return {
          date,
          value,
          completed: value !== null,
        };
      });

      return {
        id: habit.id,
        name: habit.name,
        unit: habit.unit,
        frequency: habit.frequency,
        weeklyTotal: roundToTwoDecimals(
          days.reduce((total, day) => total + (day.value ?? 0), 0),
        ),
        completedDays: days.filter((day) => day.completed).length,
        currentStreak: calculateCurrentStreak(habit, today),
        days,
      };
    }),
  };
}

function groupRowsByHabit(rows: ProgressSourceRow[]): HabitAccumulator[] {
  const habitsById = new Map<number, HabitAccumulator>();

  for (const row of rows) {
    let habit = habitsById.get(row.habit_id);

    if (habit === undefined) {
      habit = {
        id: row.habit_id,
        name: row.name,
        unit: row.unit,
        frequency: row.frequency,
        logsByDate: new Map<string, number>(),
      };
      habitsById.set(row.habit_id, habit);
    }

    if (row.log_date !== null && row.log_value !== null) {
      habit.logsByDate.set(row.log_date, Number(row.log_value));
    }
  }

  return Array.from(habitsById.values());
}

function calculateCurrentStreak(
  habit: HabitAccumulator,
  today: string,
): number {
  const todayValue = habit.logsByDate.get(today);
  let currentDate = todayValue !== undefined ? today : addDays(today, -1);
  let streak = 0;

  while (true) {
    const value = habit.logsByDate.get(currentDate);

    if (value === undefined) {
      return streak;
    }

    streak += 1;
    currentDate = addDays(currentDate, -1);
  }
}

function getMonday(date: string): string {
  const parsed = parseDate(date);
  const dayOfWeek = parsed.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  return formatDate(addDaysToDate(parsed, -daysSinceMonday));
}

function addDays(date: string, days: number): string {
  return formatDate(addDaysToDate(parseDate(date), days));
}

function addDaysToDate(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Could not determine today for timezone ${timezone}`);
  }

  return `${year}-${month}-${day}`;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
