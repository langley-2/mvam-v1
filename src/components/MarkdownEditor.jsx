import { useState, useRef } from 'react'
import { marked } from 'marked'
import MarkdownForm from './MarkdownForm'

// Disable raw HTML passthrough — prevents <script> injection via markdown.
marked.use({
  gfm: true,
  breaks: true,
  renderer: { html: () => '' },
})

export default function MarkdownEditor({ value, onChange, placeholder, sectionType, formData, onFormChange }) {
  const hasForm = !!sectionType
  const [mode, setMode] = useState('edit')
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const html = marked.parse(value || '')

  const handleImageFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large (max 5 MB). Consider compressing it first.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const altText = file.name.replace(/\.[^.]+$/, '')
      const imgMd = `\n![${altText}](${ev.target.result})\n`
      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const next = (value || '').slice(0, start) + imgMd + (value || '').slice(end)
        onChange(next)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + imgMd.length
          textarea.focus()
        }, 0)
      } else {
        onChange((value || '') + imgMd)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        <div className="md-mode-toggle">
          <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>
            Edit
          </button>
          {hasForm && (
            <button className={mode === 'form' ? 'active' : ''} onClick={() => setMode('form')}>
              Form
            </button>
          )}
          <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
            Preview
          </button>
        </div>

        {mode === 'edit' && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display: 'none' }} />
            <button className="md-img-btn" onClick={() => fileInputRef.current?.click()} title="Insert image at cursor">
              Insert Image
            </button>
          </>
        )}
      </div>

      {mode === 'form' && hasForm && (
        <MarkdownForm sectionType={sectionType} formData={formData} onFormChange={onFormChange} />
      )}

      {mode !== 'form' && (
        <div className={`md-panes md-${mode}`}>
          {mode === 'edit' && (
            <textarea
              ref={textareaRef}
              className="md-textarea"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || 'Start writing…'}
              spellCheck={false}
            />
          )}
          <div className="md-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </div>
  )
}
