import { canRunReviewInMainProcess } from '../secureKey.js'
import { callReviewWithKey, ReviewError } from '../../electron/review.mjs'
export { PROVIDERS, ReviewError, buildSectionContent, resolveSectionLabel } from '../../electron/review.mjs'

export async function callReview({ apiKey, signal, ...params }) {
  if (signal?.aborted) throw new DOMException('Review cancelled.', 'AbortError')
  if (!canRunReviewInMainProcess()) return callReviewWithKey({ ...params, apiKey, signal })
  try {
    const result = await window.electronAPI.runReview(params)
    if (signal?.aborted) throw new DOMException('Review cancelled.', 'AbortError')
    return result
  } catch (err) {
    if (signal?.aborted) throw new DOMException('Review cancelled.', 'AbortError')
    const message = String(err.message || 'Review failed.').replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
    throw new ReviewError(err.code || 'IPC', message)
  }
}
