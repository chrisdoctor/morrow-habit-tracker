export async function saveHabitLog(input: {
  habitId: number
  date: string
  value: number
}): Promise<void> {
  const response = await fetch(`/api/habits/${input.habitId}/logs/${input.date}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: input.value }),
  })

  if (!response.ok) {
    throw new Error(`PUT habit log failed with ${response.status}`)
  }
}
