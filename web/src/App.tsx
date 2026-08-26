import { useEffect, useState } from 'react'
import './App.css'

type Habit = {
  id: number
  name: string
}

type HabitsResponse = {
  habits: Habit[]
}

function App() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadHabits() {
      try {
        const response = await fetch('/api/habits')

        if (!response.ok) {
          throw new Error(`GET /api/habits failed with ${response.status}`)
        }

        const data = (await response.json()) as HabitsResponse

        if (isMounted) {
          setHabits(data.habits)
          setStatus('ready')
        }
      } catch (error) {
        console.error(error)

        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadHabits()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="app-shell">
      <header className="page-header">
        <p>Morrow Habit Tracker</p>
        <h1>Habits</h1>
      </header>

      <section className="habit-panel" aria-labelledby="habits-heading">
        <h2 id="habits-heading">Current Habits</h2>

        {status === 'loading' && <p className="status">Loading habits...</p>}

        {status === 'error' && (
          <p className="status error">Could not load habits.</p>
        )}

        {status === 'ready' && (
          <ul className="habit-list">
            {habits.map((habit) => (
              <li key={habit.id}>{habit.name}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
