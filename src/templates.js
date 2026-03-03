export const SECTION_TEMPLATES = {
  requirements: `# Requirements

## Functional Requirements (FR)
- FR1:
- FR2:
- FR3:

## Non-Functional Requirements (NFR)
- Availability:
- Latency / performance:
- Scalability axis:
- Durability (RPO/RTO):
- Security posture:
- Compliance / privacy (if relevant):
- Operability:
`,

  architecture: `# Architecture

## Core Decisions
- **Decision**: [What you chose]
  - Constraint: [Why]
  - Alternatives: [What you didn't choose]
  - Tradeoff: [What you gave up]

## System Traits
- Architecture type:
- Data architecture & consistency:
- State management:
- Deployment model:
- Observability:
- Scaling axis:
- Resilience posture:
- Security posture:

## Known Tradeoffs / Deferred Decisions
-
`,

  scalingCost: `# Scaling & Cost Profile

## Current State
- Load: [users, requests, data volume]
- Infrastructure:
- Monthly cost: [total + breakdown]
- Cost per unit: [per scan/user/request]

## Primary Scaling Axis
[users / concurrency / data volume / R/W throughput / inference / regions]

## Bottlenecks & Mitigation
- 10x: [what breaks] → [fix]
- 100x: [what breaks] → [fix]

## Unit Economics & ROI (if applicable)
| Component | 10x | 100x | 1000x |
|-----------|-----|------|-------|
|           |     |      |       |
`,

  codeStructure: `# Code Structure

## Overview
[2–3 sentences]

## High-Level Organization
- Layer/Domain: [Name]
  - Purpose:
  - Key folders:

- Layer/Domain: [Name]
  - Purpose:
  - Key folders:
`,

  failuresLearnings: `# Failures & Learnings Log

## [Date] | [Title]
- What happened:
- Root cause:
- Impact:
- Pattern learned:
- Prevention / Fix:
`,
}

export const SYSTEM_DIAGRAM_CHECKLIST = [
  { id: 'components_labeled', label: 'Components labeled with primary responsibility' },
  { id: 'boundaries_clear', label: 'Boundaries clear (in-process vs distributed; trust boundaries if relevant)' },
  { id: 'data_flow', label: 'Data flow direction indicated (sync vs async)' },
  { id: 'external_deps', label: 'External dependencies marked' },
  { id: 'patterns_annotated', label: 'Key patterns annotated (pub/sub, cache, circuit breaker, etc.)' },
  { id: 'scaling_dimension', label: 'Scaling dimension identified per component' },
  { id: 'failure_modes', label: 'Failure modes shown or noted' },
]

export const SEQUENCE_DIAGRAM_CHECKLIST = [
  { id: 'actors_identified', label: 'Actors/components identified' },
  { id: 'async_boundaries', label: 'Async boundaries marked' },
  { id: 'persistence_boundaries', label: 'Persistence boundaries clear' },
  { id: 'failure_paths', label: 'Failure paths shown' },
  { id: 'retry_logic', label: 'Retry logic visible (where/how many)' },
  { id: 'timeouts', label: 'Timeouts identified' },
  { id: 'idempotency', label: 'Idempotency described (exactly-once vs at-least-once intent)' },
]

export const COMPONENT_FIELDS = [
  { id: 'what', label: 'What it does (one sentence)' },
  { id: 'why', label: "Why it's separate (boundary rationale)" },
  { id: 'tech', label: 'Technology choice (and why)' },
  { id: 'interfaces', label: 'Interfaces (API/events)' },
  { id: 'dataOwnership', label: 'Data ownership (owns / reads / writes)' },
  { id: 'scaling', label: 'Scaling characteristics (dimension, limits)' },
  { id: 'failureModes', label: 'Key failure modes (top 1–2)' },
]

// ─── Form defaults ────────────────────────────────────────────────────────────

export const FORM_DEFAULTS = {
  requirements: {
    frItems: [''],
    availability: '',
    latency: '',
    scalability: '',
    durability: '',
    security: '',
    compliance: '',
    operability: '',
  },
  architecture: {
    decisions: [{ decision: '', constraint: '', alternatives: '', tradeoff: '' }],
    archType: '',
    dataArch: '',
    stateManagement: '',
    deploymentModel: '',
    observability: '',
    scalingAxis: '',
    resilience: '',
    securityPosture: '',
    deferred: [''],
  },
  scalingCost: {
    load: '',
    infrastructure: '',
    monthlyCost: '',
    costPerUnit: '',
    scalingAxis: '',
    breaks10x: '',
    fix10x: '',
    breaks100x: '',
    fix100x: '',
    unitEconomics: [{ component: '', tenX: '', hundredX: '', thousandX: '' }],
  },
  codeStructure: {
    overview: '',
    layers: [{ name: '', purpose: '', keyFolders: '' }],
  },
  failuresLearnings: {
    entries: [{ date: '', title: '', whatHappened: '', rootCause: '', impact: '', patternLearned: '', prevention: '' }],
  },
}

