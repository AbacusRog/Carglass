import { Fragment, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { grossWage, formatCurrency, monthLabel, MONTH_NAMES, isCurrentlyActive } from '../lib/wage'
import AdjustmentsEditor from '../components/AdjustmentsEditor'

const today = new Date()

export default function Timesheet() {
  const [periods, setPeriods] = useState([])
  const [selectedPeriodId, setSelectedPeriodId] = useState(null)
  const [employees, setEmployees] = useState([])
  const [timesheets, setTimesheets] = useState([]) // rows for selected period, keyed by employee_id
  const [adjustmentsByTimesheet, setAdjustmentsByTimesheet] = useState({})
  const [expandedRow, setExpandedRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNewMonth, setShowNewMonth] = useState(false)
  const [newYear, setNewYear] = useState(today.getFullYear())
  const [newMonth, setNewMonth] = useState(today.getMonth() + 1)

  const loadPeriods = useCallback(async () => {
    const { data, error } = await supabase
      .from('pay_periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    if (error) {
      setError(error.message)
      return
    }
    setPeriods(data)
    setSelectedPeriodId((current) => current ?? (data.length ? data[0].id : null))
  }, [])

  useEffect(() => {
    loadPeriods()
  }, [loadPeriods])

  const loadPeriodData = useCallback(async () => {
    if (!selectedPeriodId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [{ data: emps, error: empErr }, { data: ts, error: tsErr }] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('timesheets').select('*').eq('pay_period_id', selectedPeriodId),
    ])

    if (empErr) setError(empErr.message)
    if (tsErr) setError(tsErr.message)

    setEmployees(emps || [])

    // Ensure every active employee (or one already with a row) has a timesheet row.
    const existingByEmployee = {}
    ;(ts || []).forEach((row) => {
      existingByEmployee[row.employee_id] = row
    })

    const missing = (emps || []).filter((e) => isCurrentlyActive(e) && !existingByEmployee[e.id])
    if (missing.length) {
      const inserts = missing.map((e) => ({
        employee_id: e.id,
        pay_period_id: selectedPeriodId,
        days_worked: 0,
        extra_hours: 0,
        missing_hours: 0,
        holiday_days: 0,
        full_month: false,
      }))
      const { data: created, error: insErr } = await supabase
        .from('timesheets')
        .insert(inserts)
        .select('*')
      if (insErr) setError(insErr.message)
      ;(created || []).forEach((row) => {
        existingByEmployee[row.employee_id] = row
      })
    }

    const finalRows = Object.values(existingByEmployee)
    setTimesheets(finalRows)

    if (finalRows.length) {
      const { data: adj, error: adjErr } = await supabase
        .from('adjustments')
        .select('*')
        .in('timesheet_id', finalRows.map((r) => r.id))
      if (adjErr) setError(adjErr.message)
      const grouped = {}
      ;(adj || []).forEach((a) => {
        grouped[a.timesheet_id] = grouped[a.timesheet_id] || []
        grouped[a.timesheet_id].push(a)
      })
      setAdjustmentsByTimesheet(grouped)
    } else {
      setAdjustmentsByTimesheet({})
    }

    setLoading(false)
  }, [selectedPeriodId])

  useEffect(() => {
    loadPeriodData()
  }, [loadPeriodData])

  async function createPeriod(year, month) {
    setError(null)
    const { data, error } = await supabase
      .from('pay_periods')
      .insert({ year, month })
      .select('*')
      .single()
    if (error) {
      setError(error.message.includes('duplicate') ? 'That month already exists.' : error.message)
      return
    }
    setShowNewMonth(false)
    await loadPeriods()
    setSelectedPeriodId(data.id)
  }

  async function createMonth(e) {
    e.preventDefault()
    await createPeriod(Number(newYear), Number(newMonth))
  }

  async function updateField(row, field, value) {
    const numeric = value === '' ? 0 : Number(value)
    setTimesheets((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, [field]: numeric } : r))
    )
    await supabase
      .from('timesheets')
      .update({ [field]: numeric, updated_at: new Date().toISOString() })
      .eq('id', row.id)
  }

  async function toggleFullMonth(row, checked) {
    setTimesheets((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, full_month: checked } : r))
    )
    await supabase
      .from('timesheets')
      .update({ full_month: checked, updated_at: new Date().toISOString() })
      .eq('id', row.id)
  }

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId)
  const activeEmployees = employees.filter((e) => isCurrentlyActive(e))

  const rowsWithTotals = timesheets
    .map((row) => {
      const emp = employees.find((e) => e.id === row.employee_id)
      if (!emp) return null
      const adj = adjustmentsByTimesheet[row.id] || []
      const totals = grossWage(emp, row, adj)
      return { row, emp, adj, totals }
    })
    .filter(Boolean)
    .filter(({ emp }) => isCurrentlyActive(emp))
    .sort((a, b) => a.emp.name.localeCompare(b.emp.name))

  const periodGrossTotal = rowsWithTotals.reduce((sum, r) => sum + r.totals.gross, 0)

  return (
    <div className="paper">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Wage calculator</div>
          <h1 className="page-title">Monthly Timesheet</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-brass" onClick={() => setShowNewMonth((s) => !s)}>
            + New month
          </button>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      {showNewMonth && (
        <form onSubmit={createMonth} className="field-row" style={{ background: 'var(--paper-shade)', padding: 16, borderRadius: 4, border: '1px solid var(--paper-line)' }}>
          <div className="field">
            <label>Month</label>
            <select value={newMonth} onChange={(e) => setNewMonth(e.target.value)}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Year</label>
            <input type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn btn-brass" type="submit">Create month</button>
          </div>
        </form>
      )}

      {periods.length > 0 && (
        <div className="month-tabs" style={{ marginTop: showNewMonth ? 20 : 0 }}>
          {periods.map((p) => (
            <button
              key={p.id}
              className={`month-tab ${p.id === selectedPeriodId ? 'active' : ''}`}
              onClick={() => setSelectedPeriodId(p.id)}
            >
              {monthLabel(p.year, p.month)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="helper-text">Loading…</p>
      ) : periods.length === 0 ? (
        <div className="empty-state">
          <h3>No months yet</h3>
          <p>Create your first pay period to start logging days and hours.</p>
        </div>
      ) : activeEmployees.length === 0 ? (
        <div className="empty-state">
          <h3>No active employees</h3>
          <p>Add employees on the Employees page first.</p>
        </div>
      ) : (
        <>
          <div className="summary-strip">
            <div className="summary-card">
              <div className="label">{selectedPeriod && monthLabel(selectedPeriod.year, selectedPeriod.month)}</div>
              <div className="value">{formatCurrency(periodGrossTotal)}</div>
            </div>
            <div className="summary-card">
              <div className="label">Employees paid</div>
              <div className="value">{rowsWithTotals.length}</div>
            </div>
          </div>

          <table className="ledger-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th className="num">Full month</th>
                <th className="num">Days worked</th>
                <th className="num">Holiday days</th>
                <th className="num">Extra hrs</th>
                <th className="num">Missing hrs</th>
                <th className="num">Adjustments</th>
                <th className="num">Gross wage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rowsWithTotals.map(({ row, emp, adj, totals }) => (
                <Fragment key={row.id}>
                  <tr>
                    <td>{emp.name}</td>
                    <td className="num">
                      <input
                        type="checkbox"
                        checked={!!row.full_month}
                        onChange={(e) => toggleFullMonth(row, e.target.checked)}
                        title="Pay this employee their full monthly salary for this month"
                      />
                    </td>
                    <td className="num">
                      <input
                        className="cell-input"
                        type="number"
                        step="0.5"
                        defaultValue={row.days_worked}
                        disabled={row.full_month}
                        onBlur={(e) => updateField(row, 'days_worked', e.target.value)}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="cell-input"
                        type="number"
                        step="0.5"
                        defaultValue={row.holiday_days}
                        onBlur={(e) => updateField(row, 'holiday_days', e.target.value)}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="cell-input"
                        type="number"
                        step="0.5"
                        defaultValue={row.extra_hours}
                        onBlur={(e) => updateField(row, 'extra_hours', e.target.value)}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="cell-input"
                        type="number"
                        step="0.5"
                        defaultValue={row.missing_hours}
                        onBlur={(e) => updateField(row, 'missing_hours', e.target.value)}
                      />
                    </td>
                    <td className="num">
                      {adj.length > 0 ? (
                        <span>
                          {totals.additions > 0 && <span className="pill pill-green">+{formatCurrency(totals.additions)}</span>}
                          {' '}
                          {totals.deductions > 0 && <span className="pill pill-red">−{formatCurrency(totals.deductions)}</span>}
                        </span>
                      ) : (
                        <span className="helper-text">—</span>
                      )}
                    </td>
                    <td className="num gross-figure">{formatCurrency(totals.gross)}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                      >
                        {expandedRow === row.id ? 'Close' : 'Adjust'}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === row.id && (
                    <tr>
                      <td colSpan={9} style={{ background: 'var(--paper-shade)' }}>
                        <AdjustmentsEditor
                          timesheetId={row.id}
                          adjustments={adj}
                          onChange={loadPeriodData}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
