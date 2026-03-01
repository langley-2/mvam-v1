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
