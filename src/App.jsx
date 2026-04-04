import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import SectionNav from './components/SectionNav'
import Preferences from './components/Preferences'
import ReviewButton from './components/ReviewButton'
import ReviewPanel from './components/ReviewPanel'
import MarkdownSection from './sections/MarkdownSection'
import Diagrams from './sections/Diagrams'
import FailuresLearnings from './sections/FailuresLearnings'
import Links from './sections/Links'
import { loadStore, saveStore, createProjectData, createVersionData, exportVersionFolder, loadPrefs, savePrefs } from './storage'
import { getApiKey, setApiKey } from './secureKey'
import { SECTION_TEMPLATES } from './templates'
import { callReview, resolveSectionLabel } from './api/review'

const BASE_SECTIONS = [
  { id: 'requirements', label: '1. Requirements', short: 'Requirements' },
  { id: 'architecture', label: '2. Architecture', short: 'Architecture' },
  { id: 'scalingCost', label: '3. Scaling & Cost', short: 'Scaling & Cost' },
  { id: 'diagrams', label: '4. Diagrams', short: 'Diagrams' },
  { id: 'codeStructure', label: '5. Code Structure', short: 'Code Structure' },
  { id: 'failuresLearnings', label: '6. Failures & Learnings', short: 'Failures & Learnings' },
  { id: 'links', label: '7. Links', short: 'Links' },
]

function slugify(label) {
  return label.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 48) || 'section'
}

