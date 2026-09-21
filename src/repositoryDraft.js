import { buildMarkdownFromForm, FORM_DEFAULTS } from './templates'
import { generateId } from './storage'

export const REPOSITORY_DRAFT_SECTION_IDS = [
  'requirements',
  'architecture',
  'scalingCost',
  'diagrams',
  'codeStructure',
  'decisions',
  'raidAndLearnings',
  'links',
]

const LINK_CATEGORIES = new Set([
  'Repository',
  'Dashboard',
  'Runbook',
  'Design Doc',
  'Ticket',
  'API Docs',
  'Deployment',
  'Monitoring',
  'Other',
])

function cleanText(value, max = 3000) {
  if (value == null) return ''
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, max)
}

function cleanList(value, maxItems, maxLen = 700) {
  if (!Array.isArray(value)) return []
  return value.map((item) => cleanText(item, maxLen)).filter(Boolean).slice(0, maxItems)
}

function normalizeRows(value, fields, maxItems) {
  if (!Array.isArray(value)) return []
  return value.slice(0, maxItems).map((item) => {
    const next = {}
    fields.forEach(([field, maxLen]) => {
      next[field] = cleanText(item?.[field], maxLen)
    })
    return next
  })
}

function normalizeRequirementsForm(form = {}) {
  return {
    ...FORM_DEFAULTS.requirements,
    frItems: cleanList(form.frItems, 8),
    availability: cleanText(form.availability, 600),
    latency: cleanText(form.latency, 600),
    scalability: cleanText(form.scalability, 600),
    durability: cleanText(form.durability, 600),
    security: cleanText(form.security, 600),
    compliance: cleanText(form.compliance, 600),
    operability: cleanText(form.operability, 600),
  }
}

function normalizeArchitectureForm(form = {}) {
  const failureModes = normalizeRows(
    form.failureModes,
    [['component', 180], ['mode', 360], ['impact', 360], ['mitigation', 500]],
    8
  )
  return {
    ...FORM_DEFAULTS.architecture,
    archType: cleanText(form.archType, 600),
    dataArch: cleanText(form.dataArch, 700),
    stateManagement: cleanText(form.stateManagement, 700),
    deploymentModel: cleanText(form.deploymentModel, 700),
    observability: cleanText(form.observability, 700),
    scalingAxis: cleanText(form.scalingAxis, 700),
    resilience: cleanText(form.resilience, 700),
    securityPosture: cleanText(form.securityPosture, 700),
    failureModes: failureModes.length ? failureModes : FORM_DEFAULTS.architecture.failureModes,
    degradationStrategy: cleanText(form.degradationStrategy, 900),
    recoveryRTO: cleanText(form.recoveryRTO, 250),
    recoveryRPO: cleanText(form.recoveryRPO, 250),
    recoveryMTTR: cleanText(form.recoveryMTTR, 250),
    deferred: cleanList(form.deferred, 8),
  }
}

function normalizeScalingForm(form = {}) {
  const unitEconomics = normalizeRows(
    form.unitEconomics,
    [['component', 180], ['tenX', 300], ['hundredX', 300], ['thousandX', 300]],
    8
  )
  return {
    ...FORM_DEFAULTS.scalingCost,
    load: cleanText(form.load, 700),
    infrastructure: cleanText(form.infrastructure, 700),
    monthlyCost: cleanText(form.monthlyCost, 500),
    costPerUnit: cleanText(form.costPerUnit, 500),
    scalingAxis: cleanText(form.scalingAxis, 700),
    breaks10x: cleanText(form.breaks10x, 700),
    fix10x: cleanText(form.fix10x, 700),
    breaks100x: cleanText(form.breaks100x, 700),
    fix100x: cleanText(form.fix100x, 700),
    unitEconomics: unitEconomics.length ? unitEconomics : FORM_DEFAULTS.scalingCost.unitEconomics,
  }
}

function normalizeCodeStructureForm(form = {}) {
  const layers = normalizeRows(
    form.layers,
    [['name', 180], ['purpose', 600], ['keyFolders', 700]],
    10
  )
  return {
    ...FORM_DEFAULTS.codeStructure,
    overview: cleanText(form.overview, 1200),
    layers: layers.length ? layers : FORM_DEFAULTS.codeStructure.layers,
  }
}

function withGeneratedMarkdown(sectionType, form) {
  return {
    form,
    content: buildMarkdownFromForm(sectionType, form),
  }
}

