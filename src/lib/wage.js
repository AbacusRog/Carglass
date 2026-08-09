// Core wage math, mirrors the logic from the original rate sheet:
//   monthly rate = annual wage / 12
//   day rate     = annual wage / working days per year
//   hourly rate  = annual wage / (working days per year * working hours per day)

export function dayRate(employee) {
  return employee.annual_wage / employee.working_days_per_year
}

export function hourlyRate(employee) {
  return (
    employee.annual_wage /
    (employee.working_days_per_year * employee.working_hours_per_day)
  )
}

export function monthlyRate(employee) {
  return employee.annual_wage / 12
}

// timesheet: { days_worked, extra_hours, missing_hours, holiday_days, full_month }
// adjustments: [{ kind: 'addition' | 'deduction', amount }]
export function grossWage(employee, timesheet, adjustments = []) {
  const dr = dayRate(employee)
  const hr = hourlyRate(employee)

  let base, extraPay, missingDeduction

  if (timesheet.full_month) {
    // Full month worked: pay the flat monthly salary rather than
    // building it up from days worked, but extra/missing hours can
    // still adjust it on top.
    base = monthlyRate(employee)
    extraPay = (timesheet.extra_hours || 0) * hr
    missingDeduction = (timesheet.missing_hours || 0) * hr
  } else {
    // Holiday days are paid leave, so they're paid at the day rate just like days worked.
    base = ((timesheet.days_worked || 0) + (timesheet.holiday_days || 0)) * dr
    extraPay = (timesheet.extra_hours || 0) * hr
    missingDeduction = (timesheet.missing_hours || 0) * hr
  }

  const additions = adjustments
    .filter((a) => a.kind === 'addition')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0)

  const deductions = adjustments
    .filter((a) => a.kind === 'deduction')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0)

  const gross = base + extraPay - missingDeduction + additions - deductions

  return {
    base,
    extraPay,
    missingDeduction,
    additions,
    deductions,
    gross,
  }
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value || 0)
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthLabel(year, month) {
  return `${MONTH_NAMES[month - 1]} ${year}`
}
