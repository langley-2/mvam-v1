export function canAnalyzeRepositories() {
  return typeof window !== 'undefined' && !!window.electronAPI?.analyzeRepository
}

function cleanIpcErrorMessage(message) {
  return String(message || 'Repository analysis failed.')
    .replace(/^Error invoking remote method '[^']+': Error: /, '')
    .replace(/^Error invoking remote method "[^"]+": Error: /, '')
}

export async function chooseRepositoryDirectory() {
  if (!window.electronAPI?.chooseRepositoryDirectory) {
    throw new Error('Repository folder selection is only available in the desktop app.')
  }
  return window.electronAPI.chooseRepositoryDirectory()
}

export async function analyzeRepository({ source, provider = 'openai', model, options }) {
  if (!window.electronAPI?.analyzeRepository) {
    throw new Error('Repository analysis is only available in the desktop app.')
  }

  try {
    return await window.electronAPI.analyzeRepository({ source, provider, model, options })
  } catch (err) {
    const wrapped = new Error(cleanIpcErrorMessage(err.message))
    wrapped.code = err.code || 'IPC'
    throw wrapped
  }
}
