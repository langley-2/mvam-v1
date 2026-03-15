const STORAGE_KEY = 'mvam_builder_v1'
const PREFS_KEY = 'taffy_prefs_v1'

export const loadStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load store:', e)
  }
  return { projects: {} }
}

export const saveStore = (store) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('Storage limit reached. Consider removing large images to free space.')
    }
    console.error('Failed to save store:', e)
  }
}

export const generateId = () => crypto.randomUUID()

// ─── Preferences ───────────────────────────────────────────────────────────────

export const loadPrefs = () => {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load prefs:', e)
  }
  return { templates: {}, customSections: [], theme: 'system' }
}

export const savePrefs = (prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('Failed to save prefs:', e)
  }
}

export const createProjectData = (name) => ({
  id: generateId(),
  name,
  createdAt: new Date().toISOString(),
  versions: {},
})

export const createVersionData = (name) => ({
  id: generateId(),
  name,
  createdAt: new Date().toISOString(),
  requirements: { content: '' },
  architecture: { content: '' },
  scalingCost: { content: '' },
  diagrams: {
    system: {
      title: '',
      osiLayer: null,
      checklist: {},
      components: [],
      imageData: null,
      link: '',
      notes: '',
    },
    c4: {
      title: '',
      osiLayer: null,
      imageData: null,
      link: '',
      notes: '',
    },
    custom: [],
  },
  codeStructure: { content: '' },
  failuresLearnings: {
    content: '',
    proofs: {
      performance: false,
      failure: false,
    },
    raid: {
      risks: '',
      assumptions: '',
      issues: '',
      decisions: '',
    },
  },
  links: {
    items: [],
  },
})

export const downloadMarkdown = (filename, content) => {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Export utilities ──────────────────────────────────────────────────────────

function sanitizeFilename(name) {
  return String(name)
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 64) || 'file'
}

