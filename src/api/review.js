/**
 * AI section review module.
 *
 * Security notes:
 * - The API key is ONLY ever placed in the Authorization header of the fetch call.
 * - It is never logged, never included in error messages, never returned.
 * - This module has no React dependency and can be tested in isolation.
 */

// ─── System prompt ────────────────────────────────────────────────────────────

// NOTE: "JSON" must appear in this prompt for OpenAI's json_object response_format to work.
const SYSTEM_PROMPT = `You are a staff-level software architect reviewing architecture documentation. Your job is to give a calibrated, fair assessment — harsh on genuine gaps, but equally willing to recognise high-quality work with a high score. A Principal or Staff-quality document that genuinely meets the bar should receive 8–10. Do not manufacture problems to avoid giving a deserved score.

Review the following section of an architecture document against the standards at each engineering level.

GRADING CRITERIA:
- Junior: Documents what exists but lacks rationale, tradeoffs, failure modes, or operational reality. Answers "what" but not "why" or "what if".
- Senior: Articulates decisions with tradeoffs, identifies failure modes, quantifies where needed. Answers "why" and anticipates "what if".
- Principal: Demonstrates systemic thinking, cross-team impact, long-term evolvability, cost/risk awareness at scale. Proactively surfaces gaps a reader would hit in production.
- Staff: Functions as a decision-making artefact — precise, complete, no critical ambiguities, could onboard a new team or survive an incident postmortem without supplementary explanation.

SCORING GUIDE:
- 1–3: Sparse, vague, or missing critical information. A reader would be blocked or misled.
- 4–5: Covers basics but leaves significant gaps in rationale, tradeoffs, or failure thinking.
- 6–7: Solid; meets the level criteria but has identifiable room for improvement.
- 8–9: Strong work a senior panel would approve with minor feedback. Meets or exceeds the level criteria.
- 10: Exceptional — nothing meaningful left unsaid for this scope. Rare, but award it when earned.

RULES:
- Calibrate in both directions. Genuine quality deserves a high score; genuine gaps deserve a low one.
- Only evaluate what is WRITTEN. Do not assume, infer, or credit things not stated.
- Sparse or empty content scores 1–2. Say so plainly.
- Improvements must be SPECIFIC, ACTIONABLE, and PROPORTIONAL to the score. A score of 8+ calls for minor refinements, not structural critiques. A score of 4 or below calls for substantive feedback on real gaps.
- Reference established frameworks only where directly relevant: CAP theorem, PACELC, C4 model, ADRs, 12-factor, DORA, SLO/SLA/SLI, RPO/RTO, STRIDE, circuit breaker, saga pattern, CQRS, event sourcing, etc.
- Do NOT hallucinate gaps or invent missing concerns. Only flag something as absent if it is materially important to this section's purpose.

SECTION BEING REVIEWED: {{SECTION_LABEL}}

Respond ONLY with valid JSON matching this exact schema — no markdown, no prose outside the JSON:
{
  "level": "Junior" | "Senior" | "Principal" | "Staff",
  "score": <integer 1-10>,
  "summary": "<2-3 sentences: acknowledge genuine strengths, then identify real gaps if any>",
  "improvements": [
    "<specific, proportional improvement>"
  ]
}

The improvements array must contain between 1 and 5 items. Use fewer items for high-scoring work.`

// ─── Provider config ──────────────────────────────────────────────────────────

export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.4-mini',
  },
}

// Assume all current models support vision
function supportsVision(_model) {
  return true
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ReviewError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
    this.name = 'ReviewError'
  }
}

// ─── Section label resolver ───────────────────────────────────────────────────

const BASE_SECTION_LABELS = {
  requirements: 'Requirements',
  architecture: 'Architecture',
  scalingCost: 'Scaling & Cost',
  diagrams: 'Diagrams',
  codeStructure: 'Code Structure',
  failuresLearnings: 'Failures & Learnings',
  links: 'Links',
}

export function resolveSectionLabel(sectionId, customSections = []) {
  return (
    BASE_SECTION_LABELS[sectionId] ||
    customSections.find((s) => s.id === sectionId)?.label ||
    sectionId
  )
}

// ─── Section content builder ──────────────────────────────────────────────────

/**
 * Extracts reviewable content from a section's data object.
 * Returns { text: string, images: string[] }
 *
 * Images are raw base64 data URLs (data:image/...) for vision-capable models.
 * Only valid data:image/ URLs are included — never arbitrary strings.
 */
export function buildSectionContent(sectionId, sectionData, customSections = []) {
  if (!sectionData) {
    return { text: `(No content in ${resolveSectionLabel(sectionId, customSections)} section.)`, images: [] }
  }

  switch (sectionId) {
    case 'diagrams':
      return buildDiagramsContent(sectionData)
    case 'failuresLearnings':
      return buildFailuresContent(sectionData)
    case 'links':
      return buildLinksContent(sectionData)
    default:
      // Text sections (requirements, architecture, scalingCost, codeStructure, custom)
      return {
        text: sectionData.content?.trim() || `(No content written yet in ${resolveSectionLabel(sectionId, customSections)} section.)`,
        images: [],
      }
  }
}

