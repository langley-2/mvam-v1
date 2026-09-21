import { downloadMarkdown, buildRaidMarkdown } from '../storage'

const RAID_ITEMS = [
  { key: 'risks', label: '⚠️  Risks', placeholder: 'List identified risks and their likelihood / impact…' },
  { key: 'assumptions', label: '💭  Assumptions', placeholder: 'List assumptions the design depends on being true…' },
  { key: 'issues', label: '🔴  Issues', placeholder: 'List current issues, blockers, or known problems…' },
  { key: 'decisions', label: '✅  Decisions', placeholder: 'List key decisions already made (for resolved items — use the Decisions section for full ADRs)…' },
]

export default function RaidLog({ data, onChange }) {
  const { raid = { risks: '', assumptions: '', issues: '', decisions: '' } } = data || {}
  const update = (updates) => onChange({ ...(data || {}), ...updates })
  const updateRaid = (key, value) => update({ raid: { ...raid, [key]: value } })

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">RAID Log</h1>
        <div className="section-actions">
          <button
            className="btn-secondary"
            onClick={() => downloadMarkdown('raid-log.md', buildRaidMarkdown(data))}
          >
            Download .md
          </button>
        </div>
      </div>
      <p className="section-intro">Track Risks, Assumptions, Issues, and Decisions for this version. Use the Decisions section for full Architecture Decision Records.</p>
      <div className="raid-grid">
        {RAID_ITEMS.map(({ key, label, placeholder }) => (
          <div key={key} className="raid-item">
            <label className="raid-label">{label}</label>
            <textarea
              className="raid-textarea"
              value={raid[key] || ''}
              onChange={(e) => updateRaid(key, e.target.value)}
              placeholder={placeholder}
              rows={6}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
