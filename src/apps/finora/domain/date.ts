// The user's local calendar date as YYYY-MM-DD. Finora dates are local days,
// not UTC instants, so "today" must come from the device's clock and timezone.
export function getTodayLocalDate(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// The local calendar day of `now` as a UTC-midnight Date with the same year,
// month and day. Range math that works on calendar days (Date.UTC, getUTC*,
// toISOString) then gives the local answer without reading the UTC clock.
export function getLocalCalendarDate(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}