function isValidImageDataUrl(url) {
  return typeof url === 'string' && url.startsWith('data:image/')
}

function buildDiagramsContent(data) {
  const parts = []
  const images = []

  // System diagram
  const sys = data.system || {}
  parts.push('## System Diagram')
  if (sys.title) parts.push(`Title: ${sys.title}`)
  if (sys.notes?.trim()) parts.push(`Notes:\n${sys.notes}`)
  if (isValidImageDataUrl(sys.imageData)) images.push(sys.imageData)
  else parts.push('(No system diagram image uploaded)')

  // Component breakdown — high-value signal for the AI
  if (sys.components?.length) {
    parts.push('### Component Breakdown')
    sys.components.forEach((c) => {
      parts.push(`#### ${c.name || 'Unnamed component'}`)
      if (c.what) parts.push(`- What it does: ${c.what}`)
      if (c.why) parts.push(`- Why it's separate: ${c.why}`)
      if (c.tech) parts.push(`- Technology: ${c.tech}`)
      if (c.interfaces) parts.push(`- Interfaces: ${c.interfaces}`)
      if (c.dataOwnership) parts.push(`- Data ownership: ${c.dataOwnership}`)
      if (c.scaling) parts.push(`- Scaling: ${c.scaling}`)
      if (c.failureModes) parts.push(`- Failure modes: ${c.failureModes}`)
    })
  } else {
    parts.push('(No component breakdown added)')
  }

  // Checklist completion
  const checklist = sys.checklist || {}
  const checklistKeys = Object.keys(checklist)
  if (checklistKeys.length) {
    const checked = checklistKeys.filter((k) => checklist[k]).length
    parts.push(`System diagram checklist: ${checked}/${checklistKeys.length} items completed`)
  }

  // C4 diagram
  const c4 = data.c4 || {}
  parts.push('\n## C4 Diagram')
  if (c4.title) parts.push(`Title: ${c4.title}`)
  if (c4.notes?.trim()) parts.push(`Notes:\n${c4.notes}`)
  if (isValidImageDataUrl(c4.imageData)) images.push(c4.imageData)
  else parts.push('(No C4 diagram image uploaded)')

  // Custom diagrams
  if (data.custom?.length) {
    parts.push('\n## Additional Diagrams')
    data.custom.forEach((d) => {
      parts.push(`### ${d.name || d.type || 'Diagram'} (type: ${d.type || 'unknown'})`)
      if (d.notes?.trim()) parts.push(`Notes:\n${d.notes}`)
      if (isValidImageDataUrl(d.imageData)) images.push(d.imageData)
    })
  }

  return { text: parts.join('\n'), images }
}

function buildFailuresContent(data) {
  const parts = []

  if (data.content?.trim()) {
    parts.push(data.content)
  } else {
    parts.push('(No failures and learnings content written.)')
  }

  // RAID log — meaningful signal even when partially filled
  const raid = data.raid || {}
  const raidContent = [
    raid.risks && `Risks: ${raid.risks}`,
    raid.assumptions && `Assumptions: ${raid.assumptions}`,
    raid.issues && `Issues: ${raid.issues}`,
    raid.decisions && `Decisions: ${raid.decisions}`,
  ].filter(Boolean)

  if (raidContent.length) {
    parts.push('\n## RAID Log')
    parts.push(raidContent.join('\n'))
  } else {
    parts.push('\n## RAID Log\n(Not filled in.)')
  }

  // Proof checklist state
  const proofs = data.proofs || {}
  const proofLines = []
  if ('performance' in proofs) proofLines.push(`Performance proof: ${proofs.performance ? 'Yes' : 'No'}`)
  if ('failure' in proofs) proofLines.push(`Failure proof: ${proofs.failure ? 'Yes' : 'No'}`)
  if (proofLines.length) {
    parts.push('\n## Evidence\n' + proofLines.join('\n'))
  }

  return { text: parts.join('\n'), images: [] }
}

function buildLinksContent(data) {
  const items = data.items || []
  if (!items.length) return { text: '(No links added.)', images: [] }

  const lines = items.map((item) => {
    const label = item.label || 'Link'
    const url = item.url || '(no URL)'
    const desc = item.description ? ` — ${item.description}` : ''
    const cat = item.category ? ` [${item.category}]` : ''
    return `- ${label}${cat}: ${url}${desc}`
  })

  return { text: `## Links\n\n${lines.join('\n')}`, images: [] }
}

// ─── Main review function ─────────────────────────────────────────────────────

