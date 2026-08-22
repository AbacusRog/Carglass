import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { dayRate, hourlyRate, monthlyRate, formatCurrency } from '../lib/wage'

const BLANK_FORM = {
  name: '',
  annual_wage: '',
  working_days_per_year: 253,
  working_hours_per_day: 8.5,
  start_date: '',
  leave_date: '',
  date_of_birth: '',
  email: '',
  address: '',
  ni_number: '',
  holiday_entitlement_days: 28,
}

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(BLANK_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError] = useState(null)

  async function loadEmployees() {
    setLoading(true)
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setEmployees(data)
    setLoading(false)
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  function resetForm() {
    setForm(BLANK_FORM)
    setEditingId(null)
  }

  function startEdit(emp) {
    setForm({
      name: emp.name,
      annual_wage: emp.annual_wage,
      working_days_per_year: emp.working_days_per_year,
      working_hours_per_day: emp.working_hours_per_day,
      start_date: emp.start_date || '',
      leave_date: emp.leave_date || '',
      date_of_birth: emp.date_of_birth || '',
      email: emp.email || '',
      address: emp.address || '',
      ni_number: emp.ni_number || '',
      holiday_entitlement_days: emp.holiday_entitlement_days,
    })
    setEditingId(emp.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const payload = {
      name: form.name.trim(),
      annual_wage: Number(form.annual_wage),
      working_days_per_year: Number(form.working_days_per_year),
      working_hours_per_day: Number(form.working_hours_per_day),
      start_date: form.start_date || null,
      leave_date: form.leave_date || null,
      date_of_birth: form.date_of_birth || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      ni_number: form.ni_number.trim() || null,
      holiday_entitlement_days: Number(form.holiday_entitlement_days),
      updated_at: new Date().toISOString(),
    }

    if (!payload.name || !payload.annual_wage) {
      setError('Name and annual wage are required.')
      return
    }

    let result
    if (editingId) {
      result = await supabase.from('employees').update(payload).eq('id', editingId)
    } else {
      result = await supabase.from('employees').insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      return
    }

    resetForm()
    loadEmployees()
  }

  async function toggleActive(emp) {
    await supabase
      .from('employees')
      .update({ active: !emp.active, updated_at: new Date().toISOString() })
      .eq('id', emp.id)
    loadEmployees()
  }

  async function removeEmployee(emp) {
    if (!confirm(`Permanently delete ${emp.name}? This also removes their timesheet history.`)) return
    const { error } = await supabase.from('employees').delete().eq('id', emp.id)
    if (error) setError(error.message)
    loadEmployees()
  }

  const visible = employees.filter((e) => showInactive || e.active)

  return (
    <div className="paper">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Staff records</div>
          <h1 className="page-title">Employees</h1>
        </div>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show removed
        </label>
      </div>

      {error && <div className="login-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group-label">Pay & hours</div>
        <div className="field-row">
          <div className="field">
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Fred"
              required
            />
          </div>
          <div className="field">
            <label>Annual wage (£)</label>
            <input
              type="number"
              step="0.01"
              value={form.annual_wage}
              onChange={(e) => setForm({ ...form, annual_wage: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Working days / year</label>
            <input
              type="number"
              step="0.5"
              value={form.working_days_per_year}
              onChange={(e) => setForm({ ...form, working_days_per_year: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Working hours / day</label>
            <input
              type="number"
              step="0.5"
              value={form.working_hours_per_day}
              onChange={(e) => setForm({ ...form, working_hours_per_day: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Holiday entitlement (days/yr)</label>
            <input
              type="number"
              step="0.5"
              value={form.holiday_entitlement_days}
              onChange={(e) => setForm({ ...form, holiday_entitlement_days: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group-label">Employment dates</div>
        <div className="field-row">
          <div className="field">
            <label>Start date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Leave date</label>
            <input
              type="date"
              value={form.leave_date}
              onChange={(e) => setForm({ ...form, leave_date: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Date of birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group-label">Contact & payroll details</div>
        <div className="field-row">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
            />
          </div>
          <div className="field" style={{ flex: '1 1 260px' }}>
            <label>Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Home address"
              style={{ minWidth: 260 }}
            />
          </div>
          <div className="field">
            <label>National Insurance number</label>
            <input
              value={form.ni_number}
              onChange={(e) => setForm({ ...form, ni_number: e.target.value.toUpperCase() })}
              placeholder="e.g. QQ 12 34 56 C"
            />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-brass" type="submit">
                {editingId ? 'Save changes' : 'Add employee'}
              </button>
              {editingId && (
                <button className="btn btn-outline" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      <p className="helper-text" style={{ marginTop: -10, marginBottom: 20 }}>
        Setting a leave date stops that employee being added to any newly created month
        after the month they left — their existing timesheet history is untouched. Click any
        row below to view or edit that employee's full record, including address, NI number,
        and other details not shown in the table.
      </p>

      <div className="section-title">Roster</div>

      {loading ? (
        <p className="helper-text">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <h3>No employees yet</h3>
          <p>Add your first employee above to start building timesheets.</p>
        </div>
      ) : (
        <div className="table-scroll">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Name</th>
              <th className="num">Annual wage</th>
              <th className="num compact-col">Monthly</th>
              <th className="num compact-col">Day rate</th>
              <th className="num compact-col">Hourly rate</th>
              <th className="num compact-col">Days/yr</th>
              <th className="num compact-col">Hrs/day</th>
              <th className="num">Holiday/yr</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((emp) => (
              <tr
                key={emp.id}
                className="row-clickable"
                style={{ opacity: emp.active ? 1 : 0.5 }}
                onClick={() => startEdit(emp)}
              >
                <td>
                  {emp.name}{' '}
                  {!emp.active && <span className="pill pill-red">Removed</span>}
                  {emp.active && emp.leave_date && <span className="pill pill-red">Left {emp.leave_date}</span>}
                </td>
                <td className="num">{formatCurrency(emp.annual_wage)}</td>
                <td className="num compact-col">{formatCurrency(monthlyRate(emp))}</td>
                <td className="num compact-col">{formatCurrency(dayRate(emp))}</td>
                <td className="num compact-col">{formatCurrency(hourlyRate(emp))}</td>
                <td className="num compact-col">{emp.working_days_per_year}</td>
                <td className="num compact-col">{emp.working_hours_per_day}</td>
                <td className="num">{emp.holiday_entitlement_days}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => toggleActive(emp)}>
                      {emp.active ? 'Remove' : 'Restore'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeEmployee(emp)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
