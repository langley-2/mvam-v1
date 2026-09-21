/**
 * Secure API key storage.
 *
 * - Electron: uses safeStorage (OS keychain encryption) via IPC. The key is
 *   never returned to the renderer; provider requests run in the main process.
 * - Browser/dev fallback: memory only; cleared on page reload and never included in exports.
 *
 * Callers should treat all functions as async even in the browser path.
 */

const FALLBACK_KEY = 'taffy_api_key_v1'
let sessionKey = ''

function isElectron() {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'
}

export async function loadApiKeyState() {
  localStorage.removeItem(FALLBACK_KEY)
  if (isElectron()) {
    try {
      return { configured: !!(await window.electronAPI.hasApiKey()), key: '' }
    } catch {
      return { configured: false, key: '' }
    }
  }
  localStorage.removeItem(FALLBACK_KEY)
  return { configured: !!sessionKey, key: sessionKey }
}

export async function setApiKey(key) {
  if (isElectron()) {
    await window.electronAPI.setApiKey(key)
    return !!String(key || '').trim()
  }
  sessionKey = String(key || '').trim()
  localStorage.removeItem(FALLBACK_KEY)
  return !!key
}

export async function clearApiKey() {
  if (isElectron()) {
    try {
      await window.electronAPI.clearApiKey()
    } catch {
      throw new Error('Could not remove the stored API key. Please try again.')
    }
  }
  sessionKey = ''
  // Always clear fallback too in case of a migration remnant
  localStorage.removeItem(FALLBACK_KEY)
  return true
}

export function canRunReviewInMainProcess() {
  return isElectron() && typeof window.electronAPI.runReview === 'function'
}
