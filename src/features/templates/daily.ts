/** `YYYY-MM-DD` for the local calendar day of `d` (not UTC: just after midnight the two differ). */
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Where today's note lives. */
export const dailyPath = (d = new Date()) => `Daily/${localDate(d)}.md`
