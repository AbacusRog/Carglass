import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatCurrency } from '../lib/wage'

export default function AdjustmentsEditor({ timesheetId, adjustments, onChange }) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState('addition')

  async function addAdjustment(e) {
    e.preventDefault()
    if (!label.trim() || !amount) return
    const { error } = await supabase.from('adjustments').insert({
      timesheet_id: timesheetId,
      kind,
      label: label.trim(),
      amount: Number(amount),
    })
    if (!error) {
      setLabel('')
      setAmount('')
      onChange()
    }
  }

  async function removeAdjustment(id) {
    await supabase.from('adjustments').delete().eq('id', id)
    onChange()
  }

  return (
    <div style={{ padding: '10px 4px' }}>
      {adjustments.length === 0 && (
        <p className="helper-text" style={{ marginBottom: 10 }}>
          No additions or deductions for this month yet.
        </p>
      )}
      {adjustments.map((a) => (
        <div className="adjustment-row" key={a.id}>
          <span className={`pill ${a.kind === 'addition' ? 'pill-green' : 'pill-red'}`}>
            {a.kind === 'addition' ? '+' : '−'}
          </span>
          <span className="adj-label">{a.label}</span>
          <span className="adj-amount">{formatCurrency(a.amount)}</span>
          <button className="remove-x" onClick={() => removeAdjustment(a.id)} title="Remove">
            ✕
          </button>
        </div>
      ))}

      <form onSubmit={addAdjustment} style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ padding: '6px 8px', borderRadius: 3, border: '1px solid var(--paper-line)' }}>
          <option value="addition">Addition</option>
          <option value="deduction">Deduction</option>
        </select>
        <input
          placeholder="e.g. Bonus, Glass Damage"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 3, border: '1px solid var(--paper-line)', flex: 1, minWidth: 140 }}
        />
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 3, border: '1px solid var(--paper-line)', width: 100 }}
        />
        <button className="btn btn-outline btn-sm" type="submit">Add</button>
      </form>
    </div>
  )
}
