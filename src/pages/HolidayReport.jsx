import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function HolidayReport() {
  const [employees, setEmployees] = useState([])
  const [availableYears, setAvailableYears] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [balances, setBalances] = useState({}) // employee_id -> { id, days_taken }
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
      setEmployees(emps || [])
      const years = [...new Set((periods || []).map((p) => p.year))]
      if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear())
      years.sort((a, b) => b - a)
      setAvailableYears(years)
    }
    loadStatic()
  }, [])

  const loadBalances = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: emps, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .eq('active', true)
      .order('name')
    if (empErr) {
      setError(empErr.message)
      setLoading(false)
      return
    }
    setEmployees(emps || [])

    const { data: rows, error: balErr } = await supabase
      .from('holiday_balances')
      .select('*')
      .eq('year', year)
    if (balErr) {
      setError(balErr.message)
      setLoading(false)
      return
    }

    const byEmployee = {}
    ;(rows || []).forEach((r) => {
      byEmployee[r.employee_id] = r
    })

    // Make sure every active employee has a balance row for this year.
    const missing = (emps || []).filter((e) => !byEmployee[e.id])
    if (missing.length) {
      const inserts = missing.map((e) => ({ employee_id: e.id, year, days_taken: 0 }))
      const { data: created, error: insErr } = await supabase
        .from('holiday_balances')
        .insert(inserts)
        .select('*')
      if (insErr) setError(insErr.message)
      ;(created || []).forEach((r) => {
        byEmployee[r.employee_id] = r
      })
    }

    setBalances(byEmployee)
    setLoading(false)
  }, [year])

  useEffect(() => {
    loadBalances()
  }, [loadBalances])

  async function updateTaken(emp, value) {
    const days = value === '' ? 0 : Number(value)
    const existing = balances[emp.id]
    setBalances((prev) => ({ ...prev, [emp.id]: { ...prev[emp.id], days_taken: days } }))
    if (existing?.id) {
      await supabase
        .from('holiday_balances')
        .update({ days_taken: days, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
  }

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
        <div className="table-scroll">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th className="num">Entitlement (days)</th>
              <th className="num">Taken in {year}</th>
              <th className="num">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const taken = balances[emp.id]?.days_taken ?? 0
              const remaining = (emp.holiday_entitlement_days || 0) - taken
              return (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td className="num">{emp.holiday_entitlement_days}</td>
                  <td className="num">
                    <input
                      className="cell-input"
                      type="number"
                      step="0.5"
                      defaultValue={taken}
                      onBlur={(e) => updateTaken(emp, e.target.value)}
                    />
                  </td>
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
        </div>
      )}

      <p className="helper-text" style={{ marginTop: 16 }}>
        Entitlement is the annual figure set on each employee's record. Taken is editable
        directly here — enter the number of days taken in {year} and Remaining updates
        automatically. For employees who started partway through the year, adjust their
        entitlement figure on the Employees page to reflect a pro-rated allowance.
      </p>
    </div>
  )
}
