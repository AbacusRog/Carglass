// Core wage math, mirrors the logic from the original rate sheet:
//   monthly rate = annual wage / 12
//   day rate     = annual wage / working days per year
//   hourly rate  = annual wage / (working days per year * working hours per day)

export function dayRate(rateSource) {
  return rateSource.annual_wage / rateSource.working_days_per_year
}

export function hourlyRate(rateSource) {
  return (
    rateSource.annual_wage /
    (rateSource.working_days_per_year * rateSource.working_hours_per_day)
  )
}

export function monthlyRate(rateSource) {
  return rateSource.annual_wage / 12
}

// Each timesheet row snapshots the employee's wage/hours as they stood when
// that month's row was first created, so editing an employee's pay later
// only affects months created from then on — months already generated keep
// the rate they were paid at. Older rows created before this snapshot
// existed fall back to the employee's current record.
export function rateSourceFor(employee, timesheet) {
  return {
    annual_wage: timesheet.annual_wage ?? employee.annual_wage,
    working_days_per_year: timesheet.working_days_per_year ?? employee.working_days_per_year,
    working_hours_per_day: timesheet.working_hours_per_day ?? employee.working_hours_per_day,
  }
}

// timesheet: { days_worked, extra_hours, missing_hours, holiday_days, full_month,
//              annual_wage, working_days_per_year, working_hours_per_day }
// adjustments: [{ kind: 'addition' | 'deduction', amount }]
export function grossWage(employee, timesheet, adjustments = []) {
  const rateSource = rateSourceFor(employee, timesheet)
  const dr = dayRate(rateSource)
  const hr = hourlyRate(rateSource)

  let base, extraPay, missingDeduction

  if (timesheet.full_month) {
    // Full month worked: pay the flat monthly salary rather than
    // building it up from days worked, but extra/missing hours can
    // still adjust it on top.
    base = monthlyRate(rateSource)
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
