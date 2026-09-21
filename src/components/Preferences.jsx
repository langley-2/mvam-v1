import { useState, useRef } from 'react'
import { SECTION_TEMPLATES } from '../templates'
import { generateId } from '../storage'
import { PROVIDERS } from '../api/review'
import { renderMarkdown } from '../markdown'

const BUILT_IN_SECTIONS = [
  { id: 'requirements', label: 'Requirements' },
  { id: 'architecture', label: 'System Design' },
  { id: 'scalingCost', label: 'Scaling & Economics' },
  { id: 'codeStructure', label: 'Implementation Structure' },
  { id: 'learningsProof', label: 'Learnings & Proof' },
]

export default function Preferences({ prefs, onChange, isApiKeyConfigured, onKeySave, onKeyClear }) {
  const [activeId, setActiveId] = useState('requirements')
  const [mode, setMode] = useState('edit')
  const [newSectionName, setNewSectionName] = useState('')
  const [addingSection, setAddingSection] = useState(false)
  const addInputRef = useRef(null)

  const customSections = prefs.customSections || []
  const isBuiltIn = BUILT_IN_SECTIONS.some((s) => s.id === activeId)
  const isAppearance = activeId === '__appearance__'
  const isApi = activeId === '__api__'
  const isCustom = !isBuiltIn && !isAppearance && !isApi

  const currentTemplate = isBuiltIn
    ? (prefs.templates[activeId] ?? SECTION_TEMPLATES[activeId] ?? '')
    : isCustom
    ? (customSections.find((s) => s.id === activeId)?.template ?? '')
    : ''

  const isModified =
    isBuiltIn &&
    prefs.templates[activeId] != null &&
    prefs.templates[activeId] !== SECTION_TEMPLATES[activeId]

  const activeLabel = isBuiltIn
    ? BUILT_IN_SECTIONS.find((s) => s.id === activeId)?.label
    : isCustom
    ? customSections.find((s) => s.id === activeId)?.label
    : isAppearance
    ? 'Appearance'
    : isApi
    ? 'API'
    : 'Preferences'

  const handleTemplateChange = (value) => {
    if (isBuiltIn) {
      onChange({ ...prefs, templates: { ...prefs.templates, [activeId]: value } })
    } else if (isCustom) {
      onChange({
        ...prefs,
        customSections: customSections.map((s) =>
          s.id === activeId ? { ...s, template: value } : s
        ),
      })
    }
  }

  const handleResetTemplate = () => {
    const next = { ...prefs.templates }
    delete next[activeId]
    onChange({ ...prefs, templates: next })
  }

  const handleAddSection = () => {
    if (!newSectionName.trim()) return
    const id = `custom_${generateId()}`
    const newSection = {
      id,
      label: newSectionName.trim(),
      template: `# ${newSectionName.trim()}\n\n`,
    }
    onChange({ ...prefs, customSections: [...customSections, newSection] })
    setNewSectionName('')
    setAddingSection(false)
    setActiveId(id)
  }

  const handleDeleteSection = (id) => {
    onChange({ ...prefs, customSections: customSections.filter((s) => s.id !== id) })
    if (activeId === id) setActiveId('requirements')
  }

  return (
    <div className="prefs-layout">
      <nav className="prefs-sidebar" aria-label="Preferences navigation">
        <div className="prefs-sidebar-header" id="prefs-builtin-label">
          Built-in Templates
        </div>
        <ul className="prefs-section-list" aria-labelledby="prefs-builtin-label">
          {BUILT_IN_SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                className={`prefs-section-btn ${activeId === s.id ? 'active' : ''}`}
                onClick={() => setActiveId(s.id)}
                aria-current={activeId === s.id ? 'page' : undefined}
              >
                <span>{s.label}</span>
                {prefs.templates[s.id] != null &&
                  prefs.templates[s.id] !== SECTION_TEMPLATES[s.id] && (
                    <span className="prefs-custom-badge" aria-label="customised">
                      custom
                    </span>
                  )}
              </button>
            </li>
          ))}
        </ul>

        <div className="prefs-sidebar-header" id="prefs-custom-label">
          Custom Sections
        </div>
        <ul className="prefs-section-list" aria-labelledby="prefs-custom-label">
          {customSections.length === 0 && (
            <li>
              <span className="prefs-empty-hint">No custom sections yet.</span>
            </li>
          )}
          {customSections.map((s) => (
            <li key={s.id} className="prefs-section-list-item">
              <button
                className={`prefs-section-btn prefs-section-btn--custom ${activeId === s.id ? 'active' : ''}`}
                onClick={() => setActiveId(s.id)}
                aria-current={activeId === s.id ? 'page' : undefined}
              >
                {s.label}
              </button>
              <button
                className="prefs-section-delete-btn"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete section "${s.label}"? This will not remove data from existing versions.`
                    )
                  ) {
                    handleDeleteSection(s.id)
                  }
                }}
                aria-label={`Delete ${s.label} section`}
                title={`Delete ${s.label}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {addingSection ? (
          <form
            className="prefs-add-section-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleAddSection()
            }}
          >
            <input
              ref={addInputRef}
              className="prefs-add-section-input"
              placeholder="Section name…"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              autoFocus
              aria-label="New section name"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setAddingSection(false)
                  setNewSectionName('')
                }
              }}
              onBlur={() => {
                if (!newSectionName.trim()) setAddingSection(false)
              }}
            />
          </form>
        ) : (
          <button className="prefs-add-section-btn" onClick={() => setAddingSection(true)}>
            + Add section
          </button>
        )}

        <div className="prefs-sidebar-divider" role="separator" />

        <ul className="prefs-section-list">
          <li>
            <button
              className={`prefs-section-btn ${isAppearance ? 'active' : ''}`}
              onClick={() => setActiveId('__appearance__')}
              aria-current={isAppearance ? 'page' : undefined}
            >
              Appearance
            </button>
          </li>
          <li>
            <button
              className={`prefs-section-btn ${isApi ? 'active' : ''}`}
              onClick={() => setActiveId('__api__')}
              aria-current={isApi ? 'page' : undefined}
            >
              AI Provider
              {isApiKeyConfigured && (
                <span className="prefs-custom-badge" aria-label="configured">
                  on
                </span>
              )}
            </button>
          </li>
        </ul>
      </nav>

      <div className="prefs-main" role="region" aria-label={`${activeLabel} settings`}>
        {isAppearance ? (
          <AppearancePanel prefs={prefs} onChange={onChange} />
        ) : isApi ? (
          <ApiPanel
            prefs={prefs}
            onChange={onChange}
            isApiKeyConfigured={isApiKeyConfigured}
            onKeySave={onKeySave}
            onKeyClear={onKeyClear}
          />
        ) : (
          <>
            <div className="prefs-header">
              <div>
                <h2 className="prefs-title">{activeLabel} Template</h2>
                <p className="prefs-desc">
                  {isBuiltIn
                    ? 'Default markdown inserted when a new version is created. Changes take effect for new versions only.'
                    : 'This section appears in the nav bar for all versions. Edit its template here.'}
                </p>
              </div>
              <div className="prefs-actions">
                {isModified && (
                  <button
                    className="btn-secondary"
                    onClick={handleResetTemplate}
                    title="Restore the original default template"
                  >
                    Reset to default
                  </button>
                )}
              </div>
            </div>

            <div className="md-editor">
              <div className="md-toolbar">
                <div className="md-mode-toggle" role="group" aria-label="Editor view mode">
                  <button
                    className={mode === 'edit' ? 'active' : ''}
                    onClick={() => setMode('edit')}
                    aria-pressed={mode === 'edit'}
                  >
                    Edit
                  </button>
                  <button
                    className={mode === 'preview' ? 'active' : ''}
                    onClick={() => setMode('preview')}
                    aria-pressed={mode === 'preview'}
                  >
                    Preview
                  </button>
                </div>
              </div>
              <div className={`md-panes md-${mode}`}>
                {mode === 'edit' && (
                  <textarea
                    className="md-textarea"
                    value={currentTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    spellCheck={false}
                    placeholder="Enter template markdown…"
                    aria-label={`${activeLabel} template content`}
                  />
                )}
                {mode === 'preview' && (
                  <div
                    className="md-preview"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(currentTemplate) }}
                    aria-label={`${activeLabel} template preview`}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Appearance panel ─────────────────────────────────────────────────────────

function AppearancePanel({ prefs, onChange }) {
  const theme = prefs.theme || 'system'

  const themes = [
    {
      value: 'light',
      label: 'Light',
      desc: 'Cloud white & baby blue',
      preview: { bg: '#f2f8ff', sidebar: '#dceeff', accent: '#3277b2' },
    },
    {
      value: 'dark',
      label: 'Dark',
      desc: 'Rich twilight blue',
      preview: { bg: '#172f58', sidebar: '#132d58', accent: '#9ed4ff' },
    },
    {
      value: 'system',
      label: 'System',
      desc: 'Follow OS preference',
      preview: { bg: 'linear-gradient(135deg, #f2f8ff 50%, #172f58 50%)', sidebar: 'linear-gradient(135deg, #dceeff 50%, #132d58 50%)', accent: '#3277b2' },
    },
  ]

  return (
    <div>
      <div className="prefs-header">
        <div>
          <h2 className="prefs-title">Appearance</h2>
          <p className="prefs-desc">Personalise how Taffy looks.</p>
        </div>
      </div>

      <fieldset className="appearance-fieldset">
        <legend className="appearance-legend">Theme</legend>
        <div className="theme-options" role="radiogroup" aria-label="Colour theme">
          {themes.map(({ value, label, desc, preview }) => (
            <label
              key={value}
              className={`theme-option${theme === value ? ' theme-option--selected' : ''}`}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => onChange({ ...prefs, theme: value })}
                className="theme-radio"
              />
              <div
                className="theme-option-swatch"
                aria-hidden="true"
                style={{ background: preview.bg }}
              >
                <div className="theme-option-swatch-bar" style={{ background: preview.sidebar }} />
                <div className="theme-option-swatch-dot" style={{ background: preview.accent }} />
              </div>
              <div className="theme-option-info">
                <div className="theme-option-label">{label}</div>
                <div className="theme-option-desc">{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

// ─── API panel ────────────────────────────────────────────────────────────────

function ApiPanel({ prefs, onChange, isApiKeyConfigured, onKeySave, onKeyClear }) {
  const config = prefs.apiConfig || { provider: 'openai', model: 'gpt-4o-mini' }
  const [showKey, setShowKey] = useState(false)
  const [draftKey, setDraftKey] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const update = (updates) => {
    onChange({ ...prefs, apiConfig: { ...config, ...updates } })
  }

  const handleSaveKey = async () => {
    if (!draftKey.trim()) return
    setStatus('')
    setError('')
    try {
      await onKeySave(draftKey.trim())
      setDraftKey('')
      setShowKey(false)
      setStatus('API key saved.')
    } catch (err) {
      setError(err.message || 'Failed to save API key.')
    }
  }

  const handleClearKey = async () => {
    setStatus('')
    setError('')
    try {
      await onKeyClear()
      setDraftKey('')
      setShowKey(false)
      setStatus('API key removed.')
    } catch (err) {
      setError(err.message || 'Failed to remove API key.')
    }
  }


  return (
    <div>
      <div className="prefs-header">
        <div>
          <h2 className="prefs-title">AI Provider</h2>
          <p className="prefs-desc">
            Connect Taffy to an AI provider to enable section reviews and static repository analysis.
          </p>
        </div>
      </div>

      <div className="api-security-notice" role="note" aria-label="Security information">
        <strong>Security:</strong> In the desktop app, your API key is encrypted with the operating
        system's secure storage and provider requests run outside the renderer. Browser development
        mode keeps the key in memory only; reload the page to clear it.
      </div>

      <div className="ai-disclosure" role="note" aria-label="AI service disclosure">
        <strong>Third-party AI services.</strong> When you request a review or repository analysis,
        relevant section or repository content is sent to the AI provider you have selected. These
        services are operated by third parties — Taffy has no control over how they process or retain
        your data. AI-generated output may be inaccurate, incomplete, or misleading. You are
        responsible for reviewing it before acting on it, and for ensuring any content you submit is
        appropriate to share with your chosen provider.
      </div>

      <div className="api-fields">
        {/* Provider */}
        <div className="api-field">
          <label className="form-field-label" htmlFor="api-provider">
            Provider
          </label>
          <select
            id="api-provider"
            className="api-select"
            value={config.provider || 'openai'}
            onChange={(e) => update({ provider: e.target.value })}
          >
            {Object.entries(PROVIDERS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* API key */}
        <div className="api-field">
          <label className="form-field-label" htmlFor="api-key">
            API Key
          </label>
          <div className="api-key-row">
            <input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              className="api-key-input"
              value={draftKey}
              onChange={(e) => {
                setDraftKey(e.target.value)
                setStatus('')
                setError('')
              }}
              placeholder={isApiKeyConfigured ? 'Enter a new key to replace the saved key' : 'sk-…'}
              autoComplete="new-password"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby="api-key-hint"
            />
            <button
              type="button"
              className="api-key-toggle"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="api-field-hint" id="api-key-hint">
            {isApiKeyConfigured
              ? 'A key is saved. The saved value is not shown here.'
              : 'No API key is saved yet.'}
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={handleSaveKey}
          disabled={!draftKey.trim()}
        >
          Save API key
        </button>

        {isApiKeyConfigured && (
          <button
            className="btn-danger-sm"
            onClick={() => {
              if (window.confirm('Remove your API key?')) {
                handleClearKey()
              }
            }}
          >
            Remove API key
          </button>
        )}

        {status && <p className="api-field-hint" role="status">{status}</p>}
        {error && <p className="api-field-hint" role="alert">{error}</p>}
      </div>
    </div>
  )
}
