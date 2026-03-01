import Checklist from '../components/Checklist'
import DiagramUpload from '../components/DiagramUpload'
import { SYSTEM_DIAGRAM_CHECKLIST, COMPONENT_FIELDS } from '../templates'
import { generateId } from '../storage'

export default function SystemDiagram({ data, onChange }) {
  const {
    checklist = {},
    components = [],
    imageData = null,
    link = '',
    notes = '',
  } = data || {}

  const update = (updates) => onChange({ ...data, ...updates })

  const addComponent = () => {
    const newComponent = {
      id: generateId(),
      name: 'New Component',
      what: '',
      why: '',
      tech: '',
      interfaces: '',
      dataOwnership: '',
      scaling: '',
      failureModes: '',
    }
    update({ components: [...components, newComponent] })
  }

  const updateComponent = (id, field, value) => {
    update({
      components: components.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    })
  }

  const removeComponent = (id) => {
    update({ components: components.filter((c) => c.id !== id) })
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">System Diagram</h1>
      </div>

      <div className="diagram-section">
        <h2 className="subsection-title">Diagram</h2>
        <DiagramUpload
          imageData={imageData}
          link={link}
          onImageChange={(imageData) => update({ imageData })}
          onLinkChange={(link) => update({ link })}
        />
      </div>

      <div className="checklist-section">
        <h2 className="subsection-title">Diagram Checklist</h2>
        <Checklist
          items={SYSTEM_DIAGRAM_CHECKLIST}
          values={checklist}
          onChange={(checklist) => update({ checklist })}
        />
      </div>

      <div className="notes-section">
        <h2 className="subsection-title">Notes</h2>
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Additional notes about the system diagram, failure modes, etc."
          rows={4}
        />
      </div>

      <div className="subsection-header">
        <h2 className="subsection-title">Component Breakdown</h2>
        <button className="btn-primary" onClick={addComponent}>
          + Add Component
        </button>
      </div>

      {components.map((component) => (
        <div key={component.id} className="component-card">
          <div className="component-header">
            <input
              className="component-name-input"
              value={component.name}
              onChange={(e) => updateComponent(component.id, 'name', e.target.value)}
              placeholder="Component name"
            />
            <button
              className="btn-danger-sm"
              onClick={() => removeComponent(component.id)}
            >
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
  )
}
