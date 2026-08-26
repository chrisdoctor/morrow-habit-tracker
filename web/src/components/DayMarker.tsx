import type { ProgressDay } from '../types/progress'
import { formatDayDate, formatDayName } from '../utils/date'
import { abbreviateUnit } from '../utils/units'

type DayMarkerProps = {
  day: ProgressDay
  unit: string
}

function formatDayValue(day: ProgressDay, unit: string): string {
  if (day.value === null) {
    return '-'
  }

  return `${day.value} ${abbreviateUnit(unit)}`
}

export function DayMarker({ day, unit }: DayMarkerProps) {
  return (
    <span
      className={day.completed ? 'day done' : 'day'}
      title={`${day.date}${day.value === null ? '' : `: ${day.value}`}`}
    >
      <span>{formatDayName(day.date)}</span>
      <span className="day-date">{formatDayDate(day.date)}</span>
      <span className="day-value">{formatDayValue(day, unit)}</span>
    </span>
  )
}
