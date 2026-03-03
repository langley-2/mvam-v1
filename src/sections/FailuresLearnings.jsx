import MarkdownEditor from '../components/MarkdownEditor'
import { SECTION_TEMPLATES, buildMarkdownFromForm } from '../templates'
import { downloadMarkdown } from '../storage'

const RAID_ITEMS = [
  { key: 'risks', label: '⚠️  Risks', placeholder: 'List identified risks…' },
  { key: 'assumptions', label: '💭  Assumptions', placeholder: 'List assumptions being made…' },
  { key: 'issues', label: '🔴  Issues', placeholder: 'List current issues or blockers…' },
  { key: 'decisions', label: '✅  Decisions', placeholder: 'List key decisions made…' },
]

export default function FailuresLearnings({ data, onChange }) {
  const {
    content = '',
    proofs = { performance: false, failure: false },
    raid = { risks: '', assumptions: '', issues: '', decisions: '' },
  } = data || {}

  const update = (updates) => onChange({ ...data, ...updates })
  const updateProofs = (updates) => update({ proofs: { ...proofs, ...updates } })
  const updateRaid = (key, value) => update({ raid: { ...raid, [key]: value } })

  const handleUseTemplate = () => {
    if (!content || window.confirm('Replace current content with the template?')) {
      update({ content: SECTION_TEMPLATES.failuresLearnings })
    }
  }

  const handleFormChange = (formData) => {
    const built = buildMarkdownFromForm('failuresLearnings', formData)
    update({ form: formData, content: built })
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">Failures & Learnings</h1>
        <div className="section-actions">
          <button className="btn-secondary" onClick={handleUseTemplate}>
            Use Template
          </button>
          <button
            className="btn-primary"
            onClick={() => downloadMarkdown('failures-and-learnings.md', content)}
            disabled={!content.trim()}
          >
            Download .md
          </button>
        </div>
      </div>

      <MarkdownEditor
        value={content}
        onChange={(val) => update({ content: val })}
        placeholder="Document failures, postmortems, incidents, and what you learned…"
        sectionType="failuresLearnings"
        formData={data?.form}
        onFormChange={handleFormChange}
      />

      <div className="subsection">
        <h2 className="subsection-title">Proofs</h2>
        <div className="proofs-checklist">
          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!proofs.performance}
              onChange={(e) => updateProofs({ performance: e.target.checked })}
            />
            <span
              style={{
                textDecoration: proofs.performance ? 'line-through' : 'none',
                opacity: proofs.performance ? 0.5 : 1,
              }}
            >
              One performance proof (benchmark, profiling output, query plan, or load test result)
            </span>
          </label>
          <label className="checklist-item">
            <input
              type="checkbox"
              checked={!!proofs.failure}
              onChange={(e) => updateProofs({ failure: e.target.checked })}
            />
            <span
              style={{
                textDecoration: proofs.failure ? 'line-through' : 'none',
                opacity: proofs.failure ? 0.5 : 1,
              }}
            >
              One failure proof (postmortem, injected failure, or traced incident)
            </span>
          </label>
        </div>
      </div>

      <div className="subsection">
        <h2 className="subsection-title">
          RAID Log{' '}
          <span className="optional-badge" style={{ verticalAlign: 'middle' }}>
            Optional
          </span>
        </h2>
        <div className="raid-grid">
          {RAID_ITEMS.map(({ key, label, placeholder }) => (
            <div key={key} className="raid-item">
              <label className="raid-label">{label}</label>
              <textarea
                className="raid-textarea"
                value={raid[key] || ''}
                onChange={(e) => updateRaid(key, e.target.value)}
                placeholder={placeholder}
                rows={5}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
