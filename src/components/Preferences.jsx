import { useState, useRef } from 'react'
import { marked } from 'marked'
import { SECTION_TEMPLATES } from '../templates'
import { generateId } from '../storage'

const BUILT_IN_SECTIONS = [
  { id: 'requirements', label: 'Requirements' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'scalingCost', label: 'Scaling & Cost' },
  { id: 'codeStructure', label: 'Code Structure' },
  { id: 'failuresLearnings', label: 'Failures & Learnings' },
]

export default function Preferences({ prefs, onChange }) {
  const [activeId, setActiveId] = useState('requirements')
  const [mode, setMode] = useState('edit')
  const [newSectionName, setNewSectionName] = useState('')
  const [addingSection, setAddingSection] = useState(false)
  const addInputRef = useRef(null)

  const customSections = prefs.customSections || []
  const isBuiltIn = BUILT_IN_SECTIONS.some((s) => s.id === activeId)
  const isAppearance = activeId === '__appearance__'
  const isCustom = !isBuiltIn && !isAppearance

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
    : 'Appearance'

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
                  if (window.confirm(`Delete section "${s.label}"? This will not remove data from existing versions.`)) {
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
          <button
            className="prefs-add-section-btn"
            onClick={() => setAddingSection(true)}
          >
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
        </ul>
      </nav>

      <div className="prefs-main" role="region" aria-label={`${activeLabel ?? 'Preferences'} settings`}>
        {isAppearance ? (
          <AppearancePanel prefs={prefs} onChange={onChange} />
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
                    dangerouslySetInnerHTML={{ __html: marked.parse(currentTemplate) }}
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

function AppearancePanel({ prefs, onChange }) {
  const theme = prefs.theme || 'system'

  const themes = [
    {
      value: 'light',
      label: 'Light',
      desc: 'Blush white background',
      preview: { bg: '#fdf4f8', sidebar: '#1c1020', accent: '#e8508a' },
    },
    {
      value: 'dark',
      label: 'Dark',
      desc: 'Deep burgundy dark',
      preview: { bg: '#1a0e16', sidebar: '#0f080d', accent: '#f06898' },
    },
    {
      value: 'system',
      label: 'System',
      desc: 'Follow OS preference',
      preview: { bg: 'linear-gradient(135deg, #fdf4f8 50%, #1a0e16 50%)', sidebar: '#1c1020', accent: '#e8508a' },
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
                <div
                  className="theme-option-swatch-dot"
                  style={{ background: preview.accent }}
                />
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