/**
 * Calls the configured AI provider to review a section.
 *
 * @param {object} params
 * @param {string} params.apiKey        - Provider API key (never logged)
 * @param {string} params.model         - Model ID (e.g. "gpt-4o-mini")
 * @param {string} params.provider      - Provider key (e.g. "openai")
 * @param {string} params.sectionId     - Section identifier
 * @param {object} params.sectionData   - Raw section data from the version
 * @param {Array}  params.customSections - Custom section definitions from prefs
 * @param {AbortSignal} [params.signal] - Optional AbortController signal
 *
 * @returns {Promise<{ level, score, summary, improvements }>}
 * @throws {ReviewError} with a user-safe message (never exposes the key)
 */
export async function callReview({
  apiKey,
  model,
  provider = 'openai',
  sectionId,
  sectionData,
  customSections = [],
  signal,
}) {
  // Validate inputs before touching the network
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new ReviewError('NO_API_KEY', 'No API key configured. Add one in Preferences → API.')
  }
  if (!sectionId) {
    throw new ReviewError('NO_SECTION', 'No section selected for review.')
  }
  if (!PROVIDERS[provider]) {
    throw new ReviewError('UNKNOWN_PROVIDER', `Unknown provider: ${provider}`)
  }

  const sectionLabel = resolveSectionLabel(sectionId, customSections)
  const { text, images } = buildSectionContent(sectionId, sectionData, customSections)
  const systemPrompt = SYSTEM_PROMPT.replace('{{SECTION_LABEL}}', sectionLabel)

  // Build the user message content array (OpenAI vision format)
  const userContent = [{ type: 'text', text }]

  // Include images only if the model supports vision
  if (supportsVision(model) && images.length > 0) {
    images.forEach((imgDataUrl) => {
      // Use detail: 'low' — fixed 85-token cost per image, sufficient for diagrams
      userContent.push({
        type: 'image_url',
        image_url: { url: imgDataUrl, detail: 'low' },
      })
    })
  }

  const providerConfig = PROVIDERS[provider]

  let response
  try {
    response = await fetch(providerConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API key is ONLY placed here — never logged, never in body
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model || providerConfig.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        // JSON mode — guarantees parseable JSON output
        // Requires "json" to appear in the prompt (it does, above)
        response_format: { type: 'json_object' },
        max_completion_tokens: 800,
        temperature: 0.3,
      }),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err // Re-throw AbortError as-is
    throw new ReviewError('NETWORK', 'Network error — check your internet connection.')
  }

  // Map HTTP errors to user-safe messages — never expose the key in these
  if (!response.ok) {
    // Try to extract the provider's error message for non-auth errors
    let providerMessage = ''
    if (response.status === 400 || response.status >= 500) {
      try {
        const errBody = await response.json()
        providerMessage = errBody?.error?.message ? ` — ${errBody.error.message}` : ''
      } catch { /* ignore parse failures */ }
    }
    switch (response.status) {
      case 400: throw new ReviewError('BAD_REQUEST', `Request rejected by AI provider${providerMessage || '. Check your API key in Preferences → API.'}`)
      case 401: throw new ReviewError('AUTH', 'Invalid API key. Check your key in Preferences → API.')
      case 403: throw new ReviewError('AUTH', 'API key lacks permission for this request.')
      case 429: throw new ReviewError('RATE_LIMIT', 'Rate limit reached. Wait a moment and try again.')
      case 402: throw new ReviewError('QUOTA', 'OpenAI account quota exceeded. Check your billing.')
      default:
        if (response.status >= 500) {
          throw new ReviewError('SERVER', `AI provider server error (${response.status})${providerMessage}. Try again shortly.`)
        }
        throw new ReviewError('HTTP', `Request failed (${response.status}).`)
    }
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new ReviewError('PARSE', 'Unexpected response from AI provider.')
  }

  const raw = data?.choices?.[0]?.message?.content
  if (!raw) throw new ReviewError('EMPTY', 'AI returned an empty response. Try again.')

  let result
  try {
    result = JSON.parse(raw)
  } catch {
    throw new ReviewError('JSON', 'AI response was not valid JSON. Try again.')
  }

  // Validate schema — JSON mode guarantees JSON but not our schema
  const validLevels = ['Junior', 'Senior', 'Principal', 'Staff']
  if (!validLevels.includes(result.level)) {
    throw new ReviewError('SCHEMA', 'AI returned an unexpected review format. Try again.')
  }
  if (typeof result.score !== 'number' || result.score < 1 || result.score > 10) {
    throw new ReviewError('SCHEMA', 'AI returned an invalid score. Try again.')
  }
  if (typeof result.summary !== 'string' || !result.summary.trim()) {
    throw new ReviewError('SCHEMA', 'AI returned an invalid summary. Try again.')
  }
  if (!Array.isArray(result.improvements) || result.improvements.length < 1) {
    throw new ReviewError('SCHEMA', 'AI returned no improvements. Try again.')
  }

  return {
    level: result.level,
    score: Math.round(result.score),
    // Force strings — guards against any unexpected types from the API
    summary: String(result.summary).trim(),
    improvements: result.improvements
      .map((i) => String(i).trim())
      .filter(Boolean)
      .slice(0, 5),
  }
}