// ─── Markdown builders ────────────────────────────────────────────────────────

export function buildMarkdownFromForm(sectionType, form) {
  switch (sectionType) {
    case 'requirements': return buildRequirements(form)
    case 'architecture': return buildArchitecture(form)
    case 'scalingCost': return buildScalingCost(form)
    case 'codeStructure': return buildCodeStructure(form)
    case 'failuresLearnings': return buildFailuresLearnings(form)
    default: return ''
  }
}

function buildRequirements(form) {
  const frItems = form.frItems || ['']
  const frLines = frItems
    .filter((item) => item.trim())
    .map((item, i) => `- FR${i + 1}: ${item}`)
    .join('\n') || '- FR1: '

  const nfrFields = [
    ['Availability', form.availability],
    ['Latency / performance', form.latency],
    ['Scalability axis', form.scalability],
    ['Durability (RPO/RTO)', form.durability],
    ['Security posture', form.security],
    ['Compliance / privacy (if relevant)', form.compliance],
    ['Operability', form.operability],
  ]
  const nfrLines = nfrFields.map(([label, val]) => `- ${label}: ${val || ''}`).join('\n')

  return `# Requirements\n\n## Functional Requirements (FR)\n${frLines}\n\n## Non-Functional Requirements (NFR)\n${nfrLines}\n`
}

function buildArchitecture(form) {
  const decisions = form.decisions || []
  const decisionBlock = decisions
    .map(
      (d) =>
        `- **Decision**: ${d.decision || ''}\n  - Constraint: ${d.constraint || ''}\n  - Alternatives: ${d.alternatives || ''}\n  - Tradeoff: ${d.tradeoff || ''}`
    )
    .join('\n\n') || '- **Decision**: \n  - Constraint: \n  - Alternatives: \n  - Tradeoff: '

  const traits = [
    ['Architecture type', form.archType],
    ['Data architecture & consistency', form.dataArch],
    ['State management', form.stateManagement],
    ['Deployment model', form.deploymentModel],
    ['Observability', form.observability],
    ['Scaling axis', form.scalingAxis],
    ['Resilience posture', form.resilience],
    ['Security posture', form.securityPosture],
  ]
  const traitsBlock = traits.map(([label, val]) => `- ${label}: ${val || ''}`).join('\n')

  const deferred = form.deferred || ['']
  const deferredLines =
    deferred
      .filter((d) => d.trim())
      .map((d) => `- ${d}`)
      .join('\n') || '-'

  return `# Architecture\n\n## Core Decisions\n${decisionBlock}\n\n## System Traits\n${traitsBlock}\n\n## Known Tradeoffs / Deferred Decisions\n${deferredLines}\n`
}

function buildScalingCost(form) {
  const unitRows =
    (form.unitEconomics || [])
      .map((row) => `| ${row.component || ''} | ${row.tenX || ''} | ${row.hundredX || ''} | ${row.thousandX || ''} |`)
      .join('\n') || '|           |     |      |       |'

  return `# Scaling & Cost Profile\n\n## Current State\n- Load: ${form.load || ''}\n- Infrastructure: ${form.infrastructure || ''}\n- Monthly cost: ${form.monthlyCost || ''}\n- Cost per unit: ${form.costPerUnit || ''}\n\n## Primary Scaling Axis\n${form.scalingAxis || ''}\n\n## Bottlenecks & Mitigation\n- 10x: ${form.breaks10x || '[what breaks]'} → ${form.fix10x || '[fix]'}\n- 100x: ${form.breaks100x || '[what breaks]'} → ${form.fix100x || '[fix]'}\n\n## Unit Economics & ROI (if applicable)\n| Component | 10x | 100x | 1000x |\n|-----------|-----|------|-------|\n${unitRows}\n`
}

function buildCodeStructure(form) {
  const layers = form.layers || []
  const layerBlock =
    layers
      .map(
        (layer) =>
          `- Layer/Domain: ${layer.name || ''}\n  - Purpose: ${layer.purpose || ''}\n  - Key folders: ${layer.keyFolders || ''}`
      )
      .join('\n\n') || '- Layer/Domain: \n  - Purpose: \n  - Key folders: '

  return `# Code Structure\n\n## Overview\n${form.overview || ''}\n\n## High-Level Organization\n${layerBlock}\n`
}

function buildFailuresLearnings(form) {
  const entries = form.entries || []
  const entriesBlock =
    entries
      .map(
        (entry) =>
          `## ${entry.date || '[Date]'} | ${entry.title || '[Title]'}\n- What happened: ${entry.whatHappened || ''}\n- Root cause: ${entry.rootCause || ''}\n- Impact: ${entry.impact || ''}\n- Pattern learned: ${entry.patternLearned || ''}\n- Prevention / Fix: ${entry.prevention || ''}`
      )
      .join('\n\n') ||
    '## [Date] | [Title]\n- What happened:\n- Root cause:\n- Impact:\n- Pattern learned:\n- Prevention / Fix:'

  return `# Failures & Learnings Log\n\n${entriesBlock}\n`
}