// Safely converts a data:image/... URL to a Uint8Array for binary file writing.
// Returns null if the input is not a valid image data URL.
function dataUrlToBytes(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx === -1) return null
  try {
    const binary = atob(dataUrl.slice(commaIdx + 1))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function dataUrlExt(dataUrl) {
  const m = dataUrl.match(/^data:image\/([a-z+]+);/)
  if (!m) return 'png'
  return m[1] === 'jpeg' ? 'jpg' : m[1] === 'svg+xml' ? 'svg' : m[1]
}

// Reject javascript: and data: URIs to prevent unsafe content in exported files.
function sanitizeLinkUrl(url) {
  if (!url || typeof url !== 'string') return url
  const lower = url.trim().toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:')) return '#'
  return url.trim()
}

// ─── Per-section markdown builders ────────────────────────────────────────────

function buildLinksMarkdown(links) {
  if (!links?.items?.length) return '# Links\n\n_No links added._\n'
  const lines = links.items.map((item) => {
    const label = item.label || 'Link'
    const url = sanitizeLinkUrl(item.url) || ''
    const desc = item.description ? ` — ${item.description}` : ''
    return `- [${label}](${url})${desc}`
  })
  return `# Links\n\n${lines.join('\n')}\n`
}

/**
 * Builds the Diagrams markdown and collects binary image files.
 * Returns { md: string, images: Record<string, Uint8Array> }
 *
 * Kept as a separate pure-ish function so future LLM review code
 * can call it to get structured text + image data per section.
 */
function buildDiagramsMarkdown(diagrams) {
  const images = {}
  if (!diagrams) return { md: '# Diagrams\n\n_No diagrams._\n', images }

  let md = '# Diagrams\n\n'

  // ── System Diagram ──
  const sys = diagrams.system || {}
  md += `## System Diagram\n\n`
  if (sys.title) md += `**Title:** ${sys.title}\n\n`
  if (sys.osiLayer) md += `**OSI Layer:** ${sys.osiLayer}\n\n`
  if (sys.link) md += `**Link:** ${sanitizeLinkUrl(sys.link)}\n\n`
  if (sys.imageData) {
    const bytes = dataUrlToBytes(sys.imageData)
    if (bytes) {
      const imgPath = `images/system-diagram.${dataUrlExt(sys.imageData)}`
      images[imgPath] = bytes
      md += `![System Diagram](${imgPath})\n\n`
    }
  }
  if (sys.notes) md += `${sys.notes}\n\n`

  if (sys.components?.length) {
    md += `### Component Breakdown\n\n`
    for (const c of sys.components) {
      md += `#### ${c.name || 'Component'}\n`
      if (c.what) md += `- What it does: ${c.what}\n`
      if (c.why) md += `- Why it's separate: ${c.why}\n`
      if (c.tech) md += `- Technology: ${c.tech}\n`
      if (c.interfaces) md += `- Interfaces: ${c.interfaces}\n`
      if (c.dataOwnership) md += `- Data ownership: ${c.dataOwnership}\n`
      if (c.scaling) md += `- Scaling: ${c.scaling}\n`
      if (c.failureModes) md += `- Failure modes: ${c.failureModes}\n`
      md += '\n'
    }
  }

  // ── C4 Diagram ──
  const c4 = diagrams.c4 || {}
  md += `## C4 Diagram\n\n`
  if (c4.title) md += `**Title:** ${c4.title}\n\n`
  if (c4.osiLayer) md += `**OSI Layer:** ${c4.osiLayer}\n\n`
  if (c4.link) md += `**Link:** ${sanitizeLinkUrl(c4.link)}\n\n`
  if (c4.imageData) {
    const bytes = dataUrlToBytes(c4.imageData)
    if (bytes) {
      const imgPath = `images/c4-diagram.${dataUrlExt(c4.imageData)}`
      images[imgPath] = bytes
      md += `![C4 Diagram](${imgPath})\n\n`
    }
  }
  if (c4.notes) md += `${c4.notes}\n\n`

  // ── Custom diagrams ──
  if (diagrams.custom?.length) {
    md += `## Additional Diagrams\n\n`
    diagrams.custom.forEach((d, i) => {
      const name = d.name || d.type || `Diagram ${i + 1}`
      md += `### ${name}${d.type && d.name ? ` (${d.type})` : ''}\n\n`
      if (d.osiLayer) md += `**OSI Layer:** ${d.osiLayer}\n\n`
      if (d.link) md += `**Link:** ${sanitizeLinkUrl(d.link)}\n\n`
      if (d.imageData) {
        const bytes = dataUrlToBytes(d.imageData)
        if (bytes) {
          const safeName = sanitizeFilename(name)
          const imgPath = `images/${safeName}-${i}.${dataUrlExt(d.imageData)}`
          images[imgPath] = bytes
          md += `![${name}](${imgPath})\n\n`
        }
      }
      if (d.notes) md += `${d.notes}\n\n`
    })
  }

  return { md, images }
}

/**
 * Builds all files for a project version export.
 * Returns Record<filepath, string | Uint8Array>
 *
 * This is a pure function (no side effects) so it can be reused
 * by future features such as per-section LLM review.
 */
export function buildExportFiles(project, version) {
  const files = {}

  files['01-requirements.md'] = version.requirements?.content || '# Requirements\n\n_No content added._\n'
  files['02-architecture.md'] = version.architecture?.content || '# Architecture\n\n_No content added._\n'
  files['03-scaling-and-cost.md'] = version.scalingCost?.content || '# Scaling & Cost\n\n_No content added._\n'
  files['05-code-structure.md'] = version.codeStructure?.content || '# Code Structure\n\n_No content added._\n'
  files['06-failures-and-learnings.md'] = version.failuresLearnings?.content || '# Failures & Learnings\n\n_No content added._\n'
  files['07-links.md'] = buildLinksMarkdown(version.links)

  const { md: diagramsMd, images: diagramImages } = buildDiagramsMarkdown(version.diagrams)
  files['04-diagrams.md'] = diagramsMd
  Object.assign(files, diagramImages)

  const tocRows = [
    ['Requirements', '01-requirements.md'],
    ['Architecture', '02-architecture.md'],
    ['Scaling & Cost', '03-scaling-and-cost.md'],
    ['Diagrams', '04-diagrams.md'],
    ['Code Structure', '05-code-structure.md'],
    ['Failures & Learnings', '06-failures-and-learnings.md'],
    ['Links', '07-links.md'],
  ]
    .map(([label, file]) => `| ${label} | [${file}](${file}) |`)
    .join('\n')

  files['README.md'] =
    `# ${project.name} — ${version.name}\n\n` +
    `> Generated by Taffy\n\n` +
    `## Table of Contents\n\n` +
    `| Section | File |\n` +
    `|---------|------|\n` +
    `${tocRows}\n`

  return files
}

/**
 * Exports a project version to a user-selected directory using the
 * File System Access API (available in Electron / modern Chromium).
 * Throws AbortError if the user cancels the picker — callers should
 * silently ignore that case.
 */
export async function exportVersionFolder(project, version) {
  if (typeof window.showDirectoryPicker !== 'function') {
    throw new Error(
      'Directory export is not supported in this environment. ' +
        'Try running the app via Electron.'
    )
  }

  const dirHandle = await window.showDirectoryPicker({ startIn: 'documents', mode: 'readwrite' })

  const files = buildExportFiles(project, version)

  for (const [filepath, content] of Object.entries(files)) {
    const parts = filepath.split('/')
    let currentDir = dirHandle

    for (let i = 0; i < parts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(parts[i], { create: true })
    }

    const filename = parts[parts.length - 1]
    const fileHandle = await currentDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  return dirHandle.name
}
