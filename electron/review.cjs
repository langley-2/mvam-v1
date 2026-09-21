// CommonJS entry point for Electron; browser and desktop share one review implementation.
exports.callReviewWithKey = async (params) => (await import('./review.mjs')).callReviewWithKey(params)
