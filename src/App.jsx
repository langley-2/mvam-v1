import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import SectionNav from './components/SectionNav'
import Preferences from './components/Preferences'
import ReviewButton from './components/ReviewButton'
import ReviewPanel from './components/ReviewPanel'
import GuidedPrompt from './components/GuidedPrompt'
import Overview from './sections/Overview'
import MarkdownSection from './sections/MarkdownSection'
import Diagrams from './sections/Diagrams'
import Decisions from './sections/Decisions'
import RaidLog from './sections/RaidLog'
import LearningsProof from './sections/LearningsProof'
import Links from './sections/Links'
import { loadStore, saveStore, createProjectData, createVersionData, exportVersionFolder, loadPrefs, savePrefs } from './storage'
import { canRunReviewInMainProcess, clearApiKey, loadApiKeyState, setApiKey } from './secureKey'
import { SECTION_TEMPLATES } from './templates'
import { callReview, resolveSectionLabel } from './api/review'
import { analyzeRepository, chooseRepositoryDirectory } from './api/repositoryAnalysis'
import { applyRepositoryDraft, hasExistingSectionContent, upsertRepositoryReference } from './repositoryDraft'

const BASE_SECTIONS = [
  { id: 'overview', label: 'Overview', short: 'Overview' },
  { id: 'requirements', label: '1. Requirements', short: 'Requirements' },
  { id: 'architecture', label: '2. System Design', short: 'System Design' },
  { id: 'decisions', label: '3. Decisions', short: 'Decisions' },
  { id: 'scalingCost', label: '4. Scaling & Economics', short: 'Scaling & Economics' },
  { id: 'diagrams', label: '5. System Diagrams & Components', short: 'Diagrams & Components' },
  { id: 'codeStructure', label: '6. Implementation Structure', short: 'Implementation' },
  { id: 'raidLog', label: '7. RAID Log', short: 'RAID Log' },
  { id: 'learningsProof', label: '8. Learnings & Proof', short: 'Learnings & Proof' },
  { id: 'links', label: '9. References', short: 'References' },
]

function slugify(label) {
  return label.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 48) || 'section'
}