function normalizeDiagrams(existing = {}, draft = {}) {
  const currentSystem = existing.system || {}
  const currentC4 = existing.c4 || {}
  const currentCustom = existing.custom || []
  const system = draft.system || {}
  const c4 = draft.c4 || {}

  return {
    ...existing,
    system: {
      ...currentSystem,
      title: cleanText(system.title, 180) || currentSystem.title || '',
      notes: cleanText(system.notes, 1200) || currentSystem.notes || '',
      checklist: {
        ...(currentSystem.checklist || {}),
        ...(system.checklist || {}),
      },
      components: normalizeRows(
        system.components,
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
      ).map((component) => ({
        id: generateId(),
        ...component,
      })),
      imageData: currentSystem.imageData || null,
      link: currentSystem.link || '',
    },
    c4: {
      ...currentC4,
      title: cleanText(c4.title, 180) || currentC4.title || '',
      notes: cleanText(c4.notes, 1200) || currentC4.notes || '',
      imageData: currentC4.imageData || null,
      link: currentC4.link || '',
    },
    custom: currentCustom,
  }
}

function normalizeDecisions(draft = {}) {
  const items = Array.isArray(draft.items) ? draft.items : []
  return {
    items: items.slice(0, 8).map((item) => ({
      id: generateId(),
      title: cleanText(item.title, 220),
      status: ['proposed', 'accepted', 'superseded', 'deprecated'].includes(item.status)
        ? item.status
        : 'proposed',
      context: cleanText(item.context, 1000),
      options: normalizeRows(
        item.options,
        [['label', 160], ['description', 700], ['pros', 700], ['cons', 700]],
        5
      ).map((option) => ({ id: generateId(), ...option })),
      decision: cleanText(item.decision, 700),
      rationale: cleanText(item.rationale, 1000),
      implications: cleanText(item.implications, 900),
    })),
  }
}

function normalizeRaidAndLearnings(existing = {}, draft = {}) {
  return {
    ...existing,
    content: cleanText(draft.content, 2000) || existing.content || '',
    proofs: {
      performance: !!draft.proofs?.performance,
      failure: !!draft.proofs?.failure,
    },
    raid: {
      risks: cleanText(draft.raid?.risks, 1200),
      assumptions: cleanText(draft.raid?.assumptions, 1200),
      issues: cleanText(draft.raid?.issues, 1200),
      decisions: cleanText(draft.raid?.decisions, 1200),
    },
  }
}

function normalizeLinks(draft = {}) {
  const items = Array.isArray(draft.items) ? draft.items : []
  return {
    items: items.slice(0, 8).map((item) => ({
      id: generateId(),
      label: cleanText(item.label, 180),
      category: LINK_CATEGORIES.has(item.category) ? item.category : 'Other',
      url: cleanText(item.url, 1000),
      description: cleanText(item.description, 500),
    })),
  }
}

function buildDecisionsPreview(decisions = {}) {
  const items = Array.isArray(decisions.items) ? decisions.items : []
  if (!items.length) return '# Decisions\n\n_No decisions generated._\n'
  return [
    '# Decisions',
    ...items.slice(0, 8).map((item) => {
      const lines = [`## ${cleanText(item.title, 220) || 'Untitled Decision'}`]
      lines.push(`**Status:** ${cleanText(item.status, 40) || 'proposed'}`)
      if (item.context) lines.push(`\n### Context\n${cleanText(item.context, 1000)}`)
      if (Array.isArray(item.options) && item.options.length) {
        lines.push('\n### Options')
        item.options.slice(0, 5).forEach((option) => {
          lines.push(`\n#### ${cleanText(option.label, 160) || 'Option'}`)
          if (option.description) lines.push(cleanText(option.description, 700))
          if (option.pros) lines.push(`\n**Pros:**\n${cleanText(option.pros, 700)}`)
          if (option.cons) lines.push(`\n**Cons:**\n${cleanText(option.cons, 700)}`)
        })
      }
      if (item.decision) lines.push(`\n### Decision Made\n${cleanText(item.decision, 700)}`)
      if (item.rationale) lines.push(`\n### Rationale\n${cleanText(item.rationale, 1000)}`)
      if (item.implications) lines.push(`\n### Implications\n${cleanText(item.implications, 900)}`)
      return lines.join('\n')
    }),
  ].join('\n\n')
}

