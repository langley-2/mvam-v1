import MarkdownEditor from '../components/MarkdownEditor'
import { SECTION_TEMPLATES, buildMarkdownFromForm } from '../templates'
import { downloadMarkdown } from '../storage'

export default function LearningsProof({ data, onChange }) {
  const {
    content = '',
    proofs = { performance: false, failure: false },
  } = data || {}

  const update = (updates) => onChange({ ...(data || {}), ...updates })
  const updateProofs = (updates) => update({ proofs: { ...proofs, ...updates } })

  const handleUseTemplate = () => {
    if (!content || window.confirm('Replace current content with the template?')) {
      update({ content: SECTION_TEMPLATES.learningsProof })
    }
  }

  const handleFormChange = (formData) => {
    const built = buildMarkdownFromForm('learningsProof', formData)
    update({ form: formData, content: built })
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">Learnings & Proof</h1>
        <div className="section-actions">
          <button className="btn-secondary" onClick={handleUseTemplate}>
            Use Template
          </button>
          <button
            className="btn-primary"
            onClick={() => downloadMarkdown('learnings-and-proof.md', content)}
            disabled={!content.trim()}
          >
            Download .md
          </button>
        </div>
      </div>

      <MarkdownEditor
        value={content}
        onChange={(val) => update({ content: val })}
        placeholder="Document failures, postmortems, incidents, and what your team learned…"
        sectionType="learningsProof"
        formData={data?.form}
        onFormChange={handleFormChange}
      />

      <div className="subsection">
        <h2 className="subsection-title">Proofs</h2>
        <p className="subsection-desc">Evidence that the system has been validated under real or simulated conditions.</p>
        <div className="proofs-checklist">
          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!proofs.performance}
              onChange={(e) => updateProofs({ performance: e.target.checked })}
            />
            <span style={{ textDecoration: proofs.performance ? 'line-through' : 'none', opacity: proofs.performance ? 0.5 : 1 }}>
              Performance proof — benchmark, profiling output, query plan, or load test result
            </span>
          </label>
          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!proofs.failure}
              onChange={(e) => updateProofs({ failure: e.target.checked })}
            />
            <span style={{ textDecoration: proofs.failure ? 'line-through' : 'none', opacity: proofs.failure ? 0.5 : 1 }}>
              Failure proof — postmortem, chaos/failure injection, or traced incident
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
