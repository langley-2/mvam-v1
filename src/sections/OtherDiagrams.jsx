import DiagramUpload from '../components/DiagramUpload'
import { generateId } from '../storage'

const DIAGRAM_TYPES = ['DFD', 'State Diagram', 'ERD', 'Network Diagram', 'C4 Context', 'C4 Container', 'Other']

export default function OtherDiagrams({ data, onChange }) {
  const { diagrams = [] } = data || {}

  const addDiagram = () => {
    const newDiagram = {
      id: generateId(),
      type: 'DFD',
      name: '',
      imageData: null,
      link: '',
      notes: '',
    }
    onChange({ ...data, diagrams: [...diagrams, newDiagram] })
  }

  const updateDiagram = (id, updates) => {
    onChange({
      ...data,
      diagrams: diagrams.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })
  }

  const removeDiagram = (id) => {
    onChange({ ...data, diagrams: diagrams.filter((d) => d.id !== id) })
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">
          Other Diagrams{' '}
          <span className="optional-badge" style={{ verticalAlign: 'middle' }}>
            Optional
          </span>
        </h1>
        <button className="btn-primary" onClick={addDiagram}>
          + Add Diagram
        </button>
      </div>

      <p className="section-description">
        Add supplementary diagrams — Data Flow Diagrams (DFDs), State Machines, Entity-Relationship
        Diagrams, network topology, C4 models, etc.
      </p>

      {diagrams.length === 0 && (
        <div className="empty-hint-box">
          <p>No diagrams added. This section is optional.</p>
        </div>
      )}

      {diagrams.map((diagram, index) => (
        <div key={diagram.id} className="flow-card">
          <div className="flow-header">
            <select
              className="diagram-type-select"
              value={diagram.type}
              onChange={(e) => updateDiagram(diagram.id, { type: e.target.value })}
            >
              {DIAGRAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className="flow-name-input"
              value={diagram.name}
              onChange={(e) => updateDiagram(diagram.id, { name: e.target.value })}
              placeholder="Name (optional)"
            />
            <button className="btn-danger-sm" onClick={() => removeDiagram(diagram.id)}>
              Remove
            </button>
          </div>

          <div className="flow-body">
            <DiagramUpload
              imageData={diagram.imageData}
              link={diagram.link}
              onImageChange={(imageData) => updateDiagram(diagram.id, { imageData })}
              onLinkChange={(link) => updateDiagram(diagram.id, { link })}
            />
            <div>
              <h3 className="subsection-title-sm">Notes</h3>
              <textarea
                className="notes-textarea"
                value={diagram.notes || ''}
                onChange={(e) => updateDiagram(diagram.id, { notes: e.target.value })}
                placeholder="Notes about this diagram…"
                rows={3}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
