const crypto = require('crypto')
const fs = require('fs')
const fsp = require('fs/promises')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.4-mini',
  },
}

const MAX_TRACKED_FILES = 1200
const MAX_SELECTED_FILES = 72
const MAX_FILE_BYTES = 120 * 1024
const MAX_FILE_CHARS = 9000
const MAX_TOTAL_CHARS = 105000

const DEFAULT_ANALYSIS_OPTIONS = {
  includeDocsAndManifests: true,
  includeSourceFiles: false,
  includeFileTree: true,
}

const IGNORE_DIRS = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'vendor',
  'dist',
  'build',
  'release',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.cache',
  'target',
  'bin',
  'obj',
  '__pycache__',
  '.venv',
  'venv',
])

const TEXT_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.cfg',
  '.clj',
  '.cljs',
  '.config',
  '.cs',
  '.css',
  '.csv',
  '.cjs',
  '.dockerfile',
  '.env.example',
  '.erl',
  '.ex',
  '.exs',
  '.go',
  '.graphql',
  '.h',
  '.hpp',
  '.html',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.kt',
  '.lock',
  '.mjs',
  '.md',
  '.mdx',
  '.php',
  '.pl',
  '.properties',
  '.proto',
  '.py',
  '.rb',
  '.rs',
  '.scala',
  '.sh',
  '.sql',
  '.svelte',
  '.swift',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.vue',
  '.xml',
  '.yaml',
  '.yml',
])

const IMPORTANT_BASENAMES = new Set([
  'README',
  'README.md',
  'package.json',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'pnpm-lock.yaml',
  'requirements.txt',
  'pyproject.toml',
  'poetry.lock',
  'Pipfile',
  'go.mod',
  'go.sum',
  'Cargo.toml',
  'Cargo.lock',
  'pom.xml',
  'build.gradle',
  'settings.gradle',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'vite.config.js',
  'vite.config.ts',
  'next.config.js',
  'next.config.mjs',
  'tsconfig.json',
])

class RepositoryAnalysisError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
    this.name = 'RepositoryAnalysisError'
  }
}

function cleanString(value, max = 3000) {
  if (value == null) return ''
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, max)
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function hashId(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 20)
}

function normalizeAnalysisOptions(options = {}) {
  return {
    includeDocsAndManifests: options.includeDocsAndManifests !== false,
    includeSourceFiles: !!options.includeSourceFiles,
    includeFileTree: options.includeFileTree !== false,
  }
}

function sanitizeRemoteUrl(rawUrl) {
  const value = cleanString(rawUrl, 2048)
  if (!value) return ''
  try {
    const url = new URL(value)
    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return value.replace(/\/\/[^/@\s]+@/, '//[redacted]@')
  }
}

function repositoryDisplayName(remoteUrl) {
  const safeUrl = sanitizeRemoteUrl(remoteUrl)
  const withoutGit = safeUrl.replace(/\.git$/i, '').replace(/\/$/, '')
  return withoutGit.split(/[/:]/).slice(-2).join('/') || 'Repository'
}

function appRepoWorkspace(userDataPath, repoId) {
  return path.join(userDataPath, 'repos', repoId, 'working')
}

function isAllowedRemoteUrl(input) {
  const value = String(input || '').trim()
  if (!value || value.length > 2048) return false
  if (/^git@[A-Za-z0-9._-]+:[A-Za-z0-9._/-]+$/.test(value)) return true
  try {
    const url = new URL(value)
    return ['https:', 'ssh:'].includes(url.protocol) && !!url.hostname && !url.password &&
      (url.protocol === 'ssh:' || !url.username) && !url.search && !url.hash && !/[\\\s]/.test(value)
  } catch { return false }
  return false
}

