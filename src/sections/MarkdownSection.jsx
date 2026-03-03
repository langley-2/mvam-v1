import MarkdownEditor from '../components/MarkdownEditor'
import { downloadMarkdown } from '../storage'
import { buildMarkdownFromForm } from '../templates'

export default function MarkdownSection({ title, sectionType, data, template, filename, onChange }) {
  const content = data?.content || ''

  const handleUseTemplate = () => {
    if (!content || window.confirm('Replace current content with the template?')) {
      onChange({ ...data, content: template })
    }
  }

  const handleFormChange = (formData) => {
    const built = buildMarkdownFromForm(sectionType, formData)
    onChange({ ...data, form: formData, content: built })
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
        sectionType={sectionType}
        formData={data?.form}
        onFormChange={handleFormChange}
      />
    </div>
  )
}
