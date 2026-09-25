// Money helpers: visible rounding for inputs (docs/adr/004-goal-transfers.md)
// and integer-cents arithmetic (docs/adr/005-money-arithmetic-in-the-client.md).
// Text is handled as text, never with floating-point multiplication: in
// JavaScript 1.005 * 100 is 100.49999999999999, so Math.round would give 1.00.

const DECIMAL_PATTERN = /^(-?)(\d*)\.(\d+)$/
const CENTS_PER_UNIT = 100
const MONEY_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

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

/**
 * Converts an amount to integer cents without floating-point multiplication:
 * it reads the number's shortest decimal representation (the one JS prints,
 * e.g. `1666.67`), so `0.29` becomes exactly `29` rather than
 * `28.999999999999996`. Throws a `RangeError` for
 * anything that isn't a finite amount with at most 2 decimals - it never
 * rounds.
 */
export function toMinorUnits(amount: number): number {
  const match = MONEY_PATTERN.exec(String(amount))
  if (!match) {
    throw new RangeError(`Amount ${amount} is not a finite value with at most 2 decimals`)
  }

  const [, sign, units, decimals = ''] = match
  const cents = Number(units) * CENTS_PER_UNIT + Number(decimals.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Amount ${amount} is too large to represent exactly in cents`)
  }

  return sign ? -cents : cents
}

export function fromMinorUnits(cents: number): number {
  return cents / CENTS_PER_UNIT
}

/**
 * Converts a value JavaScript computed by adding or subtracting amounts with at
 * most 2 decimals (a total, a balance) to its exact cents. Float noise on such
 * a value is around 1e-11, so rounding to the nearest cent recovers the exact
 * result (`0.7 + 0.1` is `0.7999999999999999` and is 80 cents). It never throws.
 * Not for typed text or single values that still have to be validated: use
 * `toMinorUnits` for those.
 */
export function sumToMinorUnits(sum: number): number {
  return Math.round(sum * CENTS_PER_UNIT)
}

/**
 * Whether the payments add up to the amount, compared in integer cents. A value
 * with more than 2 decimals (or that is not finite) never matches, so half-typed
 * input is reported as a mismatch instead of throwing or being rounded.
 */
export function paymentsMatchAmount(payments: number[], amount: number): boolean {
  const values = [...payments, amount]
  if (values.some((value) => !MONEY_PATTERN.test(String(value)))) return false

  const assignedCents = payments.reduce((cents, payment) => cents + toMinorUnits(payment), 0)

  return assignedCents === toMinorUnits(amount)
}

/**
 * Exact sum of amounts: each one is converted to cents (strict, so a value with
 * more than 2 decimals throws `RangeError`), added as integers, and divided by
 * 100 once. `sumMoney([0.1, 0.2])` is exactly `0.3`, where `0.1 + 0.2` is not.
 */
export function sumMoney(amounts: readonly number[]): number {
  return fromMinorUnits(amounts.reduce((cents, amount) => cents + toMinorUnits(amount), 0))
}

/** Exact `a + b`; see `sumMoney`. */
export function addMoney(a: number, b: number): number {
  return sumMoney([a, b])
}

/** Exact `a - b`; see `sumMoney`. */
export function subtractMoney(a: number, b: number): number {
  return fromMinorUnits(toMinorUnits(a) - toMinorUnits(b))
}
