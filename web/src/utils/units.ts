export function abbreviateUnit(unit: string): string {
  const units: Record<string, string> = {
    hours: 'h',
    minutes: 'min',
    litres: 'L',
  }

  return units[unit] ?? unit
}
