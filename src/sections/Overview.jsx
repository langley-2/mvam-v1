import { useState } from 'react'
import { canAnalyzeRepositories } from '../api/repositoryAnalysis'
import { renderMarkdown } from '../markdown'
import {
  getGeneratedSectionIds,
  getRepositoryDraftSectionPreview,
  hasExistingSectionContent,
} from '../repositoryDraft'

const DRAFT_SECTION_LABELS = {
  requirements: 'Requirements',
  architecture: 'System Design',
  scalingCost: 'Scaling & Economics',
  diagrams: 'Diagrams & Components',
  codeStructure: 'Implementation Structure',
  decisions: 'Decisions',
  raidAndLearnings: 'RAID Log / Learnings',
  links: 'References',
}

const HEALTH_SECTION_LABELS = {
  requirements: 'Requirements',
  architecture: 'System Design',
  decisions: 'Decisions',
  scalingCost: 'Scaling & Economics',
  diagrams: 'Diagrams & Components',
  codeStructure: 'Implementation Structure',
  raidLog: 'RAID Log',
  learningsProof: 'Learnings & Proof',
  links: 'References',
}

function formatDate(value) {
  if (!value) return 'Never'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function shortSha(value) {
  return value ? String(value).slice(0, 10) : 'unknown'
}

function sourceTitle(source) {
  if (!source) return 'No repository selected'
  if (source.displayName) return source.displayName
  if (source.type === 'remote') return source.url || 'Remote repository'
  if (source.type === 'local') return source.path || 'Local repository'
  return 'Repository'
}

export default function Overview({
  project,
  onProjectChange,
  version,
  isApiConfigured,
  analysisState,
  onChooseLocalRepository,
  onAnalyzeRepository,
  onApplyDraft,
}) {
  const [shareConfirmed, setShareConfirmed] = useState(false)
  const [analysisOptions, setAnalysisOptions] = useState({
    includeDocsAndManifests: true,
    includeSourceFiles: false,
    includeFileTree: true,
  })
  const desktopAvailable = canAnalyzeRepositories()
  const repoAnalysis = version?.repoAnalysis || {}
  const draft = repoAnalysis.draft
  const generatedSections = getGeneratedSectionIds(draft)
  const appliedSections = repoAnalysis.appliedSections || []
  const source = analysisState?.source || repoAnalysis.source || draft?.metadata?.source || null
  const isLoading = analysisState?.status === 'loading'
  const hasEnabledEvidence =
    analysisOptions.includeDocsAndManifests ||
    analysisOptions.includeSourceFiles ||
    analysisOptions.includeFileTree
  const canSubmit = desktopAvailable && isApiConfigured && shareConfirmed && hasEnabledEvidence && !isLoading

  const handleChooseLocal = async () => {
    const selected = await onChooseLocalRepository()
    if (selected) await onAnalyzeRepository(selected, analysisOptions)
  }

  const handleRemoteSubmit = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const url = String(form.get('remoteUrl') || '').trim()
    if (!url) return
    await onAnalyzeRepository({ type: 'remote', url }, analysisOptions)

  }

  const updateOption = (key, value) => {
    setAnalysisOptions((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="section-container overview-section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Overview</h1>
          <p className="section-description">
            Capture your architecture, practise your explanation, or start with a repository draft.
          </p>
        </div>
      </div>

      <section className="overview-panel guided-settings" aria-labelledby="guided-title">
        <div className="overview-panel-header">
          <div>
            <h2 className="overview-panel-title" id="guided-title">Make room for your next interview</h2>
            <p className="overview-muted">Guided mode adds practice prompts and asks Archie to focus on your thinking. Applies to every version in this project.</p>
          </div>
          <label className="guided-toggle">
            <input type="checkbox" role="switch" checked={project?.guided === true}
              onChange={(event) => onProjectChange({ guided: event.target.checked })} />
            Guided mode
          </label>
        </div>
        {project?.guided && <>
          <p className="overview-note">Start with what you know. Rough notes or a clear diagram are welcome; you don’t need to fill every field. Work through the sections and practise explaining your choices aloud.</p>
          <label className="guided-context-label" htmlFor="interview-context">Job description or interview context <span>(optional)</span></label>
          <textarea id="interview-context" className="form-textarea" rows={5} maxLength={12000}
            placeholder="Paste the role, interview brief, or skills you want to practise…"
            value={project.interviewContext || ''}
            onChange={(event) => onProjectChange({ interviewContext: event.target.value })} />
          <p className="overview-muted">Saved on this device. When you click Practise with Archie, this context and the current section’s text and images are sent to OpenAI. Context is not sent when guided mode is off.</p>
        </>}
      </section>

      <section className="overview-panel overview-health-panel" aria-labelledby="health-title">
        <div className="overview-panel-header">
          <div>
            <h2 className="overview-panel-title" id="health-title">{project?.guided ? 'Interview Practice' : 'Architecture Health'}</h2>
            <p className="overview-muted">Archie scores for the current mode will appear here as sections are reviewed.</p>
          </div>
        </div>
        <div className="overview-health-grid">
          {Object.entries(HEALTH_SECTION_LABELS).map(([sectionId, label]) => {
            const savedScore = version?.repoAnalysis?.archieScores?.[sectionId]
            const score = (savedScore?.mode || 'standard') === (project?.guided ? 'guided' : 'standard') ? savedScore : null
            return (
              <div className="overview-health-item" key={sectionId}>
                <span>{label}</span>
                <strong>{score ? `${score.score}/10` : '-'}</strong>
              </div>
            )
          })}
        </div>
      </section>

      <div className="overview-grid">
        <section className="overview-panel" aria-labelledby="repo-source-title">
          <div className="overview-panel-header">
            <div>
              <h2 className="overview-panel-title" id="repo-source-title">Repository</h2>
              <p className="overview-muted">{sourceTitle(source)}</p>
            </div>
            <span className={`overview-status-badge ${isApiConfigured ? 'ready' : 'blocked'}`}>
              {isApiConfigured ? 'AI ready' : 'API key needed'}
            </span>
          </div>

          <div className="overview-actions">
            <button
              className="btn-primary"
              onClick={handleChooseLocal}
              disabled={!canSubmit}
            >
              Choose local repo
            </button>
            {source && (
              <button
                className="btn-secondary"
                onClick={() => onAnalyzeRepository(source, analysisOptions)}
                disabled={!canSubmit}
              >
                Re-analyze
              </button>
            )}
          </div>

          <form className="overview-remote-form" onSubmit={handleRemoteSubmit}>
            <input
              className="form-input"
              name="remoteUrl"
              placeholder="https://github.com/org/repo.git or git@host:org/repo.git"
              disabled={!canSubmit}
            />
            <button
              className="btn-secondary"
              disabled={!canSubmit}
            >
              Analyze remote
            </button>
          </form>

          <div className="overview-safety-controls" role="group" aria-label="AI submission controls">
            <h3 className="overview-safety-title">AI Submission Controls</h3>
            <label className="overview-checkbox">
              <input
                type="checkbox"
                checked={shareConfirmed}
                onChange={(event) => setShareConfirmed(event.target.checked)}
              />
              <span>I confirm this repository content can be shared with the selected AI provider.</span>
            </label>
            <label className="overview-checkbox">
              <input
                type="checkbox"
                checked={analysisOptions.includeDocsAndManifests}
                onChange={(event) => updateOption('includeDocsAndManifests', event.target.checked)}
              />
              <span>Include docs and package manifests</span>
            </label>
            <label className="overview-checkbox">
              <input
                type="checkbox"
                checked={analysisOptions.includeFileTree}
                onChange={(event) => updateOption('includeFileTree', event.target.checked)}
              />
              <span>Include tracked file tree</span>
            </label>
            <label className="overview-checkbox">
              <input
                type="checkbox"
                checked={analysisOptions.includeSourceFiles}
                onChange={(event) => updateOption('includeSourceFiles', event.target.checked)}
              />
              <span>Include source file contents</span>
            </label>
          </div>

          {!desktopAvailable && (
            <p className="overview-warning">Repository analysis is available in the desktop app.</p>
          )}
          {!isApiConfigured && (
            <p className="overview-warning">Add an AI provider key in Preferences before running repository analysis.</p>
          )}
          {!hasEnabledEvidence && (
            <p className="overview-warning">Enable at least one evidence type before running repository analysis.</p>
          )}
          <p className="overview-note">
            Taffy reads tracked text files only. It does not install dependencies, run scripts, start containers, execute tests, or follow submodules. Secret-looking paths and high-risk secret content are skipped; common token patterns are redacted before provider submission.
          </p>
        </section>

        <section className="overview-panel" aria-labelledby="latest-analysis-title">
          <div className="overview-panel-header">
            <div>
              <h2 className="overview-panel-title" id="latest-analysis-title">Latest Analysis</h2>
              <p className="overview-muted">{formatDate(draft?.createdAt)}</p>
            </div>
            <span className={`overview-status-badge ${draft ? 'ready' : 'neutral'}`}>
              {draft ? draft.confidence : 'No draft'}
            </span>
          </div>

          {isLoading && (
            <div className="overview-progress" role="status" aria-live="polite">
              <div className="review-spinner" aria-hidden="true" />
              <span>{analysisState.message || 'Analyzing repository...'}</span>
            </div>
          )}

          {analysisState?.status === 'error' && (
            <p className="overview-error" role="alert">{analysisState.message}</p>
          )}

          {draft ? (
            <>
              <p className="overview-summary">{draft.summary || 'Draft generated from repository evidence.'}</p>
              <dl className="overview-meta-list">
                <div>
                  <dt>Commit</dt>
                  <dd>{shortSha(draft.metadata?.commitSha)}</dd>
                </div>
                <div>
                  <dt>Branch</dt>
                  <dd>{draft.metadata?.branch || 'unknown'}</dd>
                </div>
                <div>
                  <dt>Files read</dt>
                  <dd>{draft.metadata?.selectedFileCount || 0} of {draft.metadata?.fileCount || 0}</dd>
                </div>
                <div>
                  <dt>Worktree</dt>
                  <dd>{draft.metadata?.dirty ? 'dirty' : 'clean'}</dd>
                </div>
              </dl>
              <div className="overview-evidence">
                <h3 className="overview-safety-title">Submitted Evidence</h3>
                <p className="overview-muted">
                  {draft.metadata?.redaction?.sensitivePathsSkipped || 0} sensitive path(s) skipped,
                  {' '}{draft.metadata?.redaction?.sensitiveContentSkipped || 0} file(s) skipped for high-risk secret content,
                  {' '}{draft.metadata?.redaction?.redactionsApplied || 0} inline redaction(s) applied.
                </p>
                {!!draft.metadata?.selectedFiles?.length && (
                  <details className="overview-file-details">
                    <summary>View submitted file list</summary>
                    <ul>
                      {draft.metadata.selectedFiles.map((file) => (
                        <li key={file}>{file}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </>
          ) : (
            <p className="overview-empty">No repository draft has been generated for this version yet.</p>
          )}
        </section>
      </div>

      {draft && (
        <section className="overview-panel overview-draft-panel" aria-labelledby="draft-sections-title">
          <div className="overview-panel-header">
            <div>
              <h2 className="overview-panel-title" id="draft-sections-title">Generated Section Drafts</h2>
              <p className="overview-muted">Apply generated content into the existing section fields.</p>
            </div>
            <button
              className="btn-primary"
              onClick={() => onApplyDraft(generatedSections)}
              disabled={!generatedSections.length}
            >
              Apply all drafts
            </button>
          </div>

          <div className="overview-section-list">
            {generatedSections.map((sectionId) => {
              const hasExisting = hasExistingSectionContent(version, sectionId)
              const wasApplied = appliedSections.includes(sectionId)
              const preview = getRepositoryDraftSectionPreview(draft, sectionId)
              return (
                <div className="overview-section-row" key={sectionId}>
                  <div className="overview-section-row-main">
                    <div className="overview-section-row-heading">
                      <div>
                        <strong>{DRAFT_SECTION_LABELS[sectionId] || sectionId}</strong>
                        <span className="overview-muted">
                          {wasApplied ? 'Applied' : hasExisting ? 'Will replace existing content' : 'Ready to fill'}
                        </span>
                      </div>
                      <button className="btn-secondary" onClick={() => onApplyDraft([sectionId])}>
                        Apply
                      </button>
                    </div>
                    <details className="overview-draft-preview">
                      <summary>Preview generated changes</summary>
                      <div
                        className="md-preview overview-draft-rendered"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(preview) }}
                      />
                    </details>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
