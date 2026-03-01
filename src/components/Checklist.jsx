export default function Checklist({ items, values, onChange }) {
  const toggle = (id) => {
    onChange({ ...values, [id]: !values[id] })
  }

  const allChecked = items.every((item) => !!values[item.id])
  const checkedCount = items.filter((item) => !!values[item.id]).length

  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          color: allChecked ? 'var(--accent)' : 'var(--text-tertiary)',
          marginBottom: '10px',
          fontWeight: 600,
        }}
      >
        {checkedCount}/{items.length} complete
      </div>
      <div className="checklist">
        {items.map((item) => (
          <label key={item.id} className="checklist-item">
            <input
              type="checkbox"
              checked={!!values[item.id]}
              onChange={() => toggle(item.id)}
            />
            <span style={{ textDecoration: values[item.id] ? 'line-through' : 'none', opacity: values[item.id] ? 0.5 : 1 }}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
