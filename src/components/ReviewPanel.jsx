import { useEffect, useRef } from 'react'

const LEVEL_DESCRIPTIONS = {
  Junior: 'Covers basics but lacks rationale, tradeoffs, or failure thinking.',
  Senior: 'Articulates decisions with tradeoffs; anticipates some failure modes.',
  Principal: 'Systemic thinking, scale/cost/ops awareness, evolvability considered.',
  Staff: 'Decision-making artefact: precise, complete, onboards teams or survives postmortems.',
}

export default function ReviewPanel({ state, sectionLabel, onClose }) {
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
        aria-label={`AI review: ${sectionLabel}`}
      >
        <div className="review-panel-header">
          <div>
            <h2 className="review-panel-title">AI Review</h2>
            <span className="review-panel-section">{sectionLabel}</span>
          </div>
          <button
            ref={closeButtonRef}
            className="review-panel-close"
            onClick={onClose}
            aria-label="Close review panel"
          >
            ×
          </button>
        </div>

        <div className="review-panel-body">
          {state.status === 'loading' && (
            <div className="review-loading" role="status" aria-live="polite" aria-label="Reviewing…">
              <div className="review-spinner" aria-hidden="true" />
              <p>Reviewing your {sectionLabel} section…</p>
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
                  {LEVEL_DESCRIPTIONS[state.data.level] && (
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
                <h3 className="review-section-title" id="review-summary-label">Summary</h3>
                {/* Plain text — no dangerouslySetInnerHTML, XSS-safe */}
                <p className="review-summary-text">{state.data.summary}</p>
              </section>

              {/* Improvements */}
              <section className="review-section" aria-labelledby="review-improvements-label">
                <h3 className="review-section-title" id="review-improvements-label">
                  Improvements ({state.data.improvements.length})
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
                AI reviews are a starting point, not a definitive assessment.
                Verify suggestions against your specific context.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
