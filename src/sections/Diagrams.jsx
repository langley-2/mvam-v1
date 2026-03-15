import { useState } from 'react'
import Checklist from '../components/Checklist'
import DiagramUpload from '../components/DiagramUpload'
import { SYSTEM_DIAGRAM_CHECKLIST, SEQUENCE_DIAGRAM_CHECKLIST, COMPONENT_FIELDS } from '../templates'
import { generateId } from '../storage'

// ─── Constants ─────────────────────────────────────────────────────────────────

const OSI_LAYERS = [
  { value: 'L1', label: 'L1 Physical' },
  { value: 'L2', label: 'L2 Data Link' },
  { value: 'L3', label: 'L3 Network' },
  { value: 'L4', label: 'L4 Transport' },
  { value: 'L5', label: 'L5 Session' },
  { value: 'L6', label: 'L6 Presentation' },
  { value: 'L7', label: 'L7 Application' },
]

const CUSTOM_DIAGRAM_TYPES = [
  'Sequence',
  'DFD',
  'State Machine',
  'ERD',
  'Network',
  'C4 Component',
  'C4 Container',
  'C4 Context',
  'Other',
]

const DEFAULT_SYSTEM = {
  title: '',
  osiLayer: null,
  checklist: {},
  components: [],
  imageData: null,
  link: '',
  notes: '',
}

const DEFAULT_C4 = {
  title: '',
  osiLayer: null,
  imageData: null,
  link: '',
  notes: '',
}

// ─── Small shared sub-component ────────────────────────────────────────────────

