export default function ReviewButton({ onClick, isLoading, isConfigured }) {
  const label = !isConfigured
    ? 'AI review (add an API key in Preferences → API to enable)'
    : isLoading
    ? 'Reviewing…'
    : 'Request AI review of this section'

  return (
    <button
      className={[
        'review-fab',
        isLoading ? 'review-fab--loading' : '',
        !isConfigured ? 'review-fab--unconfigured' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={isLoading || !isConfigured}
      aria-label={label}
      title={!isConfigured ? 'Add an API key in Preferences → API to enable AI review' : undefined}
    >
      {isLoading ? (
        <span className="review-fab-spinner" aria-hidden="true" />
      ) : (
        <span aria-hidden="true">✦</span>
      )}
      <span className="review-fab-label">{isLoading ? 'Reviewing…' : 'Review'}</span>
    </button>
  )
}