function runGit(cwd, args, options = {}) {
  const timeoutMs = options.timeoutMs || 30000
  const maxBuffer = options.maxBuffer || 4 * 1024 * 1024

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    let settled = false

    const child = spawn(
      'git',
      ['-c', `core.hooksPath=${path.join(__dirname, 'disabled-hooks')}`, '-c', 'core.fsmonitor=false', '-c', 'protocol.file.allow=never', '-c', 'protocol.ext.allow=never', ...args],
      {
        cwd,
        shell: false,
        windowsHide: true,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
        },
      }
    )

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGTERM')
      reject(new RepositoryAnalysisError('GIT_TIMEOUT', 'Git command timed out.'))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8')
      if (stdout.length > maxBuffer) {
        settled = true
        clearTimeout(timer)
        child.kill('SIGTERM')
        reject(new RepositoryAnalysisError('GIT_OUTPUT_LIMIT', 'Git command produced too much output.'))
      }
    })

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString('utf8')).slice(-maxBuffer)
    })

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (err.code === 'ENOENT') {
        reject(new RepositoryAnalysisError('NO_GIT', 'Git is not available on this machine.'))
        return
      }
      reject(new RepositoryAnalysisError('GIT_FAILED', 'Git command failed.'))
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (code !== 0) {
        reject(new RepositoryAnalysisError('GIT_FAILED', 'Git command failed. Check the repository URL, access and installed Git version.'))
        return
      }
      resolve(stdout)
    })
  })
}

async function cloneOrUpdateRemote(userDataPath, remoteUrl) {
  if (!isAllowedRemoteUrl(remoteUrl)) {
    throw new RepositoryAnalysisError('BAD_REMOTE', 'Enter a valid HTTPS or SSH git repository URL.')
  }

  const repoId = hashId(remoteUrl)
  const workingPath = appRepoWorkspace(userDataPath, repoId)
  const parentPath = path.dirname(workingPath)
  await fsp.mkdir(parentPath, { recursive: true })

  if (!fs.existsSync(path.join(workingPath, '.git'))) {
    await runGit(parentPath, ['clone', '--no-recurse-submodules', '--depth=1', remoteUrl, 'working'], {
      timeoutMs: 180000,
      maxBuffer: 2 * 1024 * 1024,
    })
  } else {
    await runGit(workingPath, ['fetch', '--depth=1', 'origin'], {
      timeoutMs: 120000,
      maxBuffer: 2 * 1024 * 1024,
    })
    await runGit(workingPath, ['checkout', '--detach', 'FETCH_HEAD'], {
      timeoutMs: 30000,
      maxBuffer: 2 * 1024 * 1024,
    })
  }

  return {
    type: 'remote',
    repoId,
    url: sanitizeRemoteUrl(remoteUrl),
    path: workingPath,
    displayName: repositoryDisplayName(remoteUrl),
  }
}

async function resolveRepositorySource(source, userDataPath) {
  const requested = source || {}
  if (requested.type === 'remote') {
    return cloneOrUpdateRemote(userDataPath, requested.url)
  }

  if (requested.type !== 'local') {
    throw new RepositoryAnalysisError('BAD_SOURCE', 'Choose a local git repository or enter a remote git URL.')
  }

  const repoPath = path.resolve(String(requested.path || ''))
  if (!repoPath || !fs.existsSync(repoPath)) {
    throw new RepositoryAnalysisError('BAD_SOURCE', 'Selected repository folder does not exist.')
  }

  const topLevel = cleanString(await runGit(repoPath, ['rev-parse', '--show-toplevel']))
  if (!topLevel) {
    throw new RepositoryAnalysisError('NOT_GIT', 'Selected folder is not a git repository.')
  }

  return {
    type: 'local',
    repoId: hashId(topLevel),
    path: topLevel,
    displayName: path.basename(topLevel),
  }
}

async function getRepositoryMetadata(repoPath, source) {
  const [commitSha, branch, status, remote] = await Promise.all([
    runGit(repoPath, ['rev-parse', 'HEAD']).catch(() => ''),
    runGit(repoPath, ['branch', '--show-current']).catch(() => ''),
    runGit(repoPath, ['status', '--porcelain=v1']).catch(() => ''),
    runGit(repoPath, ['config', '--get', 'remote.origin.url']).catch(() => ''),
  ])

  return {
    source: {
      type: source.type,
      displayName: source.displayName,
      url: source.type === 'remote' ? source.url : undefined,
      path: source.type === 'local' ? source.path : undefined,
    },
    commitSha: cleanString(commitSha, 100),
    branch: cleanString(branch, 160) || 'detached',
    dirty: !!cleanString(status, 1000),
    remote: sanitizeRemoteUrl(remote),
    analyzedAt: new Date().toISOString(),
  }
}

function hasIgnoredPathSegment(relPath) {
  return relPath.split(/[\\/]/).some((part) => IGNORE_DIRS.has(part))
}

