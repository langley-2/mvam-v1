import { useEffect, useRef } from 'react'

const LEVEL_DESCRIPTIONS = {
  Junior: 'Covers basics but lacks rationale, tradeoffs, or failure thinking.',
  Senior: 'Articulates decisions with tradeoffs; anticipates some failure modes.',
  Principal: 'Systemic thinking, scale/cost/ops awareness, evolvability considered.',
  Staff: 'Decision-making artefact: precise, complete, onboards teams or survives postmortems.',
}

function ArchieAvatar({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="archie-avatar"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="var(--accent)" />
      {/* 4-pointed sparkle — matches the ✦ on the FAB button */}
      <path
        d="M16 6 L17.6 14.4 L26 16 L17.6 17.6 L16 26 L14.4 17.6 L6 16 L14.4 14.4 Z"
        fill="white"
      />
    </svg>
  )
}

export default function ReviewPanel({ state, sectionLabel, onClose, guided }) {
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Focus the close button when panel opens
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="review-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className="review-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Archie's feedback: ${sectionLabel}`}
      >
        <div className="review-panel-header">
          <div className="review-panel-header-identity">
            <ArchieAvatar size={32} />
            <div>
              <h2 className="review-panel-title">{guided ? 'Archie · interview coach' : 'Archie'}</h2>
              <span className="review-panel-section">{sectionLabel}</span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            className="review-panel-close"
            onClick={onClose}
            aria-label="Close Archie's feedback"
          >
            ×
          </button>
        </div>

        <div className="review-panel-body">
          {state.status === 'loading' && (
            <div className="review-loading" role="status" aria-live="polite" aria-label="Archie is taking a look…">
              <div className="review-spinner" aria-hidden="true" />
              <p>Archie is taking a look at your {sectionLabel}…</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="review-error" role="alert">
              <p className="review-error-message">{state.message}</p>
              <p className="review-error-hint">
                Check your API key in Preferences → API if this persists.
              </p>
            </div>
          )}

          {state.status === 'result' && (
            <div className="review-result">
              {/* Grade row */}
              <div className="review-grade-row">
                <div>
                  <span
                    className={`review-level-badge review-level-badge--${state.data.level.toLowerCase()}`}
                    aria-label={`Engineering level: ${state.data.level}`}
                  >
                    {state.data.level}
                  </span>
                  {!guided && LEVEL_DESCRIPTIONS[state.data.level] && (
                    <p className="review-level-desc">{LEVEL_DESCRIPTIONS[state.data.level]}</p>
                  )}
                </div>
                <div className="review-score" aria-label={`Score: ${state.data.score} out of 10`}>
                  <span className="review-score-number">{state.data.score}</span>
                  <span className="review-score-denom">/10</span>
                </div>
              </div>

              {/* Summary */}
              <section className="review-section" aria-labelledby="review-summary-label">
                <h3 className="review-section-title" id="review-summary-label">Archie's take</h3>
                {/* Plain text — no dangerouslySetInnerHTML, XSS-safe */}
                <p className="review-summary-text">{state.data.summary}</p>
              </section>

              {/* Improvements */}
              <section className="review-section" aria-labelledby="review-improvements-label">
                <h3 className="review-section-title" id="review-improvements-label">
                  Things to work on ({state.data.improvements.length})
                </h3>
                <ol className="review-improvements-list">
                  {state.data.improvements.map((improvement, i) => (
                    <li key={i} className="review-improvement-item">
                      {/* Plain text — XSS-safe React children */}
                      {improvement}
                    </li>
                  ))}
                </ol>
              </section>

              <p className="review-disclaimer">
                Archie is a helpful starting point, not the final word.
                Use your own judgement for your specific context.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
