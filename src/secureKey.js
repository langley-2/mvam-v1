/**
 * Secure API key storage.
 *
 * - Electron: uses safeStorage (OS keychain encryption) via IPC — key is
 *   encrypted at rest and never readable by other apps or users.
 * - Browser/dev fallback: dedicated localStorage key, separate from prefs
 *   and never included in project exports.
 *
 * Callers should treat all functions as async even in the browser path.
 */

const FALLBACK_KEY = 'taffy_api_key_v1'

function isElectron() {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'
}

export async function getApiKey() {
  if (isElectron()) {
    try {
      return (await window.electronAPI.getApiKey()) || ''
    } catch {
      return ''
    }
  }
  return localStorage.getItem(FALLBACK_KEY) || ''
}

export async function setApiKey(key) {
  if (isElectron()) {
    try {
      await window.electronAPI.setApiKey(key)
      return
    } catch {
      // Fall through to localStorage if IPC fails unexpectedly
    }
  }
  if (key) {
    localStorage.setItem(FALLBACK_KEY, key)
  } else {
    localStorage.removeItem(FALLBACK_KEY)
  }
}

export async function clearApiKey() {
  if (isElectron()) {
    try {
      await window.electronAPI.clearApiKey()
    } catch {
      // Ignore
    }
  }
  // Always clear fallback too in case of a migration remnant
  localStorage.removeItem(FALLBACK_KEY)
}
