const STORAGE_KEY = 'mvam_builder_v1'

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
  systemDiagram: {
    checklist: {},
    components: [],
    imageData: null,
    link: '',
    notes: '',
  },
  sequenceDiagram: {
    flows: [],
  },
  otherDiagrams: {
    diagrams: [],
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
