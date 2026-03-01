import Checklist from '../components/Checklist'
import DiagramUpload from '../components/DiagramUpload'
import { SEQUENCE_DIAGRAM_CHECKLIST } from '../templates'
import { generateId } from '../storage'

export default function SequenceDiagram({ data, onChange }) {
  const { flows = [] } = data || {}

  const addFlow = () => {
    const newFlow = {
      id: generateId(),
      name: 'New Flow',
      checklist: {},
      imageData: null,
      link: '',
      notes: '',
    }
    onChange({ ...data, flows: [...flows, newFlow] })
  }

  const updateFlow = (id, updates) => {
    onChange({
      ...data,
      flows: flows.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })
  }

  const removeFlow = (id) => {
    onChange({ ...data, flows: flows.filter((f) => f.id !== id) })
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">Sequence Diagrams</h1>
        <button className="btn-primary" onClick={addFlow}>
          + Add Flow
        </button>
      </div>

      {flows.length === 0 && (
        <div className="empty-hint-box">
          <p>No flows yet. Click "+ Add Flow" to document a key system flow.</p>
          <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Examples: User Login, Payment Processing, Data Sync, Error Recovery
          </p>
        </div>
      )}

      {flows.map((flow, index) => (
        <div key={flow.id} className="flow-card">
          <div className="flow-header">
            <span className="flow-number">Flow {index + 1}</span>
            <input
              className="flow-name-input"
              value={flow.name}
              onChange={(e) => updateFlow(flow.id, { name: e.target.value })}
              placeholder="Flow name (e.g. User Login)"
            />
            <button className="btn-danger-sm" onClick={() => removeFlow(flow.id)}>
              Remove
            </button>
          </div>

          <div className="flow-body">
            <div>
              <h3 className="subsection-title-sm">Diagram</h3>
              <DiagramUpload
                imageData={flow.imageData}
                link={flow.link}
                onImageChange={(imageData) => updateFlow(flow.id, { imageData })}
                onLinkChange={(link) => updateFlow(flow.id, { link })}
              />
            </div>

            <div className="checklist-section" style={{ marginBottom: 0 }}>
              <h3 className="subsection-title-sm" style={{ marginBottom: '12px' }}>Checklist</h3>
              <Checklist
                items={SEQUENCE_DIAGRAM_CHECKLIST}
                values={flow.checklist}
                onChange={(checklist) => updateFlow(flow.id, { checklist })}
              />
            </div>

            <div>
              <h3 className="subsection-title-sm">Notes</h3>
              <textarea
                className="notes-textarea"
                value={flow.notes || ''}
                onChange={(e) => updateFlow(flow.id, { notes: e.target.value })}
                placeholder="Describe the flow, edge cases, retry strategy, etc."
                rows={3}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
