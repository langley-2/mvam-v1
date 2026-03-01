import { generateId } from '../storage'

const LINK_CATEGORIES = [
  'Repository',
  'Dashboard',
  'Runbook',
  'Design Doc',
  'Ticket',
  'API Docs',
  'Deployment',
  'Monitoring',
  'Other',
]

export default function Links({ data, onChange }) {
  const { items = [] } = data || {}

  const addLink = () => {
    const newLink = {
      id: generateId(),
      label: '',
      category: 'Other',
      url: '',
      description: '',
    }
    onChange({ ...data, items: [...items, newLink] })
  }

  const updateLink = (id, updates) => {
    onChange({
      ...data,
      items: items.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })
  }

  const removeLink = (id) => {
    onChange({ ...data, items: items.filter((l) => l.id !== id) })
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">Links</h1>
        <button className="btn-primary" onClick={addLink}>
          + Add Link
        </button>
      </div>

      <p className="section-description">
        Collect all relevant links for this project version — runbooks, dashboards, repositories,
        design docs, oncall playbooks, API references, deployments, and more.
      </p>

      {items.length === 0 && (
        <div className="empty-hint-box">
          <p>No links yet. Click "+ Add Link" to get started.</p>
        </div>
      )}

      <div className="links-list">
        {items.map((link) => (
          <div key={link.id} className="link-card">
            <div className="link-row">
              <select
                className="diagram-type-select"
                style={{ width: '130px', flexShrink: 0 }}
                value={link.category || 'Other'}
                onChange={(e) => updateLink(link.id, { category: e.target.value })}
              >
                {LINK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="link-label-input"
                value={link.label}
                onChange={(e) => updateLink(link.id, { label: e.target.value })}
                placeholder="Label"
              />
              <input
                className="link-url-input"
                value={link.url}
                onChange={(e) => updateLink(link.id, { url: e.target.value })}
                placeholder="https://…"
                type="url"
              />
              {/^https?:\/\//i.test(link.url) && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="open-link-btn"
                >
                  ↗
                </a>
              )}
              <button className="btn-danger-sm" onClick={() => removeLink(link.id)}>
                ×
              </button>
            </div>
            <input
              className="link-description-input"
              value={link.description}
              onChange={(e) => updateLink(link.id, { description: e.target.value })}
              placeholder="Description (optional)"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
