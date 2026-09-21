import { useState } from 'react'
import { generateId, downloadMarkdown, buildDecisionsMarkdown } from '../storage'

const STATUS_OPTIONS = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'deprecated', label: 'Deprecated' },
]

function newDecision() {
  return {
    id: generateId(),
    title: '',
    status: 'proposed',
    context: '',
    options: [
      { id: generateId(), label: 'Option A', description: '', pros: '', cons: '' },
      { id: generateId(), label: 'Option B', description: '', pros: '', cons: '' },
    ],
    decision: '',
    rationale: '',
    implications: '',
  }
}

export default function Decisions({ data, onChange }) {
  const items = data?.items || []
  const [expandedId, setExpandedId] = useState(() => items[0]?.id || null)

  const update = (newItems) => onChange({ ...(data || {}), items: newItems })

  const addDecision = () => {
    const d = newDecision()
    update([...items, d])
    setExpandedId(d.id)
  }

  const removeDecision = (id) => {
    const next = items.filter((d) => d.id !== id)
    update(next)
    if (expandedId === id) setExpandedId(next[0]?.id || null)
  }

  const updateDecision = (id, patch) =>
    update(items.map((d) => (d.id === id ? { ...d, ...patch } : d)))

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">Decisions</h1>
        <div className="section-actions">
          <button
            className="btn-secondary"
            onClick={() => downloadMarkdown('decisions.md', buildDecisionsMarkdown(data))}
            disabled={!items.length}
          >
            Download .md
          </button>
          <button className="btn-primary" onClick={addDecision}>+ Add Decision</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="decisions-empty">
          <p>No decisions recorded yet.</p>
          <p>Architecture Decision Records (ADRs) capture significant choices — the context, options considered, and the reasoning behind what was chosen.</p>
          <button className="btn-primary" onClick={addDecision}>+ Add your first decision</button>
        </div>
      ) : (
        <div className="decisions-list">
          {items.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              expanded={expandedId === d.id}
              onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
              onChange={(patch) => updateDecision(d.id, patch)}
              onDelete={() => {
                if (items.length === 1 || window.confirm(`Delete "${d.title || 'this decision'}"?`)) {
                  removeDecision(d.id)
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DecisionCard({ decision, expanded, onToggle, onChange, onDelete }) {
  const {
    title = '',
    status = 'proposed',
    context = '',
    options = [],
    decision: chosen = '',
    rationale = '',
    implications = '',
  } = decision

  const updateOption = (id, patch) =>
    onChange({ options: options.map((o) => (o.id === id ? { ...o, ...patch } : o)) })

  const addOption = () =>
    onChange({
      options: [
        ...options,
        {
          id: generateId(),
          label: `Option ${String.fromCharCode(65 + options.length)}`,
          description: '',
          pros: '',
          cons: '',
        },
      ],
    })

  const removeOption = (id) =>
    onChange({ options: options.filter((o) => o.id !== id) })

  const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label || status

  return (
    <div className={`decision-card${expanded ? ' decision-card--expanded' : ''}`}>
      <div
        className="decision-card-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        aria-expanded={expanded}
      >
        <div className="decision-card-title-row">
          <span className="decision-chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
          <span className="decision-card-title">{title || 'Untitled decision'}</span>
          <span className={`decision-status-badge decision-status-badge--${status}`}>{statusLabel}</span>
        </div>
        <button
          className="decision-delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          aria-label={`Delete decision: ${title || 'untitled'}`}
          title="Delete this decision"
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="decision-form">
          <div className="decision-form-title-row">
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-field-label">Decision title</label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="What needed to be decided?"
              />
            </div>
            <div className="form-field decision-status-field">
              <label className="form-field-label">Status</label>
              <select
                className="api-select"
                value={status}
                onChange={(e) => onChange({ status: e.target.value })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-field-label">Context</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={context}
              onChange={(e) => onChange({ context: e.target.value })}
              placeholder="What is the situation? What constraints, forces, or requirements triggered this decision?"
            />
          </div>

          <div className="decision-options-section">
            <div className="decision-options-header">
              <span className="form-group-label">Options considered</span>
              <button className="btn-form-add" onClick={addOption}>+ Add option</button>
            </div>
            <div className="decision-options-list">
              {options.map((opt, i) => (
                <div key={opt.id} className="decision-option">
                  <div className="decision-option-header">
                    <span className="decision-option-number">{i + 1}</span>
                    <input
                      className="form-input decision-option-label-input"
                      value={opt.label}
                      onChange={(e) => updateOption(opt.id, { label: e.target.value })}
                      placeholder={`Option ${i + 1} name`}
                    />
                    {options.length > 2 && (
                      <button className="btn-form-remove" onClick={() => removeOption(opt.id)}>×</button>
                    )}
                  </div>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    value={opt.description}
                    onChange={(e) => updateOption(opt.id, { description: e.target.value })}
                    placeholder="Describe this option…"
                  />
                  <div className="decision-option-proscons">
                    <div className="form-field">
                      <label className="form-field-label decision-pros-label">Pros</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        value={opt.pros}
                        onChange={(e) => updateOption(opt.id, { pros: e.target.value })}
                        placeholder="Advantages, strengths, benefits…"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-field-label decision-cons-label">Cons</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        value={opt.cons}
                        onChange={(e) => updateOption(opt.id, { cons: e.target.value })}
                        placeholder="Risks, downsides, costs, complexity…"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="decision-outcome">
            <div className="form-field">
              <label className="form-field-label">Decision made</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={chosen}
                onChange={(e) => onChange({ decision: e.target.value })}
                placeholder="What was decided? Which option, or a hybrid?"
              />
            </div>
            <div className="form-field">
              <label className="form-field-label">Rationale</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={rationale}
                onChange={(e) => onChange({ rationale: e.target.value })}
                placeholder="Why this option over the alternatives? What constraints or principles drove the choice?"
              />
            </div>
            <div className="form-field">
              <label className="form-field-label">Implications</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={implications}
                onChange={(e) => onChange({ implications: e.target.value })}
                placeholder="What does this decision mean going forward? What new constraints does it create? What needs to change as a result?"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
