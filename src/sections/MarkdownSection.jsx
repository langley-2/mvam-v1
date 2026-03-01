import MarkdownEditor from '../components/MarkdownEditor'
import { downloadMarkdown } from '../storage'

export default function MarkdownSection({ title, data, template, filename, onChange }) {
  const content = data?.content || ''

  const handleUseTemplate = () => {
    if (!content || window.confirm('Replace current content with the template?')) {
      onChange({ ...data, content: template })
    }
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <h1 className="section-title">{title}</h1>
        <div className="section-actions">
          <button className="btn-secondary" onClick={handleUseTemplate}>
            Use Template
          </button>
          <button
            className="btn-primary"
            onClick={() => downloadMarkdown(filename, content)}
            disabled={!content.trim()}
          >
            Download .md
          </button>
        </div>
      </div>

      <MarkdownEditor
        value={content}
        onChange={(val) => onChange({ ...data, content: val })}
        placeholder={`Start writing the ${title} section…`}
      />
    </div>
  )
}