function buildDiagramsPreview(diagrams = {}) {
  const system = diagrams.system || {}
  const c4 = diagrams.c4 || {}
  const components = Array.isArray(system.components) ? system.components : []
  const lines = ['# Diagrams & Components']
  lines.push('\n## System Diagram')
  if (system.title) lines.push(`**Title:** ${cleanText(system.title, 180)}`)
  if (system.notes) lines.push(cleanText(system.notes, 1200))
  if (components.length) {
    lines.push('\n### Component Breakdown')
    components.slice(0, 12).forEach((component) => {
      lines.push(`\n#### ${cleanText(component.name, 180) || 'Component'}`)
      if (component.what) lines.push(`- What it does: ${cleanText(component.what, 500)}`)
      if (component.why) lines.push(`- Why it is separate: ${cleanText(component.why, 500)}`)
      if (component.tech) lines.push(`- Technology: ${cleanText(component.tech, 500)}`)
      if (component.interfaces) lines.push(`- Interfaces: ${cleanText(component.interfaces, 700)}`)
      if (component.dataOwnership) lines.push(`- Data ownership: ${cleanText(component.dataOwnership, 500)}`)
      if (component.scaling) lines.push(`- Scaling: ${cleanText(component.scaling, 500)}`)
      if (component.failureModes) lines.push(`- Failure modes: ${cleanText(component.failureModes, 700)}`)
    })
  }
  lines.push('\n## C4 Diagram')
  if (c4.title) lines.push(`**Title:** ${cleanText(c4.title, 180)}`)
  if (c4.notes) lines.push(cleanText(c4.notes, 1200))
  return `${lines.join('\n')}\n`
}

function buildRaidPreview(raidAndLearnings = {}) {
  const raid = raidAndLearnings.raid || {}
  return [
    '# RAID Log / Learnings',
    '',
    '## Learnings & Proof',
    cleanText(raidAndLearnings.content, 2000) || '_No learnings generated._',
    '',
    '## Risks',
    cleanText(raid.risks, 1200) || '_None generated._',
    '',
    '## Assumptions',
    cleanText(raid.assumptions, 1200) || '_None generated._',
    '',
    '## Issues',
    cleanText(raid.issues, 1200) || '_None generated._',
    '',
    '## Decisions',
    cleanText(raid.decisions, 1200) || '_None generated._',
  ].join('\n')
}

function buildLinksPreview(links = {}) {
  const items = Array.isArray(links.items) ? links.items : []
  if (!items.length) return '# References\n\n_No references generated._\n'
  const lines = items.slice(0, 8).map((item) => {
    const label = cleanText(item.label, 180) || 'Reference'
    const url = cleanText(item.url, 1000)
    const description = cleanText(item.description, 500)
    const category = cleanText(item.category, 80) || 'Other'
    const target = url ? `[${label}](${url})` : label
    return `- ${target} (${category})${description ? ` - ${description}` : ''}`
  })
  return `# References\n\n${lines.join('\n')}\n`
}

export function getRepositoryDraftSectionPreview(draft, sectionId) {
  const sections = draft?.sections || {}
  switch (sectionId) {
    case 'requirements':
      return buildMarkdownFromForm('requirements', normalizeRequirementsForm(sections.requirements?.form))
    case 'architecture':
      return buildMarkdownFromForm('architecture', normalizeArchitectureForm(sections.architecture?.form))
    case 'scalingCost':
      return buildMarkdownFromForm('scalingCost', normalizeScalingForm(sections.scalingCost?.form))
    case 'codeStructure':
      return buildMarkdownFromForm('codeStructure', normalizeCodeStructureForm(sections.codeStructure?.form))
    case 'diagrams':
      return buildDiagramsPreview(sections.diagrams)
    case 'decisions':
      return buildDecisionsPreview(sections.decisions)
    case 'raidAndLearnings':
      return buildRaidPreview(sections.raidAndLearnings)
    case 'links':
      return buildLinksPreview(sections.links)
    default:
      return ''
  }
}

function sanitizeReferenceUrl(value) {
  const raw = cleanText(value, 1000)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    url.username = ''
    url.password = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return raw.replace(/\/\/[^/@\s]+@/, '//[redacted]@')
  }
}

export function getRepositoryReferenceFromDraft(draft) {
  const metadata = draft?.metadata || {}
  const source = metadata.source || {}
  const url = sanitizeReferenceUrl(source.url || metadata.remote)
  const label = cleanText(source.displayName, 180) || (url ? 'Repository' : 'Local repository')
  const commit = metadata.commitSha ? metadata.commitSha.slice(0, 10) : 'unknown commit'

  return {
    id: generateId(),
    label,
    category: 'Repository',
    url,
    description: `Repository analyzed at ${commit}.`,
  }
}

