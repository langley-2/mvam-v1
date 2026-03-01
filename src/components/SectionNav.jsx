export default function SectionNav({ sections, selected, onChange, disabled }) {
  return (
    <nav className="section-nav">
      {sections.map((section) => (
        <button
          key={section.id}
          className={`section-tab ${selected === section.id ? 'active' : ''}`}
          onClick={() => onChange(section.id)}
          disabled={disabled}
        >
          {section.short}
        </button>
      ))}
    </nav>
  )
}
