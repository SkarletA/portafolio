// Visible rounding for money inputs - see docs/adr/004-goal-transfers.md.
// Works on the decimal text, never with floating-point multiplication: in
// JavaScript 1.005 * 100 is 100.49999999999999, so Math.round would give 1.00.

const DECIMAL_PATTERN = /^(-?)(\d*)\.(\d+)$/

/**
 * Rounds a money input's text to 2 decimals, half away from zero
 * ("10.005" -> "10.01", "9.999" -> "10.00"), for forms to apply when the input
 * loses focus so the user sees the amount that will be saved. Text with 2
 * decimals or fewer, or that isn't a plain decimal number, is returned as-is
 * for the form's own validation to handle.
 */
export function roundMoneyInput(text: string): string {
  const match = DECIMAL_PATTERN.exec(text.trim())
  if (!match) return text

  const [, sign, units, decimals] = match
  if (decimals.length <= 2) return text

  let cents = BigInt(units || '0') * 100n + BigInt(decimals.slice(0, 2))
  if (decimals[2] >= '5') cents += 1n

  const whole = cents / 100n
  const fraction = String(cents % 100n).padStart(2, '0')
  const isZero = cents === 0n

  return `${sign && !isZero ? '-' : ''}${whole}.${fraction}`
}