function isSameReference(a, b) {
  if (a.url && b.url && a.url === b.url) return true
  return a.category === 'Repository' && b.category === 'Repository' && a.label === b.label
}

function mergeLinkItems(existingItems = [], newItems = []) {
  const merged = [...existingItems]
  newItems.forEach((item) => {
    const existingIndex = merged.findIndex((candidate) => isSameReference(candidate, item))
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...merged[existingIndex], ...item, id: merged[existingIndex].id || item.id }
    } else {
      merged.unshift(item)
    }
  })
  return merged
}

export function upsertRepositoryReference(version, draft) {
  const reference = getRepositoryReferenceFromDraft(draft)
  return {
    ...version,
    links: {
      ...(version.links || {}),
      items: mergeLinkItems(version.links?.items || [], [reference]),
    },
  }
}

export function getGeneratedSectionIds(draft) {
  const sections = draft?.sections || {}
  return REPOSITORY_DRAFT_SECTION_IDS.filter((sectionId) => {
    if (!sections[sectionId]) return false
    if (sectionId === 'raidAndLearnings') return !!sections.raidAndLearnings
    return true
  })
}

export function hasExistingSectionContent(version, sectionId) {
  switch (sectionId) {
    case 'requirements':
    case 'architecture':
    case 'scalingCost':
    case 'codeStructure':
      return !!version?.[sectionId]?.content?.trim()
    case 'diagrams':
      return !!(
        version?.diagrams?.system?.components?.length ||
        version?.diagrams?.system?.notes?.trim() ||
        version?.diagrams?.c4?.notes?.trim() ||
        version?.diagrams?.custom?.length
      )
    case 'decisions':
      return !!version?.decisions?.items?.length
    case 'raidAndLearnings':
      return !!(
        version?.raidAndLearnings?.content?.trim() ||
        version?.raidAndLearnings?.raid?.risks?.trim() ||
        version?.raidAndLearnings?.raid?.assumptions?.trim() ||
        version?.raidAndLearnings?.raid?.issues?.trim() ||
        version?.raidAndLearnings?.raid?.decisions?.trim()
      )
    case 'links':
      return !!version?.links?.items?.length
    default:
      return false
  }
}

export function applyRepositoryDraft(version, draft, sectionIds = REPOSITORY_DRAFT_SECTION_IDS) {
  const sections = draft?.sections || {}
  const appliedSections = Array.from(
    new Set([...(version.repoAnalysis?.appliedSections || []), ...sectionIds])
  )
  let next = {
    ...version,
    repoAnalysis: {
      ...(version.repoAnalysis || {}),
      draft,
      lastAppliedAt: new Date().toISOString(),
      appliedSections,
    },
  }

  if (sectionIds.includes('requirements') && sections.requirements) {
    const form = normalizeRequirementsForm(sections.requirements.form)
    next = { ...next, requirements: withGeneratedMarkdown('requirements', form) }
  }

  if (sectionIds.includes('architecture') && sections.architecture) {
    const form = normalizeArchitectureForm(sections.architecture.form)
    next = { ...next, architecture: withGeneratedMarkdown('architecture', form) }
  }

  if (sectionIds.includes('scalingCost') && sections.scalingCost) {
    const form = normalizeScalingForm(sections.scalingCost.form)
    next = { ...next, scalingCost: withGeneratedMarkdown('scalingCost', form) }
  }

  if (sectionIds.includes('codeStructure') && sections.codeStructure) {
    const form = normalizeCodeStructureForm(sections.codeStructure.form)
    next = { ...next, codeStructure: withGeneratedMarkdown('codeStructure', form) }
  }

  if (sectionIds.includes('diagrams') && sections.diagrams) {
    next = { ...next, diagrams: normalizeDiagrams(version.diagrams, sections.diagrams) }
  }

  if (sectionIds.includes('decisions') && sections.decisions) {
    next = { ...next, decisions: normalizeDecisions(sections.decisions) }
  }

  if (sectionIds.includes('raidAndLearnings') && sections.raidAndLearnings) {
    next = {
      ...next,
      raidAndLearnings: normalizeRaidAndLearnings(version.raidAndLearnings, sections.raidAndLearnings),
    }
  }

  if (sectionIds.includes('links') && sections.links) {
    const generatedLinks = normalizeLinks(sections.links)
    next = {
      ...next,
      links: {
        ...generatedLinks,
        items: mergeLinkItems(generatedLinks.items, (version.links?.items || []).filter((item) => item.category === 'Repository')),
      },
    }
  }

  return next
}