function isSensitivePath(relPath) {
  const value = relPath.toLowerCase()
  if (/(^|\/)\.env($|\.|\/)/.test(value) && !value.endsWith('.env.example')) return true
  if (/(^|\/)(\.npmrc|\.pypirc|\.netrc|netrc|kubeconfig)$/.test(value)) return true
  if (/(^|\/)(\.aws|\.ssh|\.kube)(\/|$)/.test(value)) return true
  if (/(secret|secrets|credential|credentials|private[-_]key|id_rsa|id_dsa|id_ed25519)/.test(value)) return true
  if (/\.(pem|p12|pfx|key|crt|cer|keystore)$/i.test(value)) return true
  return false
}

function isDocsOrManifestPath(relPath) {
  const base = path.basename(relPath)
  if (IMPORTANT_BASENAMES.has(base)) return true
  if (base.toLowerCase().startsWith('readme')) return true
  if (relPath.startsWith('docs/')) return true
  return false
}

function isSourcePath(relPath) {
  const ext = path.extname(relPath).toLowerCase()
  if (!TEXT_EXTENSIONS.has(ext)) return false
  if (isDocsOrManifestPath(relPath)) return false
  return true
}

function isCandidateTextPath(relPath, options) {
  if (hasIgnoredPathSegment(relPath)) return false
  if (isSensitivePath(relPath)) return false
  if (options.includeDocsAndManifests && isDocsOrManifestPath(relPath)) return true
  if (options.includeSourceFiles && isSourcePath(relPath)) return true
  return false
}

function isProbablyText(buffer) {
  if (!buffer.length) return true
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096))
  for (const byte of sample) {
    if (byte === 0) return false
  }
  return true
}

function scoreFile(relPath) {
  const base = path.basename(relPath)
  const ext = path.extname(relPath).toLowerCase()
  let score = 0

  if (base.toLowerCase().startsWith('readme')) score += 100
  if (IMPORTANT_BASENAMES.has(base)) score += 85
  if (relPath.startsWith('docs/')) score += 70
  if (relPath.startsWith('.github/workflows/')) score += 45
  if (/(^|\/)(src|app|pages|routes|server|electron|api|backend|frontend|lib|services|domain)\//.test(relPath)) score += 48
  if (/(main|index|app|server|router|routes|handler|controller|service|store|schema|model|config)/i.test(base)) score += 28
  if (['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.py', '.go', '.rs', '.java', '.cs'].includes(ext)) score += 20
  if (relPath.includes('/test/') || relPath.includes('/tests/') || /\.(test|spec)\./.test(base)) score -= 20
  if (base.includes('lock')) score -= 65
  return score
}

async function listTrackedFiles(repoPath) {
  const raw = await runGit(repoPath, ['ls-files', '-z'], {
    timeoutMs: 30000,
    maxBuffer: 12 * 1024 * 1024,
  })
  return raw
    .split('\0')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => !path.isAbsolute(file))
    .filter((file) => !file.split(/[\\/]/).includes('..'))
    .slice(0, MAX_TRACKED_FILES)
}

function hasHighRiskSecret(text) {
  return (
    /-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(text) ||
    /sk-[A-Za-z0-9_-]{20,}/.test(text) ||
    /gh[pousr]_[A-Za-z0-9_]{20,}/.test(text) ||
    /xox[baprs]-[A-Za-z0-9-]{20,}/.test(text) ||
    /AKIA[0-9A-Z]{16}/.test(text)
  )
}

