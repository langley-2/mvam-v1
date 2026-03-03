import { FORM_DEFAULTS } from '../templates'

export default function MarkdownForm({ sectionType, formData, onFormChange }) {
  const form = { ...(FORM_DEFAULTS[sectionType] || {}), ...(formData || {}) }
  const update = (updates) => onFormChange({ ...form, ...updates })

  if (sectionType === 'requirements') return <RequirementsForm form={form} update={update} />
  if (sectionType === 'architecture') return <ArchitectureForm form={form} update={update} />
  if (sectionType === 'scalingCost') return <ScalingCostForm form={form} update={update} />
  if (sectionType === 'codeStructure') return <CodeStructureForm form={form} update={update} />
  if (sectionType === 'failuresLearnings') return <FailuresForm form={form} update={update} />
  return <div className="md-form-empty">No form available for this section.</div>
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function FormGroup({ label, action, children }) {
  return (
    <div className="form-group">
      <div className="form-group-header">
        <span className="form-group-label">{label}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="form-field">
      <label className="form-field-label">{label}</label>
      {children}
    </div>
  )
}

// ─── Requirements ─────────────────────────────────────────────────────────────

function RequirementsForm({ form, update }) {
  const frItems = form.frItems || ['']

  const updateFR = (i, val) => {
    const next = [...frItems]
    next[i] = val
    update({ frItems: next })
  }

  return (
    <div className="md-form">
      <FormGroup
        label="Functional Requirements"
        action={
          <button className="btn-form-add" onClick={() => update({ frItems: [...frItems, ''] })}>
            + Add FR
          </button>
        }
      >
        {frItems.map((item, i) => (
          <div key={i} className="form-list-row">
            <span className="form-list-prefix">FR{i + 1}</span>
            <input className="form-input" value={item} onChange={(e) => updateFR(i, e.target.value)} placeholder="Describe this requirement…" />
            {frItems.length > 1 && (
              <button className="btn-form-remove" onClick={() => update({ frItems: frItems.filter((_, j) => j !== i) })}>×</button>
            )}
          </div>
        ))}
      </FormGroup>

      <FormGroup label="Non-Functional Requirements">
        {[
          ['availability', 'Availability'],
          ['latency', 'Latency / performance'],
          ['scalability', 'Scalability axis'],
          ['durability', 'Durability (RPO/RTO)'],
          ['security', 'Security posture'],
          ['compliance', 'Compliance / privacy'],
          ['operability', 'Operability'],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <input className="form-input" value={form[key] || ''} onChange={(e) => update({ [key]: e.target.value })} placeholder="…" />
          </Field>
        ))}
      </FormGroup>
    </div>
  )
}

// ─── Architecture ─────────────────────────────────────────────────────────────

function ArchitectureForm({ form, update }) {
  const decisions = form.decisions || [{ decision: '', constraint: '', alternatives: '', tradeoff: '' }]
  const deferred = form.deferred || ['']

  const updateDecision = (i, field, val) =>
    update({ decisions: decisions.map((d, j) => (j === i ? { ...d, [field]: val } : d)) })

  return (
    <div className="md-form">
      <FormGroup
        label="Core Decisions"
        action={
          <button className="btn-form-add" onClick={() => update({ decisions: [...decisions, { decision: '', constraint: '', alternatives: '', tradeoff: '' }] })}>
            + Add Decision
          </button>
        }
      >
        {decisions.map((d, i) => (
          <div key={i} className="form-inline-group">
            <div className="form-inline-group-header">
              <span className="form-inline-label">Decision {i + 1}</span>
              {decisions.length > 1 && (
                <button className="btn-form-remove" onClick={() => update({ decisions: decisions.filter((_, j) => j !== i) })}>Remove</button>
              )}
            </div>
            <Field label="Decision — what you chose">
              <input className="form-input" value={d.decision || ''} onChange={(e) => updateDecision(i, 'decision', e.target.value)} placeholder="…" />
            </Field>
            <Field label="Constraint — why">
              <input className="form-input" value={d.constraint || ''} onChange={(e) => updateDecision(i, 'constraint', e.target.value)} placeholder="…" />
            </Field>
            <Field label="Alternatives — what you didn't choose">
              <input className="form-input" value={d.alternatives || ''} onChange={(e) => updateDecision(i, 'alternatives', e.target.value)} placeholder="…" />
            </Field>
            <Field label="Tradeoff — what you gave up">
              <input className="form-input" value={d.tradeoff || ''} onChange={(e) => updateDecision(i, 'tradeoff', e.target.value)} placeholder="…" />
            </Field>
          </div>
        ))}
      </FormGroup>

      <FormGroup label="System Traits">
        {[
          ['archType', 'Architecture type'],
          ['dataArch', 'Data architecture & consistency'],
          ['stateManagement', 'State management'],
          ['deploymentModel', 'Deployment model'],
          ['observability', 'Observability'],
          ['scalingAxis', 'Scaling axis'],
          ['resilience', 'Resilience posture'],
          ['securityPosture', 'Security posture'],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <input className="form-input" value={form[key] || ''} onChange={(e) => update({ [key]: e.target.value })} placeholder="…" />
          </Field>
        ))}
      </FormGroup>

      <FormGroup
        label="Known Tradeoffs / Deferred Decisions"
        action={
          <button className="btn-form-add" onClick={() => update({ deferred: [...deferred, ''] })}>+ Add</button>
        }
      >
        {deferred.map((item, i) => (
          <div key={i} className="form-list-row">
            <input className="form-input" value={item} onChange={(e) => { const next = [...deferred]; next[i] = e.target.value; update({ deferred: next }) }} placeholder="Describe a tradeoff or deferred decision…" />
            {deferred.length > 1 && (
              <button className="btn-form-remove" onClick={() => update({ deferred: deferred.filter((_, j) => j !== i) })}>×</button>
            )}
          </div>
        ))}
      </FormGroup>
    </div>
  )
}

