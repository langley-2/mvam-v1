export default function ReviewButton({ onClick, isLoading, isConfigured, guided }) {
  const label = !isConfigured
    ? `${guided ? 'Practise' : 'Analyze'} with Archie (add an API key in Preferences -> API to enable)`
    : isLoading
    ? 'Archie is analyzing...'
    : guided ? 'Practise this section with Archie' : 'Analyze this section with Archie'

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
      title={!isConfigured ? 'Add an API key in Preferences -> API to enable Archie' : undefined}
    >
      {isLoading ? (
        <span className="review-fab-spinner" aria-hidden="true" />
      ) : (
        <span aria-hidden="true">✦</span>
      )}
      <span className="review-fab-label">{isLoading ? 'Analyzing...' : guided ? 'Practise with Archie' : 'Analyze with Archie'}</span>
    </button>
  )
}
