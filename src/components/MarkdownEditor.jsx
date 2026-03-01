import { useState } from 'react'
import { marked } from 'marked'

// Disable raw HTML passthrough — prevents <script> injection via markdown.
marked.use({
  gfm: true,
  breaks: true,
  renderer: { html: () => '' },
})

export default function MarkdownEditor({ value, onChange, placeholder }) {
  const [mode, setMode] = useState('split')

  const html = marked.parse(value || '')

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        <div className="md-mode-toggle">
          <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>
            Edit
          </button>
          <button className={mode === 'split' ? 'active' : ''} onClick={() => setMode('split')}>
            Split
          </button>
          <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
            Preview
          </button>
        </div>
      </div>

      <div className={`md-panes md-${mode}`}>
        {mode !== 'preview' && (
          <textarea
            className="md-textarea"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'Start writing…'}
            spellCheck={false}
          />
        )}
        {mode !== 'edit' && (
          <div
            className="md-preview"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  )
}
