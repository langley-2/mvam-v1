export default function SectionNav({ sections, selected, onChange, disabled }) {
  return (
    <nav className="section-nav" aria-label="Section navigation">
      {sections.map((section) => (
        <button
          key={section.id}
          className={`section-tab ${selected === section.id ? 'active' : ''}`}
          onClick={() => onChange(section.id)}
          disabled={disabled}
          aria-current={selected === section.id ? 'page' : undefined}
        >
          {section.short}
        </button>
      ))}
    </nav>
  )
}