function OsiLayerSelect({ value, onChange }) {
  return (
    <select
      className="osi-layer-select"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">No layer tag</option>
      {OSI_LAYERS.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  )
}

// ─── System Diagram card (always-on) ──────────────────────────────────────────

function SystemDiagramCard({ data, onChange }) {
  const {
    title = '',
    osiLayer = null,
    checklist = {},
    components = [],
    imageData = null,
    link = '',
    notes = '',
  } = data

  const [newName, setNewName] = useState('')

  const update = (updates) => onChange({ ...data, ...updates })

  const addComponent = () => {
    const name = newName.trim()
    if (!name) return
    update({
      components: [
        ...components,
        {
          id: generateId(),
          name,
          what: '',
          why: '',
          tech: '',
          interfaces: '',
          dataOwnership: '',
          scaling: '',
          failureModes: '',
        },
      ],
    })
    setNewName('')
  }

  const updateComponent = (id, field, value) =>
    update({ components: components.map((c) => (c.id === id ? { ...c, [field]: value } : c)) })

  const removeComponent = (id) =>
    update({ components: components.filter((c) => c.id !== id) })

  return (
    <div className="diagram-card">
      <div className="diagram-card-header">
        <div className="diagram-card-title-row">
          <span className="diagram-core-badge">Core</span>
          <h2 className="diagram-card-title">System Diagram</h2>
        </div>
        <div className="diagram-card-meta">
          <label className="diagram-meta-label">OSI Layer</label>
          <OsiLayerSelect value={osiLayer} onChange={(v) => update({ osiLayer: v })} />
        </div>
      </div>

      <div className="diagram-card-body">
        <div className="diagram-field-row">
          <label className="form-field-label">Diagram Title</label>
          <input
            className="field-input diagram-title-input"
            value={title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. High-Level Architecture v2"
          />
        </div>

        <div>
          <h3 className="subsection-title-sm">Diagram</h3>
          <DiagramUpload
            imageData={imageData}
            link={link}
            onImageChange={(imageData) => update({ imageData })}
            onLinkChange={(link) => update({ link })}
          />
        </div>

        <div className="checklist-section" style={{ marginBottom: 0 }}>
          <h3 className="subsection-title-sm" style={{ marginBottom: 12 }}>Diagram Checklist</h3>
          <Checklist
            items={SYSTEM_DIAGRAM_CHECKLIST}
            values={checklist}
            onChange={(checklist) => update({ checklist })}
          />
        </div>

        <div>
          <h3 className="subsection-title-sm">Notes</h3>
          <textarea
            className="notes-textarea"
            value={notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Additional notes about the system diagram, failure modes, etc."
            rows={3}
          />
        </div>

        <div>
          <div className="subsection-header" style={{ marginTop: 0 }}>
            <h3 className="subsection-title-sm">Component Breakdown</h3>
            <div className="add-component-row">
              <input
                className="add-component-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addComponent()}
                placeholder="Component name…"
              />
              <button className="btn-primary" onClick={addComponent} disabled={!newName.trim()}>
                + Add Component
              </button>
            </div>
          </div>

          {components.map((component) => (
            <div key={component.id} className="component-card" style={{ marginBottom: 12 }}>
              <div className="component-header">
                <span className="flow-number">Name</span>
                <input
                  className="component-name-input"
                  value={component.name}
                  onChange={(e) => updateComponent(component.id, 'name', e.target.value)}
                  placeholder="Component name…"
                />
                <button className="btn-danger-sm" onClick={() => removeComponent(component.id)}>
                  Remove
                </button>
              </div>
              <div className="component-fields">
                {COMPONENT_FIELDS.map((field) => (
                  <div key={field.id} className="component-field">
                    <label className="field-label">{field.label}</label>
                    <input
                      className="field-input"
                      value={component[field.id] || ''}
                      onChange={(e) => updateComponent(component.id, field.id, e.target.value)}
                      placeholder="…"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {components.length === 0 && (
            <p className="empty-hint">No components yet. Click "+ Add Component" to document a component.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── C4 Diagram card (always-on) ───────────────────────────────────────────────

function C4DiagramCard({ data, onChange }) {
  const { title = '', osiLayer = null, imageData = null, link = '', notes = '' } = data

  const update = (updates) => onChange({ ...data, ...updates })

  return (
    <div className="diagram-card">
      <div className="diagram-card-header">
        <div className="diagram-card-title-row">
          <span className="diagram-core-badge">Core</span>
          <h2 className="diagram-card-title">C4 Diagram</h2>
        </div>
        <div className="diagram-card-meta">
          <label className="diagram-meta-label">OSI Layer</label>
          <OsiLayerSelect value={osiLayer} onChange={(v) => update({ osiLayer: v })} />
        </div>
      </div>

      <div className="diagram-card-body">
        <div className="diagram-field-row">
          <label className="form-field-label">Diagram Title</label>
          <input
            className="field-input diagram-title-input"
            value={title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. C4 Context — System Overview"
          />
        </div>

        <div>
          <h3 className="subsection-title-sm">Diagram</h3>
          <DiagramUpload
            imageData={imageData}
            link={link}
            onImageChange={(imageData) => update({ imageData })}
            onLinkChange={(link) => update({ link })}
          />
        </div>

        <div>
          <h3 className="subsection-title-sm">Notes</h3>
          <textarea
            className="notes-textarea"
            value={notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Context, boundaries, actors, external systems…"
            rows={3}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Custom diagram card (user-added) ──────────────────────────────────────────

function CustomDiagramCard({ diagram, index, onChange, onRemove }) {
  const {
    type = 'Sequence',
    name = '',
    osiLayer = null,
    imageData = null,
    link = '',
    notes = '',
    checklist = {},
  } = diagram

  const update = (updates) => onChange({ ...diagram, ...updates })

  const showChecklist = type === 'Sequence'

  return (
    <div className="diagram-card diagram-card--custom">
      <div className="diagram-card-header">
        <div className="diagram-card-title-row">
          <select
            className="diagram-type-select"
            value={type}
            onChange={(e) => update({ type: e.target.value })}
          >
            {CUSTOM_DIAGRAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="flow-name-input"
            value={name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Diagram name (optional)"
          />
        </div>
        <div className="diagram-card-meta">
          <label className="diagram-meta-label">OSI Layer</label>
          <OsiLayerSelect value={osiLayer} onChange={(v) => update({ osiLayer: v })} />
          <button className="btn-danger-sm" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>

      <div className="diagram-card-body">
        <div>
          <h3 className="subsection-title-sm">Diagram</h3>
          <DiagramUpload
            imageData={imageData}
            link={link}
            onImageChange={(imageData) => update({ imageData })}
            onLinkChange={(link) => update({ link })}
          />
        </div>

        {showChecklist && (
          <div className="checklist-section" style={{ marginBottom: 0 }}>
            <h3 className="subsection-title-sm" style={{ marginBottom: 12 }}>Sequence Checklist</h3>
            <Checklist
              items={SEQUENCE_DIAGRAM_CHECKLIST}
              values={checklist}
              onChange={(checklist) => update({ checklist })}
            />
          </div>
        )}

        <div>
          <h3 className="subsection-title-sm">Notes</h3>
          <textarea
            className="notes-textarea"
            value={notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Notes about this diagram…"
            rows={3}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main section ──────────────────────────────────────────────────────────────

export default function Diagrams({ data, onChange }) {
  const system = data?.system ?? DEFAULT_SYSTEM
  const c4 = data?.c4 ?? DEFAULT_C4
  const custom = data?.custom ?? []

  const [osiFilter, setOsiFilter] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addType, setAddType] = useState('Sequence')
  const [addName, setAddName] = useState('')

  const updateSystem = (updates) =>
    onChange({ ...(data || {}), system: { ...system, ...updates }, c4, custom })

  const updateC4 = (updates) =>
    onChange({ ...(data || {}), system, c4: { ...c4, ...updates }, custom })

  const updateCustom = (newCustom) =>
    onChange({ ...(data || {}), system, c4, custom: newCustom })

  const handleAddDiagram = () => {
    updateCustom([
      ...custom,
      {
        id: generateId(),
        type: addType,
        name: addName.trim(),
        osiLayer: null,
        imageData: null,
        link: '',
        notes: '',
        checklist: {},
      },
    ])
    setShowAddForm(false)
    setAddType('Sequence')
    setAddName('')
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setAddType('Sequence')
    setAddName('')
  }

  // Strict filter: only show diagrams where osiLayer exactly matches the active filter.
  // "All" (null filter) shows everything.
  const isVisible = (osiLayer) => !osiFilter || osiLayer === osiFilter

  const systemVisible = isVisible(system.osiLayer)
  const c4Visible = isVisible(c4.osiLayer)
  const visibleCustom = custom.filter((d) => isVisible(d.osiLayer))
  const totalHidden =
    (!systemVisible ? 1 : 0) + (!c4Visible ? 1 : 0) + (custom.length - visibleCustom.length)

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">Diagrams</h1>
        {!showAddForm && (
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            + Add Diagram
          </button>
        )}
      </div>

      {/* Add Diagram inline form */}
      {showAddForm && (
        <div className="add-diagram-form">
          <select
            className="diagram-type-select"
            value={addType}
            onChange={(e) => setAddType(e.target.value)}
            autoFocus
          >
            {CUSTOM_DIAGRAM_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            className="add-diagram-name-input"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddDiagram()
              if (e.key === 'Escape') handleCancelAdd()
            }}
            placeholder="Diagram name (optional)"
          />
          <button className="btn-primary" onClick={handleAddDiagram}>
            Add
          </button>
          <button className="btn-secondary" onClick={handleCancelAdd}>
            Cancel
          </button>
        </div>
      )}

      {/* OSI Layer filter */}
      <div className="osi-filter">
        <span className="osi-filter-label">OSI Layer</span>
        <div className="osi-pills">
          <button
            className={`osi-pill ${!osiFilter ? 'active' : ''}`}
            onClick={() => setOsiFilter(null)}
          >
            All
          </button>
          {OSI_LAYERS.map((layer) => (
            <button
              key={layer.value}
              className={`osi-pill ${osiFilter === layer.value ? 'active' : ''}`}
              onClick={() =>
                setOsiFilter((prev) => (prev === layer.value ? null : layer.value))
              }
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {totalHidden > 0 && (
        <p className="osi-filter-note">
          {totalHidden} diagram{totalHidden !== 1 ? 's' : ''} hidden — tag diagrams with{' '}
          <strong>{osiFilter}</strong> to include them.{' '}
          <button className="osi-filter-clear" onClick={() => setOsiFilter(null)}>
            Show all
          </button>
        </p>
      )}

      {/* Core diagrams — shown/hidden based on their OSI layer tag */}
      {systemVisible && <SystemDiagramCard data={system} onChange={updateSystem} />}
      {c4Visible && <C4DiagramCard data={c4} onChange={updateC4} />}

      {/* User-added diagrams */}
      {visibleCustom.map((diagram, index) => (
        <CustomDiagramCard
          key={diagram.id}
          diagram={diagram}
          index={index}
          onChange={(updates) =>
            updateCustom(custom.map((d) => (d.id === diagram.id ? { ...d, ...updates } : d)))
          }
          onRemove={() => updateCustom(custom.filter((d) => d.id !== diagram.id))}
        />
      ))}

      {!osiFilter && custom.length === 0 && (
        <div className="empty-hint-box" style={{ marginTop: 8 }}>
          <p>Add supplementary diagrams — Sequence flows, DFDs, ERDs, State Machines, network topology, etc.</p>
        </div>
      )}

      {osiFilter && totalHidden === (custom.length + 2) && (
        <div className="empty-hint-box" style={{ marginTop: 8 }}>
          <p>No diagrams are tagged with <strong>{osiFilter}</strong>. Tag a diagram using the "OSI Layer" selector on each card.</p>
        </div>
      )}
    </div>
  )
}
