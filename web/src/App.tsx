import { useEffect, useState } from 'react'
import './App.css'

type ProgressDay = {
  date: string
  value: number | null
  completed: boolean
}

type HabitProgress = {
  id: number
  name: string
  unit: string
  targetValue: number
  currentStreak: number
  completedDays: number
  days: ProgressDay[]
}

type ProgressResponse = {
  week: {
    startsOn: string
    endsOn: string
  }
  today: string
  habits: HabitProgress[]
}

type LogInputs = Record<number, string>

function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function loadProgressForDate(date: string) {
  const response = await fetch(`/api/progress?week=${date}`)

  if (!response.ok) {
    throw new Error(`GET /api/progress failed with ${response.status}`)
  }

  return (await response.json()) as ProgressResponse
}

function abbreviateUnit(unit: string): string {
  const units: Record<string, string> = {
    hours: 'h',
    minutes: 'min',
    litres: 'L',
  }

  return units[unit] ?? unit
}

function App() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [logInputs, setLogInputs] = useState<LogInputs>({})
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [savingHabitId, setSavingHabitId] = useState<number | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const currentDate = new Date()
  const today = getLocalDateString(currentDate)

  useEffect(() => {
    let isMounted = true

    async function refreshProgress() {
      try {
        const data = await loadProgressForDate(today)

        if (isMounted) {
          setProgress(data)
          setStatus('ready')
        }
      } catch (error) {
        console.error(error)

        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void refreshProgress()

    return () => {
      isMounted = false
    }
  }, [today])

  async function handleSubmitLog(habit: HabitProgress) {
    const inputValue = logInputs[habit.id] ?? ''
    const value = Number(inputValue)

    if (inputValue.trim() === '' || !Number.isFinite(value)) {
      setWriteError(`Enter a valid ${habit.unit} value for ${habit.name}.`)
      return
    }

    try {
      setSavingHabitId(habit.id)
      setWriteError(null)

      const response = await fetch(`/api/habits/${habit.id}/logs/${today}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      })

      if (!response.ok) {
        throw new Error(`PUT habit log failed with ${response.status}`)
      }

      const updatedProgress = await loadProgressForDate(today)
      setProgress(updatedProgress)
      setLogInputs((current) => ({
        ...current,
        [habit.id]: '',
      }))
    } catch (error) {
      console.error(error)
      setWriteError(`Could not save ${habit.name}.`)
    } finally {
      setSavingHabitId(null)
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p>Morrow Habit Tracker</p>
        <div className="title-row">
          <h1>Today</h1>
          <span>{formatHeaderDate(currentDate)}</span>
        </div>
      </header>

      <section className="habit-panel" aria-labelledby="progress-heading">
        <div className="panel-header">
          <div>
            <h2 id="progress-heading">Weekly Progress</h2>
            {progress !== null && (
              <p>
                {progress.week.startsOn} to {progress.week.endsOn}
              </p>
            )}
          </div>
        </div>

        {status === 'loading' && <p className="status">Loading progress...</p>}

        {status === 'error' && (
          <p className="status error">Could not load progress.</p>
        )}

        {status === 'ready' && progress !== null && (
          <ul className="habit-list">
            {progress.habits.map((habit) => (
              <li key={habit.id} className="habit-item">
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
                    <span
                      key={day.date}
                      className={day.completed ? 'day done' : 'day'}
                      title={`${day.date}${day.value === null ? '' : `: ${day.value}`}`}
                    >
                      <span>
                        {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                          undefined,
                          { weekday: 'short' },
                        )}
                      </span>
                      <span className="day-date">
                        {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                          undefined,
                          {
                            month: '2-digit',
                            day: '2-digit',
                          },
                        )}
                      </span>
                      <span className="day-value">
                        {day.value === null
                          ? '-'
                          : `${day.value} ${abbreviateUnit(habit.unit)}`}
                      </span>
                    </span>
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
                    value={logInputs[habit.id] ?? ''}
                    onChange={(event) =>
                      setLogInputs((current) => ({
                        ...current,
                        [habit.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => void handleSubmitLog(habit)}
                    disabled={savingHabitId === habit.id}
                  >
                    {savingHabitId === habit.id ? 'Saving' : 'Save'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {writeError !== null && <p className="status error">{writeError}</p>}
      </section>
    </main>
  )
}

export default App
