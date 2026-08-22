// Simplified UK PAYE estimate for the 2026/27 tax year (6 Apr 2026 – 5 Apr 2027),
// England/Wales/Northern Ireland rates. Uses the standard "Month 1" (non-cumulative)
// approach: each month is assessed on its own using 1/12 of the annual thresholds,
// which is how a first month's PAYE is typically estimated before a cumulative tax
// code kicks in.
//
// This is an ESTIMATE only. It does NOT account for: cumulative tax codes built up
// over the tax year, multiple jobs, Scottish income tax rates/bands, student loan
// repayments, pension salary sacrifice, or an employee's actual tax code (e.g.
// BR, K-codes, marriage allowance). Always confirm exact figures with real payroll
// software (or an accountant) before relying on them for actual payments or filings.

const ANNUAL_PERSONAL_ALLOWANCE = 12570
const ANNUAL_BASIC_RATE_TOP = 50270
const ANNUAL_HIGHER_RATE_TOP = 125140
const PERSONAL_ALLOWANCE_TAPER_START = 100000

const ANNUAL_NI_PRIMARY_THRESHOLD = 12570
const ANNUAL_NI_UPPER_EARNINGS_LIMIT = 50270
const EMPLOYEE_NI_MAIN_RATE = 0.08
const EMPLOYEE_NI_UPPER_RATE = 0.02

const ANNUAL_EMPLOYER_NI_SECONDARY_THRESHOLD = 5000
const EMPLOYER_NI_RATE = 0.15

function monthlyOf(annual) {
  return annual / 12
}

function taperedMonthlyPersonalAllowance(monthlyGross) {
  const monthlyTaperStart = monthlyOf(PERSONAL_ALLOWANCE_TAPER_START)
  const monthlyPA = monthlyOf(ANNUAL_PERSONAL_ALLOWANCE)
  if (monthlyGross <= monthlyTaperStart) return monthlyPA
  const reduction = (monthlyGross - monthlyTaperStart) / 2
  return Math.max(0, monthlyPA - reduction)
}

export function estimateIncomeTax(monthlyGross) {
  if (monthlyGross <= 0) return 0

  const pa = taperedMonthlyPersonalAllowance(monthlyGross)
  const basicTop = monthlyOf(ANNUAL_BASIC_RATE_TOP)
  const higherTop = monthlyOf(ANNUAL_HIGHER_RATE_TOP)

  if (monthlyGross <= pa) return 0

  let taxable = monthlyGross - pa
  let tax = 0

  const basicBand = Math.max(0, basicTop - pa)
  const basicTaxable = Math.min(taxable, basicBand)
  tax += basicTaxable * 0.2
  taxable -= basicTaxable

  if (taxable > 0) {
    const higherBand = Math.max(0, higherTop - basicTop)
    const higherTaxable = Math.min(taxable, higherBand)
    tax += higherTaxable * 0.4
    taxable -= higherTaxable
  }

  if (taxable > 0) {
    tax += taxable * 0.45
  }

  return tax
}

export function estimateEmployeeNI(monthlyGross) {
  if (monthlyGross <= 0) return 0

  const pt = monthlyOf(ANNUAL_NI_PRIMARY_THRESHOLD)
  const uel = monthlyOf(ANNUAL_NI_UPPER_EARNINGS_LIMIT)

  if (monthlyGross <= pt) return 0

  let ni = 0
  const mainBandTaxable = Math.max(0, Math.min(monthlyGross, uel) - pt)
  ni += mainBandTaxable * EMPLOYEE_NI_MAIN_RATE

  if (monthlyGross > uel) {
    ni += (monthlyGross - uel) * EMPLOYEE_NI_UPPER_RATE
  }

  return ni
}

export function estimateEmployerNI(monthlyGross) {
  if (monthlyGross <= 0) return 0
  const st = monthlyOf(ANNUAL_EMPLOYER_NI_SECONDARY_THRESHOLD)
  if (monthlyGross <= st) return 0
  return (monthlyGross - st) * EMPLOYER_NI_RATE
}

// monthlyGross here should be gross wage before any ad-hoc deductions
// (Glass Damage etc.) — tax and NI are calculated on earnings, not on
// what's left after post-tax deductions are taken off.
export function estimatePayBreakdown(monthlyGross) {
  const incomeTax = estimateIncomeTax(monthlyGross)
  const employeeNI = estimateEmployeeNI(monthlyGross)
  const employerNI = estimateEmployerNI(monthlyGross)
  return { incomeTax, employeeNI, employerNI }
}