// ─── Scaling & Cost ───────────────────────────────────────────────────────────

function ScalingCostForm({ form, update }) {
  const unitEconomics = form.unitEconomics || [{ component: '', tenX: '', hundredX: '', thousandX: '' }]

  const updateRow = (i, field, val) =>
    update({ unitEconomics: unitEconomics.map((r, j) => (j === i ? { ...r, [field]: val } : r)) })

  return (
    <div className="md-form">
      <FormGroup label="Current State">
        {[
          ['load', 'Load (users, requests, data volume)'],
          ['infrastructure', 'Infrastructure'],
          ['monthlyCost', 'Monthly cost (total + breakdown)'],
          ['costPerUnit', 'Cost per unit (per scan / user / request)'],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <input className="form-input" value={form[key] || ''} onChange={(e) => update({ [key]: e.target.value })} placeholder="…" />
          </Field>
        ))}
      </FormGroup>

      <FormGroup label="Primary Scaling Axis">
        <input className="form-input" value={form.scalingAxis || ''} onChange={(e) => update({ scalingAxis: e.target.value })} placeholder="users / concurrency / data volume / R/W throughput / inference / regions" />
      </FormGroup>

      <FormGroup label="Bottlenecks & Mitigation">
        <Field label="10x — what breaks">
          <input className="form-input" value={form.breaks10x || ''} onChange={(e) => update({ breaks10x: e.target.value })} placeholder="…" />
        </Field>
        <Field label="10x — fix">
          <input className="form-input" value={form.fix10x || ''} onChange={(e) => update({ fix10x: e.target.value })} placeholder="…" />
        </Field>
        <Field label="100x — what breaks">
          <input className="form-input" value={form.breaks100x || ''} onChange={(e) => update({ breaks100x: e.target.value })} placeholder="…" />
        </Field>
        <Field label="100x — fix">
          <input className="form-input" value={form.fix100x || ''} onChange={(e) => update({ fix100x: e.target.value })} placeholder="…" />
        </Field>
      </FormGroup>

      <FormGroup
        label="Unit Economics"
        action={
          <button className="btn-form-add" onClick={() => update({ unitEconomics: [...unitEconomics, { component: '', tenX: '', hundredX: '', thousandX: '' }] })}>
            + Add Row
          </button>
        }
      >
        <div className="form-table">
          <div className="form-table-header">
            <span>Component</span><span>10x</span><span>100x</span><span>1000x</span><span />
          </div>
          {unitEconomics.map((row, i) => (
            <div key={i} className="form-table-row">
              <input className="form-input" value={row.component} onChange={(e) => updateRow(i, 'component', e.target.value)} placeholder="Component" />
              <input className="form-input" value={row.tenX} onChange={(e) => updateRow(i, 'tenX', e.target.value)} placeholder="…" />
              <input className="form-input" value={row.hundredX} onChange={(e) => updateRow(i, 'hundredX', e.target.value)} placeholder="…" />
              <input className="form-input" value={row.thousandX} onChange={(e) => updateRow(i, 'thousandX', e.target.value)} placeholder="…" />
              <button className="btn-form-remove" onClick={() => update({ unitEconomics: unitEconomics.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
        </div>
      </FormGroup>
    </div>
  )
}

// ─── Code Structure ───────────────────────────────────────────────────────────

function CodeStructureForm({ form, update }) {
  const layers = form.layers || [{ name: '', purpose: '', keyFolders: '' }]

  const updateLayer = (i, field, val) =>
    update({ layers: layers.map((l, j) => (j === i ? { ...l, [field]: val } : l)) })

  return (
    <div className="md-form">
      <FormGroup label="Overview">
        <textarea className="form-textarea" rows={3} value={form.overview || ''} onChange={(e) => update({ overview: e.target.value })} placeholder="2–3 sentences describing the overall code structure…" />
      </FormGroup>

      <FormGroup
        label="Layers / Domains"
        action={
          <button className="btn-form-add" onClick={() => update({ layers: [...layers, { name: '', purpose: '', keyFolders: '' }] })}>
            + Add Layer
          </button>
        }
      >
        {layers.map((layer, i) => (
          <div key={i} className="form-inline-group">
            <div className="form-inline-group-header">
              <span className="form-inline-label">Layer {i + 1}</span>
              {layers.length > 1 && (
                <button className="btn-form-remove" onClick={() => update({ layers: layers.filter((_, j) => j !== i) })}>Remove</button>
              )}
            </div>
            <Field label="Name">
              <input className="form-input" value={layer.name || ''} onChange={(e) => updateLayer(i, 'name', e.target.value)} placeholder="e.g. API Layer, Domain, Infrastructure" />
            </Field>
            <Field label="Purpose">
              <input className="form-input" value={layer.purpose || ''} onChange={(e) => updateLayer(i, 'purpose', e.target.value)} placeholder="What this layer does" />
            </Field>
            <Field label="Key folders">
              <input className="form-input" value={layer.keyFolders || ''} onChange={(e) => updateLayer(i, 'keyFolders', e.target.value)} placeholder="e.g. src/api, src/services" />
            </Field>
          </div>
        ))}
      </FormGroup>
    </div>
  )
}

// ─── Failures & Learnings ─────────────────────────────────────────────────────

function FailuresForm({ form, update }) {
  const entries = form.entries || [
    { date: '', title: '', whatHappened: '', rootCause: '', impact: '', patternLearned: '', prevention: '' },
  ]

  const updateEntry = (i, field, val) =>
    update({ entries: entries.map((e, j) => (j === i ? { ...e, [field]: val } : e)) })

  return (
    <div className="md-form">
      <FormGroup
        label="Log Entries"
        action={
          <button
            className="btn-form-add"
            onClick={() => update({ entries: [...entries, { date: '', title: '', whatHappened: '', rootCause: '', impact: '', patternLearned: '', prevention: '' }] })}
          >
            + Add Entry
          </button>
        }
      >
        {entries.map((entry, i) => (
          <div key={i} className="form-inline-group">
            <div className="form-inline-group-header">
              <input className="form-input form-date-input" value={entry.date} onChange={(e) => updateEntry(i, 'date', e.target.value)} placeholder="Date (e.g. 2024-03-01)" />
              <input className="form-input" style={{ flex: 1 }} value={entry.title} onChange={(e) => updateEntry(i, 'title', e.target.value)} placeholder="Title / incident name" />
              {entries.length > 1 && (
                <button className="btn-form-remove" onClick={() => update({ entries: entries.filter((_, j) => j !== i) })}>Remove</button>
              )}
            </div>
            {[
              ['whatHappened', 'What happened'],
              ['rootCause', 'Root cause'],
              ['impact', 'Impact'],
              ['patternLearned', 'Pattern learned'],
              ['prevention', 'Prevention / Fix'],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <textarea className="form-textarea" rows={2} value={entry[key] || ''} onChange={(e) => updateEntry(i, key, e.target.value)} placeholder="…" />
              </Field>
            ))}
          </div>
        ))}
      </FormGroup>
    </div>
  )
}
