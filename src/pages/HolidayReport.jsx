import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { isCurrentlyActive } from '../lib/wage'

export default function HolidayReport() {
  const [employees, setEmployees] = useState([])
  const [availableYears, setAvailableYears] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [takenByEmployee, setTakenByEmployee] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadStatic() {
      const [{ data: emps, error: empErr }, { data: periods, error: perErr }] = await Promise.all([
        supabase.from('employees').select('*').eq('active', true).order('name'),
        supabase.from('pay_periods').select('year').order('year', { ascending: false }),
      ])
      if (empErr) setError(empErr.message)
      if (perErr) setError(perErr.message)
      setEmployees((emps || []).filter(isCurrentlyActive))
      const years = [...new Set((periods || []).map((p) => p.year))]
      if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear())
      years.sort((a, b) => b - a)
      setAvailableYears(years)
    }
    loadStatic()
  }, [])

  const loadTaken = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: periods, error: perErr } = await supabase
      .from('pay_periods')
      .select('id')
      .eq('year', year)

    if (perErr) {
      setError(perErr.message)
      setLoading(false)
      return
    }

    if (!periods || periods.length === 0) {
      setTakenByEmployee({})
      setLoading(false)
      return
    }

    const { data: rows, error: tsErr } = await supabase
      .from('timesheets')
      .select('employee_id, holiday_days')
      .in('pay_period_id', periods.map((p) => p.id))

    if (tsErr) {
      setError(tsErr.message)
      setLoading(false)
      return
    }

    const totals = {}
    ;(rows || []).forEach((r) => {
      totals[r.employee_id] = (totals[r.employee_id] || 0) + Number(r.holiday_days || 0)
    })
    setTakenByEmployee(totals)
    setLoading(false)
  }, [year])

  useEffect(() => {
    loadTaken()
  }, [loadTaken])

  return (
    <div className="paper">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Annual leave</div>
          <h1 className="page-title">Holiday Entitlement Report</h1>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      {loading ? (
        <p className="helper-text">Loading…</p>
      ) : employees.length === 0 ? (
        <div className="empty-state">
          <h3>No active employees</h3>
          <p>Add employees on the Employees page first.</p>
        </div>
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Start date</th>
              <th>Leave date</th>
              <th className="num">Entitlement (days)</th>
              <th className="num">Taken in {year}</th>
              <th className="num">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const taken = takenByEmployee[emp.id] || 0
              const remaining = (emp.holiday_entitlement_days || 0) - taken
              return (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{emp.start_date || <span className="helper-text">—</span>}</td>
                  <td>{emp.leave_date || <span className="helper-text">—</span>}</td>
                  <td className="num">{emp.holiday_entitlement_days}</td>
                  <td className="num">{taken}</td>
                  <td className="num">
                    <span className={`pill ${remaining < 0 ? 'pill-red' : 'pill-green'}`}>
                      {remaining}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <p className="helper-text" style={{ marginTop: 16 }}>
        Entitlement is the annual figure set on each employee's record. Taken is the sum of
        holiday days logged on the Monthly Timesheet across all pay periods in {year}. For
        employees who started partway through the year, adjust their entitlement figure
        manually to reflect a pro-rated allowance.
      </p>
    </div>
  )
}