function redactTextWithReport(text) {
  let redactions = 0
  const replace = (pattern, value) =>
    value.replace(pattern, () => {
      redactions += 1
      return '[REDACTED]'
    })

  let redacted = String(text)
  redacted = redacted.replace(
    /(api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*["']?[^"'\s,}]+/gi,
    (_match, label) => {
      redactions += 1
      return `${label}=[REDACTED]`
    }
  )
  redacted = replace(/sk-[A-Za-z0-9_-]{20,}/g, redacted)
  redacted = replace(/gh[pousr]_[A-Za-z0-9_]{20,}/g, redacted)
  redacted = replace(/xox[baprs]-[A-Za-z0-9-]{20,}/g, redacted)
  redacted = replace(/AKIA[0-9A-Z]{16}/g, redacted)
  redacted = replace(/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, redacted)
  return { text: redacted, redactions }
}

async function readCandidateFile(repoPath, relPath) {
  const root = await fsp.realpath(repoPath)
  let absolute
  try { absolute = await fsp.realpath(path.resolve(repoPath, relPath)) } catch { return null }
  if (!absolute.startsWith(root + path.sep)) return null

  let stat
  try {
    stat = await fsp.lstat(absolute)
  } catch {
    return null
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_FILE_BYTES) return null

  let buffer
  try {
    buffer = await fsp.readFile(absolute)
  } catch {
    return null
  }
  if (!isProbablyText(buffer)) return null

  const rawText = buffer.toString('utf8')
  if (hasHighRiskSecret(rawText)) {
    return { skipped: 'sensitive_content' }
  }
  const redacted = redactTextWithReport(rawText)
  return {
    path: relPath,
    size: stat.size,
    text: redacted.text.slice(0, MAX_FILE_CHARS),
    redactions: redacted.redactions,
  }
}

function buildTree(files) {
  return files
    .slice(0, 420)
    .map((file) => `- ${file}`)
    .join('\n')
}

async function buildRepositoryEvidence(repoPath, source, requestedOptions) {
  const options = normalizeAnalysisOptions(requestedOptions)
  const metadata = await getRepositoryMetadata(repoPath, source)
  const trackedFiles = await listTrackedFiles(repoPath)
  const candidates = trackedFiles
    .filter((file) => isCandidateTextPath(file, options))
    .sort((a, b) => scoreFile(b) - scoreFile(a))
    .slice(0, MAX_SELECTED_FILES)

  const selectedFiles = []
  let totalChars = 0
  let sensitiveContentSkipped = 0
  let redactionsApplied = 0
  for (const relPath of candidates) {
    const file = await readCandidateFile(repoPath, relPath)
    if (!file) continue
    if (file.skipped === 'sensitive_content') {
      sensitiveContentSkipped += 1
      continue
    }
    if (totalChars + file.text.length > MAX_TOTAL_CHARS) break
    selectedFiles.push(file)
    redactionsApplied += file.redactions || 0
    totalChars += file.text.length
  }

  if (selectedFiles.length === 0 && !options.includeFileTree) {
    throw new RepositoryAnalysisError('NO_FILES', 'No safe repository evidence was enabled for analysis.')
  }

  return {
    metadata,
    fileTree: options.includeFileTree ? buildTree(trackedFiles.filter((file) => !isSensitivePath(file) && !hasIgnoredPathSegment(file))) : '',
    fileCount: trackedFiles.length,
    selectedFiles,
    redaction: {
      sensitivePathsSkipped: trackedFiles.filter(isSensitivePath).length,
      ignoredDirectoriesSkipped: trackedFiles.filter(hasIgnoredPathSegment).length,
      sensitiveContentSkipped,
      redactionsApplied,
      controls: options,
    },
  }
}

function providerSafeMetadata(metadata) {
  return {
    source: {
      type: metadata.source?.type,
      displayName: metadata.source?.displayName,
      url: metadata.source?.type === 'remote' ? sanitizeRemoteUrl(metadata.source?.url) : undefined,
    },
    commitSha: metadata.commitSha,
    branch: metadata.branch,
    dirty: metadata.dirty,
    remote: sanitizeRemoteUrl(metadata.remote),
    analyzedAt: metadata.analyzedAt,
  }
}

function buildEvidencePrompt(evidence) {
  const files = evidence.selectedFiles.map((file) => {
    return [
      `### ${file.path}`,
      `Size: ${file.size} bytes`,
      '```',
      file.text,
      '```',
    ].join('\n')
  })

  return [
    '# Repository Metadata',
    JSON.stringify(providerSafeMetadata(evidence.metadata), null, 2),
    '',
    '# File Tree Sample',
    evidence.fileTree || '(withheld by privacy controls)',
    '',
    '# Selected Static File Evidence',
    files.join('\n\n') || '(no file contents included by privacy controls)',
  ].join('\n')
}

const SYSTEM_PROMPT = `You are Taffy's repository architecture analysis agent. Analyze a git repository as static text only and produce a structured draft for Taffy's existing architecture template sections.

Hard rules:
- Do not ask to run, install, build, test, migrate, containerize, or execute repository code.
- Use only the repository evidence provided in the user message.
- If evidence is missing, write "Unknown from static analysis" rather than guessing.
- Fill only these Taffy sections and their defined fields: requirements, architecture, scalingCost, codeStructure, diagrams, decisions, raidAndLearnings, links.
- Keep generated content specific, concise, and evidence-backed. Avoid generic filler.
- Return valid JSON only. No markdown outside JSON.

The JSON must match this shape:
{
  "summary": "2-4 sentence architecture summary",
  "confidence": "low" | "medium" | "high",
  "sections": {
    "requirements": {
      "form": {
        "frItems": ["..."],
        "availability": "...",
        "latency": "...",
        "scalability": "...",
        "durability": "...",
        "security": "...",
        "compliance": "...",
        "operability": "..."
      }
    },
    "architecture": {
      "form": {
        "archType": "...",
        "dataArch": "...",
        "stateManagement": "...",
        "deploymentModel": "...",
        "observability": "...",
        "scalingAxis": "...",
        "resilience": "...",
        "securityPosture": "...",
        "failureModes": [
          { "component": "...", "mode": "...", "impact": "...", "mitigation": "..." }
        ],
        "degradationStrategy": "...",
        "recoveryRTO": "...",
        "recoveryRPO": "...",
        "recoveryMTTR": "...",
        "deferred": ["..."]
      }
    },
    "scalingCost": {
      "form": {
        "load": "...",
        "infrastructure": "...",
        "monthlyCost": "...",
        "costPerUnit": "...",
        "scalingAxis": "...",
        "breaks10x": "...",
        "fix10x": "...",
        "breaks100x": "...",
        "fix100x": "...",
        "unitEconomics": [
          { "component": "...", "tenX": "...", "hundredX": "...", "thousandX": "..." }
        ]
      }
    },
    "codeStructure": {
      "form": {
        "overview": "...",
        "layers": [
          { "name": "...", "purpose": "...", "keyFolders": "..." }
        ]
      }
    },
    "diagrams": {
      "system": {
        "title": "...",
        "notes": "...",
        "checklist": {
          "components_labeled": true,
          "boundaries_clear": true,
          "data_flow": true,
          "external_deps": true,
          "patterns_annotated": true,
          "scaling_dimension": true,
          "failure_modes": true
        },
        "components": [
          {
            "name": "...",
            "what": "...",
            "why": "...",
            "tech": "...",
            "interfaces": "...",
            "dataOwnership": "...",
            "scaling": "...",
            "failureModes": "..."
          }
        ]
      },
      "c4": {
        "title": "...",
        "notes": "..."
      },
      "custom": []
    },
    "decisions": {
      "items": [
        {
          "title": "...",
          "status": "proposed" | "accepted" | "superseded" | "deprecated",
          "context": "...",
          "options": [
            { "label": "...", "description": "...", "pros": "...", "cons": "..." }
          ],
          "decision": "...",
          "rationale": "...",
          "implications": "..."
        }
      ]
    },
    "raidAndLearnings": {
      "content": "...",
      "proofs": { "performance": false, "failure": false },
      "raid": {
        "risks": "...",
        "assumptions": "...",
        "issues": "...",
        "decisions": "..."
      }
    },
    "links": {
      "items": [
        { "label": "...", "category": "Repository", "url": "...", "description": "..." }
      ]
    }
  }
}`

function cleanList(value, maxItems, maxLen = 700) {
  if (!Array.isArray(value)) return []
  return value.map((item) => cleanString(item, maxLen)).filter(Boolean).slice(0, maxItems)
}

function cleanObjectList(value, fields, maxItems) {
  if (!Array.isArray(value)) return []
  return value.slice(0, maxItems).map((item) => {
    const next = {}
    for (const [field, maxLen] of fields) next[field] = cleanString(item?.[field], maxLen)
    return next
  })
}

function normalizeDraft(raw, evidence) {
  const sections = raw?.sections || {}
  const confidence = ['low', 'medium', 'high'].includes(raw?.confidence) ? raw.confidence : 'medium'

  const requirementsForm = sections.requirements?.form || {}
  const architectureForm = sections.architecture?.form || {}
  const scalingForm = sections.scalingCost?.form || {}
  const codeForm = sections.codeStructure?.form || {}
  const diagrams = sections.diagrams || {}
  const decisions = sections.decisions || {}
  const raidAndLearnings = sections.raidAndLearnings || {}
  const links = sections.links || {}

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    summary: cleanString(raw?.summary, 1600),
    confidence,
    metadata: {
      ...evidence.metadata,
      fileCount: evidence.fileCount,
      selectedFileCount: evidence.selectedFiles.length,
      selectedFiles: evidence.selectedFiles.map((file) => file.path),
      redaction: evidence.redaction,
    },
    sections: {
      requirements: {
        form: {
          frItems: cleanList(requirementsForm.frItems, 8),
          availability: cleanString(requirementsForm.availability, 600),
          latency: cleanString(requirementsForm.latency, 600),
          scalability: cleanString(requirementsForm.scalability, 600),
          durability: cleanString(requirementsForm.durability, 600),
          security: cleanString(requirementsForm.security, 600),
          compliance: cleanString(requirementsForm.compliance, 600),
          operability: cleanString(requirementsForm.operability, 600),
        },
      },
      architecture: {
        form: {
          archType: cleanString(architectureForm.archType, 600),
          dataArch: cleanString(architectureForm.dataArch, 700),
          stateManagement: cleanString(architectureForm.stateManagement, 700),
          deploymentModel: cleanString(architectureForm.deploymentModel, 700),
          observability: cleanString(architectureForm.observability, 700),
          scalingAxis: cleanString(architectureForm.scalingAxis, 700),
          resilience: cleanString(architectureForm.resilience, 700),
          securityPosture: cleanString(architectureForm.securityPosture, 700),
          failureModes: cleanObjectList(
            architectureForm.failureModes,
            [['component', 180], ['mode', 360], ['impact', 360], ['mitigation', 500]],
            8
          ),
          degradationStrategy: cleanString(architectureForm.degradationStrategy, 900),
          recoveryRTO: cleanString(architectureForm.recoveryRTO, 250),
          recoveryRPO: cleanString(architectureForm.recoveryRPO, 250),
          recoveryMTTR: cleanString(architectureForm.recoveryMTTR, 250),
          deferred: cleanList(architectureForm.deferred, 8),
        },
      },
      scalingCost: {
        form: {
          load: cleanString(scalingForm.load, 700),
          infrastructure: cleanString(scalingForm.infrastructure, 700),
          monthlyCost: cleanString(scalingForm.monthlyCost, 500),
          costPerUnit: cleanString(scalingForm.costPerUnit, 500),
          scalingAxis: cleanString(scalingForm.scalingAxis, 700),
          breaks10x: cleanString(scalingForm.breaks10x, 700),
          fix10x: cleanString(scalingForm.fix10x, 700),
          breaks100x: cleanString(scalingForm.breaks100x, 700),
          fix100x: cleanString(scalingForm.fix100x, 700),
          unitEconomics: cleanObjectList(
            scalingForm.unitEconomics,
            [['component', 180], ['tenX', 300], ['hundredX', 300], ['thousandX', 300]],
            8
          ),
        },
      },
      codeStructure: {
        form: {
          overview: cleanString(codeForm.overview, 1200),
          layers: cleanObjectList(
            codeForm.layers,
            [['name', 180], ['purpose', 600], ['keyFolders', 700]],
            10
          ),
        },
      },
      diagrams: {
        system: {
          title: cleanString(diagrams.system?.title, 180),
          notes: cleanString(diagrams.system?.notes, 1200),
          checklist: {
            components_labeled: !!diagrams.system?.checklist?.components_labeled,
            boundaries_clear: !!diagrams.system?.checklist?.boundaries_clear,
            data_flow: !!diagrams.system?.checklist?.data_flow,
            external_deps: !!diagrams.system?.checklist?.external_deps,
            patterns_annotated: !!diagrams.system?.checklist?.patterns_annotated,
            scaling_dimension: !!diagrams.system?.checklist?.scaling_dimension,
            failure_modes: !!diagrams.system?.checklist?.failure_modes,
          },
          components: cleanObjectList(
            diagrams.system?.components,
            [
              ['name', 180],
              ['what', 500],
              ['why', 500],
              ['tech', 500],
              ['interfaces', 700],
              ['dataOwnership', 500],
              ['scaling', 500],
              ['failureModes', 700],
            ],
            12
          ),
        },
        c4: {
          title: cleanString(diagrams.c4?.title, 180),
          notes: cleanString(diagrams.c4?.notes, 1200),
        },
        custom: [],
      },
      decisions: {
        items: cleanObjectList(
          decisions.items,
          [
            ['title', 220],
            ['status', 40],
            ['context', 1000],
            ['decision', 700],
            ['rationale', 1000],
            ['implications', 900],
          ],
          8
        ).map((decision, index) => ({
          ...decision,
          status: ['proposed', 'accepted', 'superseded', 'deprecated'].includes(decision.status)
            ? decision.status
            : 'proposed',
          options: cleanObjectList(
            decisions.items?.[index]?.options,
            [['label', 160], ['description', 700], ['pros', 700], ['cons', 700]],
            5
          ),
        })),
      },
      raidAndLearnings: {
        content: cleanString(raidAndLearnings.content, 2000),
        proofs: {
          performance: !!raidAndLearnings.proofs?.performance,
          failure: !!raidAndLearnings.proofs?.failure,
        },
        raid: {
          risks: cleanString(raidAndLearnings.raid?.risks, 1200),
          assumptions: cleanString(raidAndLearnings.raid?.assumptions, 1200),
          issues: cleanString(raidAndLearnings.raid?.issues, 1200),
          decisions: cleanString(raidAndLearnings.raid?.decisions, 1200),
        },
      },
      links: {
        items: cleanObjectList(
          links.items,
          [['label', 180], ['category', 80], ['url', 1000], ['description', 500]],
          8
        ),
      },
    },
  }
}

async function callDraftProvider({ apiKey, provider = 'openai', model, evidence }) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new RepositoryAnalysisError('NO_API_KEY', 'No API key configured. Add one in Preferences -> API.')
  }
  if (!PROVIDERS[provider]) {
    throw new RepositoryAnalysisError('UNKNOWN_PROVIDER', `Unknown provider: ${provider}`)
  }

  const providerConfig = PROVIDERS[provider]
  let response
  try {
    response = await fetch(providerConfig.url, {
      method: 'POST',
      signal: AbortSignal.timeout(120000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model || providerConfig.defaultModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildEvidencePrompt(evidence) },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 6000,
        temperature: 0.2,
      }),
    })
  } catch {
    throw new RepositoryAnalysisError('NETWORK', 'Network error - check your internet connection.')
  }

  if (!response.ok) {
    switch (response.status) {
      case 400: throw new RepositoryAnalysisError('BAD_REQUEST', `Request rejected by AI provider.`)
      case 401: throw new RepositoryAnalysisError('AUTH', 'Invalid API key. Check your key in Preferences -> API.')
      case 403: throw new RepositoryAnalysisError('AUTH', 'API key lacks permission for this request.')
      case 429: throw new RepositoryAnalysisError('RATE_LIMIT', 'Rate limit reached. Wait a moment and try again.')
      case 402: throw new RepositoryAnalysisError('QUOTA', 'OpenAI account quota exceeded. Check your billing.')
      default:
        if (response.status >= 500) {
          throw new RepositoryAnalysisError('SERVER', `AI provider server error (${response.status}). Try again shortly.`)
        }
        throw new RepositoryAnalysisError('HTTP', `Request failed (${response.status}).`)
    }
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new RepositoryAnalysisError('PARSE', 'Unexpected response from AI provider.')
  }

  const raw = data?.choices?.[0]?.message?.content
  if (!raw) throw new RepositoryAnalysisError('EMPTY', 'AI returned an empty repository draft.')

  const parsed = safeJsonParse(raw)
  if (!parsed) throw new RepositoryAnalysisError('JSON', 'AI response was not valid JSON. Try again.')
  return parsed
}

async function analyzeRepositoryWithKey({ apiKey, provider, model, source, userDataPath, options }) {
  const resolvedSource = await resolveRepositorySource(source, userDataPath || os.tmpdir())
  const evidence = await buildRepositoryEvidence(resolvedSource.path, resolvedSource, options)
  const rawDraft = await callDraftProvider({ apiKey, provider, model, evidence })
  return normalizeDraft(rawDraft, evidence)
}

module.exports = {
  RepositoryAnalysisError,
  analyzeRepositoryWithKey,
  isAllowedRemoteUrl,
  readCandidateFile,
  isSensitivePath,
  redactTextWithReport,
}
