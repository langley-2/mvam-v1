import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import SectionNav from './components/SectionNav'
import MarkdownSection from './sections/MarkdownSection'
import SystemDiagram from './sections/SystemDiagram'
import SequenceDiagram from './sections/SequenceDiagram'
import OtherDiagrams from './sections/OtherDiagrams'
import FailuresLearnings from './sections/FailuresLearnings'
import Links from './sections/Links'
import { loadStore, saveStore, createProjectData, createVersionData } from './storage'
import { SECTION_TEMPLATES } from './templates'

const SECTIONS = [
  { id: 'requirements', label: '1. Requirements', short: 'Requirements', filename: 'requirements.md' },
  { id: 'architecture', label: '2. Architecture', short: 'Architecture', filename: 'architecture.md' },
  { id: 'scalingCost', label: '3. Scaling & Cost', short: 'Scaling & Cost', filename: 'scaling-and-cost.md' },
  { id: 'systemDiagram', label: '4. System Diagram', short: 'System Diagram' },
  { id: 'sequenceDiagram', label: '5. Sequence Diagram', short: 'Sequence Diagram' },
  { id: 'otherDiagrams', label: '6. Other Diagrams', short: 'Other Diagrams' },
  { id: 'codeStructure', label: '7. Code Structure', short: 'Code Structure', filename: 'code-structure.md' },
  { id: 'failuresLearnings', label: '8. Failures & Learnings', short: 'Failures & Learnings', filename: 'failures-and-learnings.md' },
  { id: 'links', label: '9. Links', short: 'Links' },
]

export default function App() {
  const [store, setStore] = useState(() => loadStore())
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedVersionId, setSelectedVersionId] = useState(null)
  const [selectedSection, setSelectedSection] = useState('requirements')

  useEffect(() => {
    saveStore(store)
  }, [store])

  const currentProject = selectedProjectId ? store.projects[selectedProjectId] : null
  const currentVersion =
    currentProject && selectedVersionId ? currentProject.versions[selectedVersionId] : null

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

  const renderSection = () => {
    if (!currentVersion) {
      return (
        <div className="empty-state">
          <div className="empty-icon">⬡</div>
          <h2>Select a project and version to get started</h2>
          <p>Create a project in the sidebar, then add a version (e.g. v1) to begin filling out your MVAM template.</p>
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
            template={SECTION_TEMPLATES.requirements}
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
            template={SECTION_TEMPLATES.architecture}
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
            template={SECTION_TEMPLATES.scalingCost}
            filename="scaling-and-cost.md"
            onChange={(data) => updateSection('scalingCost', data)}
          />
        )
      case 'systemDiagram':
        return (
          <SystemDiagram
            data={currentVersion.systemDiagram}
            onChange={(data) => updateSection('systemDiagram', data)}
          />
        )
      case 'sequenceDiagram':
        return (
          <SequenceDiagram
            data={currentVersion.sequenceDiagram}
            onChange={(data) => updateSection('sequenceDiagram', data)}
          />
        )
      case 'otherDiagrams':
        return (
          <OtherDiagrams
            data={currentVersion.otherDiagrams}
            onChange={(data) => updateSection('otherDiagrams', data)}
          />
        )
      case 'codeStructure':
        return (
          <MarkdownSection
            title="Code Structure"
            sectionType="codeStructure"
            data={currentVersion.codeStructure}
            template={SECTION_TEMPLATES.codeStructure}
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
      default:
        return null
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
        }}
        onSelectVersion={(projectId, versionId) => {
          setSelectedProjectId(projectId)
          setSelectedVersionId(versionId)
          setSelectedSection('requirements')
        }}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onCreateVersion={handleCreateVersion}
        onDeleteVersion={handleDeleteVersion}
      />
      <div className="main-area">
        <SectionNav
          sections={SECTIONS}
          selected={selectedSection}
          onChange={setSelectedSection}
          disabled={!currentVersion}
        />
        <div className="section-content">{renderSection()}</div>
      </div>
    </div>
  )
}
