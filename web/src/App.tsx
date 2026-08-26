import { useEffect, useState } from 'react'
import { saveHabitLog } from './api/habitLogs'
import { loadProgressForDate } from './api/progress'
import './App.css'
import { HabitCard } from './components/HabitCard'
import type { HabitProgress, ProgressResponse } from './types/progress'
import { formatHeaderDate, getLocalDateString } from './utils/date'

type LogInputs = Record<number, string>

type LoadStatus = 'loading' | 'ready' | 'error'

function App() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const [logInputs, setLogInputs] = useState<LogInputs>({})
  const [status, setStatus] = useState<LoadStatus>('loading')
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
      await saveHabitLog({
        habitId: habit.id,
        date: today,
        value,
      })

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

  function handleInputChange(habitId: number, value: string) {
    setLogInputs((current) => ({
      ...current,
      [habitId]: value,
    }))
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
              <HabitCard
                key={habit.id}
                habit={habit}
                inputValue={logInputs[habit.id] ?? ''}
                isSaving={savingHabitId === habit.id}
                onInputChange={handleInputChange}
                onSubmitLog={(selectedHabit) =>
                  void handleSubmitLog(selectedHabit)
                }
              />
            ))}
          </ul>
        )}

        {writeError !== null && <p className="status error">{writeError}</p>}
      </section>
    </main>
  )
}

export default App
