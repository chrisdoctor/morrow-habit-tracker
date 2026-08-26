import type { ProgressResponse } from '../types/progress'

export async function loadProgressForDate(
  date: string,
): Promise<ProgressResponse> {
  const response = await fetch(`/api/progress?week=${date}`)

  if (!response.ok) {
    throw new Error(`GET /api/progress failed with ${response.status}`)
  }

  return (await response.json()) as ProgressResponse
}
