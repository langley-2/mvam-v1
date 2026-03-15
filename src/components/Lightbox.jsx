import { useEffect } from 'react'

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <img
        src={src}
        alt="Enlarged diagram"
        className="lightbox-image"
        onClick={(e) => e.stopPropagation()}
      />
      <button className="lightbox-close" onClick={onClose} aria-label="Close">✕</button>
    </div>
  )
}
