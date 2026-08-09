import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatCurrency } from '../lib/wage'

const NEW_LABEL_VALUE = '__new__'

export default function AdjustmentsEditor({ timesheetId, adjustments, onChange }) {
  const [types, setTypes] = useState([])
  const [kind, setKind] = useState('addition')
  const [selectedLabel, setSelectedLabel] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [amount, setAmount] = useState('')

  const [editingAdjId, setEditingAdjId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const [showManage, setShowManage] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState(null)
  const [editingTypeLabel, setEditingTypeLabel] = useState('')

  async function loadTypes() {
    const { data } = await supabase
      .from('adjustment_types')
      .select('*')
      .order('label')
    setTypes(data || [])
  }

  useEffect(() => {
    loadTypes()
  }, [])

  const typesForKind = types.filter((t) => t.kind === kind)
  const usingCustomLabel = selectedLabel === NEW_LABEL_VALUE || typesForKind.length === 0

  async function addAdjustment(e) {
    e.preventDefault()
    const label = (usingCustomLabel ? customLabel : selectedLabel).trim()
    if (!label || !amount) return

    // Learn this label for next time, if it isn't already saved.
    const alreadyKnown = types.some(
      (t) => t.kind === kind && t.label.toLowerCase() === label.toLowerCase()
    )
    if (!alreadyKnown) {
      await supabase.from('adjustment_types').insert({ label, kind })
    }

    const { error } = await supabase.from('adjustments').insert({
      timesheet_id: timesheetId,
      kind,
      label,
      amount: Number(amount),
    })

    if (!error) {
      setCustomLabel('')
      setSelectedLabel('')
      setAmount('')
      await loadTypes()
      onChange()
    }
  }

  async function removeAdjustment(id) {
    await supabase.from('adjustments').delete().eq('id', id)
    onChange()
  }

  function startEditAdjustment(a) {
    setEditingAdjId(a.id)
    setEditLabel(a.label)
    setEditAmount(a.amount)
  }

  async function saveEditAdjustment(id) {
    await supabase
      .from('adjustments')
      .update({ label: editLabel.trim(), amount: Number(editAmount) })
      .eq('id', id)
    setEditingAdjId(null)
    onChange()
  }

  function startEditType(t) {
    setEditingTypeId(t.id)
    setEditingTypeLabel(t.label)
  }

  async function saveEditType(t) {
    const label = editingTypeLabel.trim()
    if (!label) return
    await supabase.from('adjustment_types').update({ label }).eq('id', t.id)
    setEditingTypeId(null)
    loadTypes()
  }

  async function deleteType(t) {
    if (!confirm(`Remove "${t.label}" from the saved list? This won't affect existing entries that already used it.`)) return
    await supabase.from('adjustment_types').delete().eq('id', t.id)
    loadTypes()
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
          {editingAdjId === a.id ? (
            <>
              <span className={`pill ${a.kind === 'addition' ? 'pill-green' : 'pill-red'}`}>
                {a.kind === 'addition' ? '+' : '−'}
              </span>
              <input
                className="adj-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                style={{ padding: '4px 8px', border: '1px solid var(--paper-line)', borderRadius: 3 }}
              />
              <input
                className="adj-amount"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                style={{ padding: '4px 8px', border: '1px solid var(--paper-line)', borderRadius: 3 }}
              />
              <button className="btn btn-outline btn-sm" onClick={() => saveEditAdjustment(a.id)}>
                Save
              </button>
              <button className="remove-x" onClick={() => setEditingAdjId(null)} title="Cancel">
                ✕
              </button>
            </>
          ) : (
            <>
              <span className={`pill ${a.kind === 'addition' ? 'pill-green' : 'pill-red'}`}>
                {a.kind === 'addition' ? '+' : '−'}
              </span>
              <span className="adj-label">{a.label}</span>
              <span className="adj-amount">{formatCurrency(a.amount)}</span>
              <button className="btn btn-outline btn-sm" onClick={() => startEditAdjustment(a)}>
                Edit
              </button>
              <button className="remove-x" onClick={() => removeAdjustment(a.id)} title="Remove">
                ✕
              </button>
            </>
          )}
        </div>
      ))}

      <form onSubmit={addAdjustment} style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value)
            setSelectedLabel('')
          }}
          style={{ padding: '6px 8px', borderRadius: 3, border: '1px solid var(--paper-line)' }}
        >
          <option value="addition">Addition</option>
          <option value="deduction">Deduction</option>
        </select>

        {typesForKind.length > 0 && (
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 3, border: '1px solid var(--paper-line)', minWidth: 160 }}
          >
            <option value="" disabled>Choose a saved type…</option>
            {typesForKind.map((t) => (
              <option key={t.id} value={t.label}>{t.label}</option>
            ))}
            <option value={NEW_LABEL_VALUE}>+ New label…</option>
          </select>
        )}

        {usingCustomLabel && (
          <input
            placeholder="e.g. Bonus, Glass Damage"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 3, border: '1px solid var(--paper-line)', flex: 1, minWidth: 140 }}
          />
        )}

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

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          className="remove-x"
          style={{ fontSize: 12, color: 'var(--text-muted)' }}
          onClick={() => setShowManage((s) => !s)}
        >
          {showManage ? 'Hide saved types' : 'Manage saved types'}
        </button>
      </div>

      {showManage && (
        <div style={{ marginTop: 8, background: '#fff', border: '1px solid var(--paper-line)', borderRadius: 4, padding: 10 }}>
          {types.length === 0 && <p className="helper-text">No saved types yet — add an addition or deduction above and it'll be remembered here.</p>}
          {types.map((t) => (
            <div className="adjustment-row" key={t.id}>
              <span className={`pill ${t.kind === 'addition' ? 'pill-green' : 'pill-red'}`}>
                {t.kind === 'addition' ? '+' : '−'}
              </span>
              {editingTypeId === t.id ? (
                <>
                  <input
                    className="adj-label"
                    value={editingTypeLabel}
                    onChange={(e) => setEditingTypeLabel(e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid var(--paper-line)', borderRadius: 3 }}
                  />
                  <button className="btn btn-outline btn-sm" onClick={() => saveEditType(t)}>Save</button>
                  <button className="remove-x" onClick={() => setEditingTypeId(null)} title="Cancel">✕</button>
                </>
              ) : (
                <>
                  <span className="adj-label">{t.label}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => startEditType(t)}>Rename</button>
                  <button className="remove-x" onClick={() => deleteType(t)} title="Remove from list">✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
