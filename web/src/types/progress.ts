export type ProgressDay = {
  date: string
  value: number | null
  completed: boolean
}

export type HabitProgress = {
  id: number
  name: string
  unit: string
  targetValue: number
  currentStreak: number
  completedDays: number
  days: ProgressDay[]
}

export type ProgressResponse = {
  week: {
    startsOn: string
    endsOn: string
  }
  today: string
  habits: HabitProgress[]
}
