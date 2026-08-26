import type { HabitProgress } from '../types/progress'
import { DayMarker } from './DayMarker'

type HabitCardProps = {
  habit: HabitProgress
  inputValue: string
  isSaving: boolean
  onInputChange: (habitId: number, value: string) => void
  onSubmitLog: (habit: HabitProgress) => void
}

export function HabitCard({
  habit,
  inputValue,
  isSaving,
  onInputChange,
  onSubmitLog,
}: HabitCardProps) {
  return (
    <li className="habit-item">
      <div className="habit-main">
        <div>
          <h3>{habit.name}</h3>
          <p>
            Target {habit.targetValue} {habit.unit}
          </p>
        </div>
        <div className="habit-stats">
          <span>{habit.currentStreak} day streak</span>
          <span>{habit.completedDays}/7 complete</span>
        </div>
      </div>

      <div className="day-markers" aria-label={`${habit.name} week`}>
        {habit.days.map((day) => (
          <DayMarker key={day.date} day={day} unit={habit.unit} />
        ))}
      </div>

      <div className="log-row">
        <label htmlFor={`habit-${habit.id}-value`}>
          Log today's {habit.unit}
        </label>
        <input
          id={`habit-${habit.id}-value`}
          inputMode="decimal"
          type="number"
          min="0"
          step="0.01"
          value={inputValue}
          onChange={(event) => onInputChange(habit.id, event.target.value)}
        />
        <button
          type="button"
          onClick={() => onSubmitLog(habit)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
    </li>
  )
}