export default function App() {
  const [store, setStore] = useState(() => loadStore())
  const [prefs, setPrefs] = useState(() => loadPrefs())
  const [apiKey, setApiKeyState] = useState('')
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [selectedSection, setSelectedSection] = useState('overview')
  const [showPreferences, setShowPreferences] = useState(false)
  const [reviewState, setReviewState] = useState(null)
  const [repoAnalysisState, setRepoAnalysisState] = useState(null)
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

  // Load API key status on mount. Electron never returns the key to the renderer.
  useEffect(() => {
    const legacyKey = prefs.apiConfig?.key?.trim()
    loadApiKeyState().then(async ({ configured, key }) => {
      let nextConfigured = configured
      let nextKey = key

      if (!nextConfigured && legacyKey) {
        try {
          nextConfigured = await setApiKey(legacyKey)
          nextKey = legacyKey
          setPrefs((prev) => {
            const { key: _legacyKey, ...apiConfig } = prev.apiConfig || {}
            return { ...prev, apiConfig }
          })
        } catch {
          nextConfigured = false
        }
      }

      setApiKeyConfigured(nextConfigured)
      if (nextKey && !canRunReviewInMainProcess()) setApiKeyState(nextKey)
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
  }, [selectedSection, selectedProjectId, selectedVersionId, showPreferences, currentProject?.guided, currentProject?.interviewContext])

  useEffect(() => {
    setRepoAnalysisState(null)
  }, [selectedProjectId, selectedVersionId])

  const handleReview = useCallback(async () => {
    if (!currentVersion || !selectedSection) return

    // Abort any previous in-flight request
    if (reviewAbortRef.current) reviewAbortRef.current.abort()
    const controller = new AbortController()
    reviewAbortRef.current = controller

    setReviewState({ status: 'loading' })

    const apiConfig = prefs.apiConfig || {}
    // raidLog and learningsProof both live in failuresLearnings data
    const SECTION_DATA_MAP = { raidLog: 'raidAndLearnings', learningsProof: 'raidAndLearnings' }
    const dataSectionId = SECTION_DATA_MAP[selectedSection] || selectedSection
    try {
      const result = await callReview({
        apiKey,
        model: apiConfig.model,
        provider: apiConfig.provider || 'openai',
        sectionId: selectedSection,
        sectionData: currentVersion[dataSectionId],
        customSections: prefs.customSections || [],
        guided: currentProject?.guided === true,
        interviewContext: currentProject?.guided ? currentProject.interviewContext : '',
        signal: controller.signal,
      })
      // Only update if this request wasn't cancelled
      if (!controller.signal.aborted) {
        setReviewState({ status: 'result', data: result })
        const sectionLabel = resolveSectionLabel(selectedSection, prefs.customSections || [])
        setStore((prev) => {
          if (!selectedProjectId || !selectedVersionId) return prev
          const project = prev.projects[selectedProjectId]
          const version = project?.versions[selectedVersionId]
          if (!project || !version) return prev
          return {
            ...prev,
            projects: {
              ...prev.projects,
              [selectedProjectId]: {
                ...project,
                versions: {
                  ...project.versions,
                  [selectedVersionId]: {
                    ...version,
                    repoAnalysis: {
                      ...(version.repoAnalysis || {}),
                      archieScores: {
                        ...(version.repoAnalysis?.archieScores || {}),
                        [selectedSection]: {
                          sectionId: selectedSection,
                          sectionLabel,
                          level: result.level,
                          score: result.score,
                          summary: result.summary,
                          mode: currentProject?.guided ? 'guided' : 'standard',
                          reviewedAt: new Date().toISOString(),
                        },
                      },
                    },
                  },
                },
              },
            },
          }
        })
      }
    } catch (err) {
      if (err.name === 'AbortError') return // Silently ignore cancellations
      if (!controller.signal.aborted) {
        setReviewState({ status: 'error', message: err.message || 'Review failed.' })
      }
    }
  }, [currentProject, currentVersion, selectedSection, prefs, apiKey, selectedProjectId, selectedVersionId])

  // Effective templates: user overrides take precedence over defaults
  const effectiveTemplates = { ...SECTION_TEMPLATES, ...prefs.templates }

  // Build dynamic sections list (base + custom)
  const customSections = prefs.customSections || []
  const isApiConfigured = apiKeyConfigured
  const numberedSectionCount = BASE_SECTIONS.filter((section) => section.id !== 'overview').length
  const sections = [
    ...BASE_SECTIONS,
    ...customSections.map((s, i) => ({
      id: s.id,
      label: `${numberedSectionCount + i + 1}. ${s.label}`,
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

  const updateCurrentVersion = useCallback(
    (updater) => {
      if (!selectedProjectId || !selectedVersionId) return
      setStore((prev) => {
        const project = prev.projects[selectedProjectId]
        const version = project?.versions[selectedVersionId]
        if (!project || !version) return prev
        const nextVersion = typeof updater === 'function' ? updater(version) : { ...version, ...updater }
        return {
          ...prev,
          projects: {
            ...prev.projects,
            [selectedProjectId]: {
              ...project,
              versions: {
                ...project.versions,
                [selectedVersionId]: nextVersion,
              },
            },
          },
        }
      })
    },
    [selectedProjectId, selectedVersionId]
  )

  const handleChooseRepository = useCallback(async () => {
    try {
      const source = await chooseRepositoryDirectory()
      if (source) setRepoAnalysisState({ status: 'idle', source })
      return source
    } catch (err) {
      setRepoAnalysisState({ status: 'error', message: err.message || 'Could not choose repository.' })
      return null
    }
  }, [])

  const handleAnalyzeRepository = useCallback(
    async (source, analysisOptions = {}) => {
      if (!source || !currentVersion) return
      const apiConfig = prefs.apiConfig || {}
      const normalizedSource =
        source.type === 'remote'
          ? { type: 'remote', url: source.url }
          : { type: 'local', path: source.path, displayName: source.displayName }

      setRepoAnalysisState({
        status: 'loading',
        source: normalizedSource,
        message: 'Indexing repository and generating section drafts...',
      })

      try {
        const draft = await analyzeRepository({
          source: normalizedSource,
          provider: apiConfig.provider || 'openai',
          model: apiConfig.model,
          options: analysisOptions,
        })
        const sourceFromDraft = draft.metadata?.source || normalizedSource
        updateCurrentVersion((version) => {
          const withReference = upsertRepositoryReference(version, draft)
          return {
            ...withReference,
            repoAnalysis: {
              ...(withReference.repoAnalysis || {}),
              source: sourceFromDraft,
              draft,
              lastRun: {
                id: draft.id,
                createdAt: draft.createdAt,
                commitSha: draft.metadata?.commitSha,
                branch: draft.metadata?.branch,
                selectedFileCount: draft.metadata?.selectedFileCount,
                fileCount: draft.metadata?.fileCount,
                options: analysisOptions,
              },
            },
          }
        })
        setRepoAnalysisState({
          status: 'result',
          source: sourceFromDraft,
          message: 'Repository draft generated.',
        })
      } catch (err) {
        setRepoAnalysisState({
          status: 'error',
          source: normalizedSource,
          message: err.message || 'Repository analysis failed.',
        })
      }
    },
    [currentVersion, prefs.apiConfig, updateCurrentVersion]
  )

  const handleApplyRepositoryDraft = useCallback(
    (sectionIds) => {
      const draft = currentVersion?.repoAnalysis?.draft
      if (!currentVersion || !draft || !sectionIds?.length) return

      const overwrites = sectionIds.filter((sectionId) => hasExistingSectionContent(currentVersion, sectionId))
      if (
        overwrites.length > 0 &&
        !window.confirm('Apply generated content and replace existing content in the selected section(s)?')
      ) {
        return
      }

      updateCurrentVersion((version) => applyRepositoryDraft(version, draft, sectionIds))
    },
    [currentVersion, updateCurrentVersion]
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
          <img className="empty-icon" src="./favicon.svg" width="80" height="80" alt="" />
          <h2>Select a project and version to get started</h2>
          <p>Create a project in the sidebar, then add a version (e.g. v1) to begin building your architecture template.</p>
        </div>
      )
    }

    switch (selectedSection) {
      case 'overview':
        return (
          <Overview
            project={currentProject}
            onProjectChange={(changes) => setStore((prev) => ({
              ...prev,
              projects: { ...prev.projects, [selectedProjectId]: { ...prev.projects[selectedProjectId], ...changes } },
            }))}
            version={currentVersion}
            isApiConfigured={isApiConfigured}
            analysisState={repoAnalysisState}
            onChooseLocalRepository={handleChooseRepository}
            onAnalyzeRepository={handleAnalyzeRepository}
            onApplyDraft={handleApplyRepositoryDraft}
          />
        )
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
            title="System Design"
            sectionType="architecture"
            data={currentVersion.architecture}
            template={effectiveTemplates.architecture}
            filename="architecture.md"
            onChange={(data) => updateSection('architecture', data)}
          />
        )
      case 'decisions':
        return (
          <Decisions
            data={currentVersion.decisions}
            onChange={(data) => updateSection('decisions', data)}
          />
        )
      case 'scalingCost':
        return (
          <MarkdownSection
            title="Scaling & Economics"
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
            title="Implementation Structure"
            sectionType="codeStructure"
            data={currentVersion.codeStructure}
            template={effectiveTemplates.codeStructure}
            filename="code-structure.md"
            onChange={(data) => updateSection('codeStructure', data)}
          />
        )
      case 'raidLog':
        return (
          <RaidLog
            data={currentVersion.raidAndLearnings}
            onChange={(data) => updateSection('raidAndLearnings', data)}
          />
        )
      case 'learningsProof':
        return (
          <LearningsProof
            data={currentVersion.raidAndLearnings}
            onChange={(data) => updateSection('raidAndLearnings', data)}
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
          setSelectedSection('overview')
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
              isApiKeyConfigured={apiKeyConfigured}
              onKeySave={async (key) => {
                const configured = await setApiKey(key)
                setApiKeyState(canRunReviewInMainProcess() ? '' : key)
                setApiKeyConfigured(configured)
              }}
              onKeyClear={async () => {
                await clearApiKey()
                setApiKeyState('')
                setApiKeyConfigured(false)
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
            <div className="section-content" id="main-content">
              {currentVersion && currentProject?.guided && selectedSection !== 'overview' && (
                <GuidedPrompt sectionId={selectedSection} onNext={() => {
                  const index = sections.findIndex((section) => section.id === selectedSection)
                  setSelectedSection(sections[index + 1]?.id || 'overview')
                }} />
              )}
              {renderSection()}
            </div>
            {currentVersion && selectedSection !== 'overview' && (
              <ReviewButton
                guided={currentProject?.guided === true}
                onClick={handleReview}
                isLoading={reviewState?.status === 'loading'}
                isConfigured={isApiConfigured}
              />
            )}
            {reviewState && currentVersion && selectedSection !== 'overview' && (
              <ReviewPanel
                guided={currentProject?.guided === true}
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