export default function App() {
  const [store, setStore] = useState(() => loadStore())
  const [prefs, setPrefs] = useState(() => loadPrefs())
  const [apiKey, setApiKeyState] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [selectedSection, setSelectedSection] = useState('requirements')
  const [showPreferences, setShowPreferences] = useState(false)
  const [reviewState, setReviewState] = useState(null)
  // reviewState: null | { status: 'loading' } | { status: 'result', data } | { status: 'error', message }
  const reviewAbortRef = useRef(null) // AbortController for in-flight review requests

  // Apply theme to <html> element so CSS variables cascade everywhere
  useEffect(() => {
    const theme = prefs.theme || 'system'
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [prefs.theme])

  // Load API key from secure storage on mount; migrate legacy key from prefs if present
  useEffect(() => {
    getApiKey().then((key) => {
      if (key) {
        setApiKeyState(key)
      } else {
        // Migration: key was previously stored in prefs.apiConfig.key (plain localStorage)
        const legacyKey = loadPrefs().apiConfig?.key?.trim()
        if (legacyKey) {
          setApiKey(legacyKey).then(() => setApiKeyState(legacyKey))
          // savePrefs will strip the key going forward, so just trigger a re-save
          setPrefs((p) => ({ ...p }))
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    saveStore(store)
  }, [store])

  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

  // Derive current project/version early so handleReview can reference them in its deps
  const currentProject = selectedProjectId ? store.projects[selectedProjectId] : null
  const currentVersion =
    currentProject && selectedVersionId ? currentProject.versions[selectedVersionId] : null

  // Reset review panel (and abort any in-flight request) when section/version changes
  useEffect(() => {
    if (reviewAbortRef.current) {
      reviewAbortRef.current.abort()
      reviewAbortRef.current = null
    }
    setReviewState(null)
  }, [selectedSection, selectedVersionId, showPreferences])

  const handleReview = useCallback(async () => {
    if (!currentVersion || !selectedSection) return

    // Abort any previous in-flight request
    if (reviewAbortRef.current) reviewAbortRef.current.abort()
    const controller = new AbortController()
    reviewAbortRef.current = controller

    setReviewState({ status: 'loading' })

    const apiConfig = prefs.apiConfig || {}
    try {
      const result = await callReview({
        apiKey,
        model: apiConfig.model,
        provider: apiConfig.provider || 'openai',
        sectionId: selectedSection,
        sectionData: currentVersion[selectedSection],
        customSections: prefs.customSections || [],
        signal: controller.signal,
      })
      // Only update if this request wasn't cancelled
      if (!controller.signal.aborted) {
        setReviewState({ status: 'result', data: result })
      }
    } catch (err) {
      if (err.name === 'AbortError') return // Silently ignore cancellations
      if (!controller.signal.aborted) {
        setReviewState({ status: 'error', message: err.message || 'Review failed.' })
      }
    }
  }, [currentVersion, selectedSection, prefs, apiKey])

  // Effective templates: user overrides take precedence over defaults
  const effectiveTemplates = { ...SECTION_TEMPLATES, ...prefs.templates }

  // Build dynamic sections list (base + custom)
  const customSections = prefs.customSections || []
  const isApiConfigured = !!apiKey.trim()
  const sections = [
    ...BASE_SECTIONS,
    ...customSections.map((s, i) => ({
      id: s.id,
      label: `${BASE_SECTIONS.length + i + 1}. ${s.label}`,
      short: s.label,
    })),
  ]

  const handlePrefsChange = (updatedPrefs) => {
    setPrefs(updatedPrefs)
  }

  const handleCreateProject = (name) => {
    const project = createProjectData(name)
    setStore((prev) => ({
      ...prev,
      projects: { ...prev.projects, [project.id]: project },
    }))
    setSelectedProjectId(project.id)
    setSelectedVersionId(null)
  }

  const handleDeleteProject = (projectId) => {
    setStore((prev) => {
      const next = { ...prev, projects: { ...prev.projects } }
      delete next.projects[projectId]
      return next
    })
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null)
      setSelectedVersionId(null)
    }
  }

  const handleRenameProject = (projectId, newName) => {
    setStore((prev) => ({
      ...prev,
      projects: {
        ...prev.projects,
        [projectId]: { ...prev.projects[projectId], name: newName },
      },
    }))
  }

  const handleCreateVersion = (projectId, name) => {
    const version = createVersionData(name)
    setStore((prev) => ({
      ...prev,
      projects: {
        ...prev.projects,
        [projectId]: {
          ...prev.projects[projectId],
          versions: { ...prev.projects[projectId].versions, [version.id]: version },
        },
      },
    }))
    setSelectedProjectId(projectId)
    setSelectedVersionId(version.id)
  }

  const handleDeleteVersion = (projectId, versionId) => {
    setStore((prev) => {
      const next = {
        ...prev,
        projects: {
          ...prev.projects,
          [projectId]: {
            ...prev.projects[projectId],
            versions: { ...prev.projects[projectId].versions },
          },
        },
      }
      delete next.projects[projectId].versions[versionId]
      return next
    })
    if (selectedVersionId === versionId) {
      setSelectedVersionId(null)
    }
  }

  const updateSection = useCallback(
    (sectionId, data) => {
      if (!selectedProjectId || !selectedVersionId) return
      setStore((prev) => ({
        ...prev,
        projects: {
          ...prev.projects,
          [selectedProjectId]: {
            ...prev.projects[selectedProjectId],
            versions: {
              ...prev.projects[selectedProjectId].versions,
              [selectedVersionId]: {
                ...prev.projects[selectedProjectId].versions[selectedVersionId],
                [sectionId]: data,
              },
            },
          },
        },
      }))
    },
    [selectedProjectId, selectedVersionId]
  )

  const handleExportVersion = async (projectId, versionId) => {
    const project = store.projects[projectId]
    const version = project?.versions[versionId]
    if (!project || !version) return
    try {
      const dirName = await exportVersionFolder(project, version)
      alert(`Exported "${version.name}" to: ${dirName}`)
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert(`Export failed: ${err.message}`)
      }
    }
  }

  const renderSection = () => {
    if (!currentVersion) {
      return (
        <div className="empty-state" role="status">
          <div className="empty-icon" aria-hidden="true">🍬</div>
          <h2>Select a project and version to get started</h2>
          <p>Create a project in the sidebar, then add a version (e.g. v1) to begin building your architecture template.</p>
        </div>
      )
    }

    switch (selectedSection) {
      case 'requirements':
        return (
          <MarkdownSection
            title="Requirements"
            sectionType="requirements"
            data={currentVersion.requirements}
            template={effectiveTemplates.requirements}
            filename="requirements.md"
            onChange={(data) => updateSection('requirements', data)}
          />
        )
      case 'architecture':
        return (
          <MarkdownSection
            title="Architecture"
            sectionType="architecture"
            data={currentVersion.architecture}
            template={effectiveTemplates.architecture}
            filename="architecture.md"
            onChange={(data) => updateSection('architecture', data)}
          />
        )
      case 'scalingCost':
        return (
          <MarkdownSection
            title="Scaling & Cost"
            sectionType="scalingCost"
            data={currentVersion.scalingCost}
            template={effectiveTemplates.scalingCost}
            filename="scaling-and-cost.md"
            onChange={(data) => updateSection('scalingCost', data)}
          />
        )
      case 'diagrams':
        return (
          <Diagrams
            data={currentVersion.diagrams}
            onChange={(data) => updateSection('diagrams', data)}
          />
        )
      case 'codeStructure':
        return (
          <MarkdownSection
            title="Code Structure"
            sectionType="codeStructure"
            data={currentVersion.codeStructure}
            template={effectiveTemplates.codeStructure}
            filename="code-structure.md"
            onChange={(data) => updateSection('codeStructure', data)}
          />
        )
      case 'failuresLearnings':
        return (
          <FailuresLearnings
            data={currentVersion.failuresLearnings}
            onChange={(data) => updateSection('failuresLearnings', data)}
          />
        )
      case 'links':
        return (
          <Links
            data={currentVersion.links}
            onChange={(data) => updateSection('links', data)}
          />
        )
      default: {
        // Custom section
        const customSection = customSections.find((s) => s.id === selectedSection)
        if (customSection) {
          return (
            <MarkdownSection
              title={customSection.label}
              sectionType={selectedSection}
              data={currentVersion[selectedSection] || { content: '' }}
              template={customSection.template || `# ${customSection.label}\n\n`}
              filename={`${slugify(customSection.label)}.md`}
              onChange={(data) => updateSection(selectedSection, data)}
            />
          )
        }
        return null
      }
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        store={store}
        selectedProjectId={selectedProjectId}
        selectedVersionId={selectedVersionId}
        onSelectProject={(id) => {
          setSelectedProjectId(id)
          setSelectedVersionId(null)
          setShowPreferences(false)
        }}
        onSelectVersion={(projectId, versionId) => {
          setSelectedProjectId(projectId)
          setSelectedVersionId(versionId)
          setSelectedSection('requirements')
          setShowPreferences(false)
        }}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onCreateVersion={handleCreateVersion}
        onDeleteVersion={handleDeleteVersion}
        onExportVersion={handleExportVersion}
        onOpenPreferences={() => setShowPreferences((v) => !v)}
        prefsOpen={showPreferences}
      />
      <main className="main-area">
        {showPreferences ? (
          <Preferences
              prefs={prefs}
              onChange={handlePrefsChange}
              apiKey={apiKey}
              onKeyChange={(key) => {
                setApiKeyState(key)
                setApiKey(key)
              }}
            />
        ) : (
          <>
            <SectionNav
              sections={sections}
              selected={selectedSection}
              onChange={setSelectedSection}
              disabled={!currentVersion}
            />
            <div className="section-content" id="main-content">{renderSection()}</div>
            {currentVersion && (
              <ReviewButton
                onClick={handleReview}
                isLoading={reviewState?.status === 'loading'}
                isConfigured={isApiConfigured}
              />
            )}
            {reviewState && currentVersion && (
              <ReviewPanel
                state={reviewState}
                sectionLabel={resolveSectionLabel(selectedSection, customSections)}
                onClose={() => setReviewState(null)}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
