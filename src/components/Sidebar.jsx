import { useState, useEffect, useRef } from 'react'

export default function Sidebar({
  store,
  selectedProjectId,
  selectedVersionId,
  onSelectProject,
  onSelectVersion,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onCreateVersion,
  onDeleteVersion,
  onExportVersion,
  onOpenPreferences,
  prefsOpen,
}) {
  const [expandedProjects, setExpandedProjects] = useState({})
  const [newProjectName, setNewProjectName] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [newVersionName, setNewVersionName] = useState('')
  const [showNewVersionFor, setShowNewVersionFor] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [editName, setEditName] = useState('')
  const [openMenuFor, setOpenMenuFor] = useState(null) // projectId of open options menu
  const menuRef = useRef(null)

  const projects = Object.values(store.projects).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  // Close the options menu when clicking outside it
  useEffect(() => {
    if (!openMenuFor) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuFor(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuFor])

  const toggleProject = (projectId) => {
    setExpandedProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }))
  }

  const handleCreateProject = (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    onCreateProject(newProjectName.trim())
    setNewProjectName('')
    setShowNewProject(false)
  }

  const handleCreateVersion = (e, projectId) => {
    e.preventDefault()
    if (!newVersionName.trim()) return
    onCreateVersion(projectId, newVersionName.trim())
    setNewVersionName('')
    setShowNewVersionFor(null)
    setExpandedProjects((prev) => ({ ...prev, [projectId]: true }))
  }

  const handleStartRename = (project) => {
    setEditingProject(project.id)
    setEditName(project.name)
    setOpenMenuFor(null)
  }

  const handleSaveRename = (projectId) => {
    if (editName.trim()) {
      onRenameProject(projectId, editName.trim())
    }
    setEditingProject(null)
  }

  const handleExport = (project) => {
    setOpenMenuFor(null)
    if (selectedProjectId === project.id && selectedVersionId) {
      onExportVersion(project.id, selectedVersionId)
    } else {
      const versions = Object.values(project.versions)
      if (versions.length === 0) {
        alert('This project has no versions to export.')
        return
      }
      alert('Select a version for this project first, then use Export.')
    }
  }

  return (
    <aside className="sidebar" aria-label="Projects sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">🍬</span>
        <span className="sidebar-title">Taffy</span>
      </div>

      <div className="sidebar-section-label">Projects</div>

      <div className="projects-list">
        {projects.map((project) => {
          const versions = Object.values(project.versions).sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          )
          const isExpanded = !!expandedProjects[project.id]
          const isSelected = selectedProjectId === project.id
          const isMenuOpen = openMenuFor === project.id

          return (
            <div key={project.id} className="project-item">
              <div
                className={`project-header ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectProject(project.id)
                  toggleProject(project.id)
                }}
              >
                <span className="expand-icon">{isExpanded ? '▾' : '▸'}</span>

                {editingProject === project.id ? (
                  <input
                    className="inline-edit"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveRename(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(project.id)
                      if (e.key === 'Escape') setEditingProject(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="project-name">{project.name}</span>
                )}

                <div className="project-actions">
                  {/* Options menu */}
                  <div className="project-menu-wrapper" ref={isMenuOpen ? menuRef : null}>
                    <button
                      className="icon-btn"
                      title="Project options"
                      aria-label={`Options for ${project.name}`}
                      aria-expanded={isMenuOpen}
                      aria-haspopup="menu"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuFor(isMenuOpen ? null : project.id)
                      }}
                    >
                      ⋯
                    </button>
                    {isMenuOpen && (
                      <div className="project-menu" role="menu" aria-label={`${project.name} options`}>
                        <button
                          className="project-menu-item"
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartRename(project)
                          }}
                        >
                          Rename
                        </button>
                        <button
                          className="project-menu-item"
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExport(project)
                          }}
                        >
                          Export version…
                        </button>
                        <div className="project-menu-divider" role="separator" />
                        <button
                          className="project-menu-item project-menu-item--danger"
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuFor(null)
                            if (window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
                              onDeleteProject(project.id)
                            }
                          }}
                        >
                          Delete project
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="versions-list">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`version-item ${selectedVersionId === version.id ? 'selected' : ''}`}
                      onClick={() => onSelectVersion(project.id, version.id)}
                    >
                      <span className="version-icon">↳</span>
                      <span className="version-name">{version.name}</span>
                      <button
                        className="version-delete"
                        title="Delete version"
                        aria-label={`Delete version ${version.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`Delete version "${version.name}"?`)) {
                            onDeleteVersion(project.id, version.id)
                          }
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {showNewVersionFor === project.id ? (
                    <form
                      className="new-version-form"
                      onSubmit={(e) => handleCreateVersion(e, project.id)}
                    >
                      <input
                        className="new-item-input"
                        placeholder="e.g. v1, v2, draft…"
                        value={newVersionName}
                        onChange={(e) => setNewVersionName(e.target.value)}
                        autoFocus
                        onBlur={() => {
                          if (!newVersionName.trim()) setShowNewVersionFor(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setShowNewVersionFor(null)
                        }}
                      />
                    </form>
                  ) : (
                    <button
                      className="add-version-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowNewVersionFor(project.id)
                        setNewVersionName('')
                      }}
                    >
                      + Add version
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {projects.length === 0 && (
          <p style={{ color: 'var(--sidebar-text-dim)', fontSize: '12px', padding: '8px 8px', lineHeight: 1.5 }}>
            No projects yet.{' '}
            <span
              style={{ color: 'var(--accent)', cursor: 'pointer' }}
              onClick={() => setShowNewProject(true)}
            >
              Create one
            </span>
            .
          </p>
        )}
      </div>

      <div className="sidebar-footer">
        {showNewProject ? (
          <form className="new-project-form" onSubmit={handleCreateProject}>
            <input
              className="new-project-input"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
              onBlur={() => {
                if (!newProjectName.trim()) setShowNewProject(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowNewProject(false)
              }}
            />
          </form>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="new-project-btn" style={{ flex: 1 }} onClick={() => setShowNewProject(true)}>
              + New Project
            </button>
            <button
              className={`sidebar-prefs-btn${prefsOpen ? ' active' : ''}`}
              title="Preferences"
              onClick={onOpenPreferences}
            >
              ⚙
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
