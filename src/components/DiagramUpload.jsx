import { useRef, useState } from 'react'
import Lightbox from './Lightbox'

export default function DiagramUpload({ imageData, link, onImageChange, onLinkChange }) {
  const fileRef = useRef()
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => onImageChange(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleInputChange = (e) => handleFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="diagram-upload">
      <div className="diagram-link-row">
        <input
          type="url"
          className="diagram-link-input"
          placeholder="External diagram link (Excalidraw, Figma, Miro, Lucidchart…)"
          value={link || ''}
          onChange={(e) => onLinkChange(e.target.value)}
        />
        {/^https?:\/\//i.test(link) && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="open-link-btn">
            Open ↗
          </a>
        )}
      </div>

      <div
        className={`diagram-drop-zone ${imageData ? 'has-image' : ''}`}
        onClick={() => !imageData && fileRef.current.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {imageData ? (
          <>
            <img
              src={imageData}
              alt="Diagram"
              className="diagram-preview diagram-preview--zoomable"
              onClick={() => setLightboxOpen(true)}
              title="Click to enlarge"
            />
            <div className="diagram-actions">
              <button className="btn-secondary" onClick={() => fileRef.current.click()}>
                Replace image
              </button>
              <button className="btn-danger-sm" onClick={() => onImageChange(null)}>
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="drop-zone-placeholder">
            <span className="drop-icon">🖼</span>
            <p>Drop an image here or click to upload</p>
            <p className="drop-hint">PNG, JPG, GIF, SVG, WebP supported</p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {lightboxOpen && imageData && (
        <Lightbox src={imageData} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}
