// Financed purchases (monthly installments without interest) - see
// docs/adr/003-installments-and-savings-funding.md. A purchase is stored as
// one row; its installments are derived from it with these pure functions.

import { fromMinorUnits, toMinorUnits } from './money'
import type { FundingSource, TransactionType } from './transaction'

export const MIN_INSTALLMENT_MONTHS = 2
export const MAX_INSTALLMENT_MONTHS = 48

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Splits a purchase into `months` installments that always add up to exactly
 * `amount`: the cents are divided evenly and the leftover cents go one each to
 * the first installments ($20,000 / 12 = 8 x $1,666.67 + 4 x $1,666.66).
 * A single installment returns `amount` untouched, so rows that aren't
 * financed never go through the cents conversion.
 */
export function allocateInstallments(amount: number, months: number): number[] {
  if (!Number.isInteger(months) || months < 1) {
    throw new RangeError(`Installment months must be a whole number of at least 1, got ${months}`)
  }
  if (amount < 0) {
    throw new RangeError(`Amount must not be negative, got ${amount}`)
  }
  if (months === 1) return [amount]

  const cents = toMinorUnits(amount)
  const base = Math.floor(cents / months)
  const remainder = cents - base * months

  return Array.from({ length: months }, (_, index) => fromMinorUnits(index < remainder ? base + 1 : base))
}

function getDaysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of `month` (1-based here).
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * The date of installment `index` (0-based) of a purchase dated `anchorDate`
 * (`YYYY-MM-DD`): `index` months later, on the same day of the month, clamped
 * to that month's last day. Always counted from the anchor, never chained, so
 * Jan 31 gives Feb 28 and then Mar 31 - the same result as Postgres'
 * `date + make_interval(months => index)`.
 */
export function getInstallmentDate(anchorDate: string, index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`Installment index must be a whole number of at least 0, got ${index}`)
  }

  const match = ISO_DATE_PATTERN.exec(anchorDate)
  const year = match ? Number(match[1]) : NaN
  const month = match ? Number(match[2]) : NaN
  const day = match ? Number(match[3]) : NaN
  if (!match || month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) {
    throw new RangeError(`Invalid date ${anchorDate}, expected an existing YYYY-MM-DD date`)
  }

  const monthIndex = month - 1 + index
  const targetYear = year + Math.floor(monthIndex / 12)
  const targetMonth = (monthIndex % 12) + 1
  const targetDay = Math.min(day, getDaysInMonth(targetYear, targetMonth))

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

export interface ScheduledRow {
  /** Purchase date, which is also the date of the first installment. */
  date: string
  /** The purchase total. */
  amount: number
  installment_months: number
}

/**
 * Turns each row into the installments that fall within `range` (inclusive,
 * `YYYY-MM-DD`), each a copy of the row with that installment's `date` and
 * `amount`. A row that isn't financed yields itself when its date is in range,
 * so callers can expand every row without special-casing.
 */
export function expandLedgerRowsInRange<T extends ScheduledRow>(rows: T[], range: { start: string; end: string }): T[] {
  return rows.flatMap((row) =>
    allocateInstallments(row.amount, row.installment_months).flatMap((amount, index) => {
      const date = getInstallmentDate(row.date, index)
      return date >= range.start && date <= range.end ? [{ ...row, date, amount }] : []
    })
  )
}

/**
 * Whether an entry counts as spend against the month's income - the only
 * entries summed into `spent`, `totalSpent` and the trend charts. Expenses
 * covered by savings are reported separately instead.
 */
export function isIncomeFundedExpense(entry: { type: TransactionType; funding_source: FundingSource }): boolean {
  return entry.type === 'expense' && entry.funding_source === 'income'
}

export type PaymentPlanError =
  | 'notAnExpense'
  | 'invalidMonths'
  | 'multiplePaymentMethods'
  | 'tooManyDecimals'
  | 'missingSavingsGoal'

export interface PaymentPlan {
  type: TransactionType
  amount: number
  /** 1 when the purchase is paid at once. */
  installmentMonths: number
  fundingSource: FundingSource
  /** The Goal a savings-funded expense withdraws from (ADR-004); null otherwise. */
  savingsGoalId: string | null
  /** How many payment methods the purchase is split across. */
  paymentMethodCount: number
}

/**
 * Checks the financing and funding choices of a transaction against ADR-003
 * and ADR-004, returning every rule it breaks (empty when valid). Only
 * expenses can be financed or covered by savings; savings always come from a
 * specific Goal; a financed purchase needs a whole number of months in range,
 * a single payment method, and an amount it can split exactly. Required-field
 * checks (amount > 0, at least one method) and the Goal's balance stay with the
 * form and the database, which already report them.
 */
export function getPaymentPlanErrors(plan: PaymentPlan): PaymentPlanError[] {
  const isFinanced = plan.installmentMonths !== 1

  if (plan.type !== 'expense') {
    return isFinanced || plan.fundingSource !== 'income' || plan.savingsGoalId ? ['notAnExpense'] : []
  }

  const errors: PaymentPlanError[] = []

  if (plan.fundingSource === 'savings' && !plan.savingsGoalId) {
    errors.push('missingSavingsGoal')
  }
  if (!isFinanced) return errors

  if (
    !Number.isInteger(plan.installmentMonths) ||
    plan.installmentMonths < MIN_INSTALLMENT_MONTHS ||
    plan.installmentMonths > MAX_INSTALLMENT_MONTHS
  ) {
    errors.push('invalidMonths')
  }
  if (plan.paymentMethodCount > 1) {
    errors.push('multiplePaymentMethods')
  }
  if (Number.isFinite(plan.amount) && plan.amount > 0 && !isRepresentableInCents(plan.amount)) {
    errors.push('tooManyDecimals')
  }

  return errors
}

function isRepresentableInCents(amount: number): boolean {
  try {
    toMinorUnits(amount)
    return true
  } catch {
    return false
  }
}
