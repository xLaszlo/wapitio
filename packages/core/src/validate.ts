import { z } from 'zod'
import { DIAGRAM_VERSION, type DiagramDocument, NODE_TYPES } from './schema'

const nodeSchema = z.object({
  id: z.string().min(1, 'node id must be a non-empty string'),
  label: z.string().optional(),
  type: z.enum(NODE_TYPES).or(z.string()).optional(),
  group: z.string().optional(),
  description: z.string().optional(),
})

const edgeSchema = z.object({
  from: z.string().min(1, 'edge "from" must be a non-empty string'),
  to: z.string().min(1, 'edge "to" must be a non-empty string'),
  label: z.string().optional(),
  dashed: z.boolean().optional(),
})

const groupSchema = z.object({
  id: z.string().min(1, 'group id must be a non-empty string'),
  label: z.string().optional(),
})

const documentSchema = z.object({
  version: z.number().int(),
  title: z.string().optional(),
  direction: z.enum(['DOWN', 'RIGHT', 'UP', 'LEFT']).optional(),
  nodes: z.array(nodeSchema, { required_error: '"nodes" is required' }),
  edges: z.array(edgeSchema).optional(),
  groups: z.array(groupSchema).optional(),
})

export interface ValidationIssue {
  /** Human-readable problem description, safe to show in the error box. */
  message: string
  /** A hint at where the problem is, e.g. `edge[2].to`. */
  path?: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  /** Parsed and normalized document when valid, undefined otherwise. */
  document?: DiagramDocument
}

/**
 * Validates an already-parsed value against the wapitio document schema.
 * Beyond shape checks it verifies referential integrity (edges reference
 * existing nodes, node.group references existing groups) and duplicate ids,
 * reporting every problem it can find rather than failing on the first.
 */
export function validateDiagram(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = []

  const parsed = documentSchema.safeParse(value)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.map(String).join('.')
      issues.push(path ? { message: issue.message, path } : { message: issue.message })
    }
    return { valid: false, issues }
  }

  const doc = parsed.data

  if (doc.version !== DIAGRAM_VERSION) {
    issues.push({
      message: `unsupported "version": ${doc.version}. This build supports version ${DIAGRAM_VERSION}.`,
      path: 'version',
    })
  }

  const ids = new Set<string>()
  doc.nodes.forEach((node, i) => {
    if (ids.has(node.id)) {
      issues.push({ message: `duplicate node id "${node.id}"`, path: `nodes[${i}].id` })
    }
    ids.add(node.id)
  })

  const groupIds = new Set<string>()
  doc.groups?.forEach((group, i) => {
    if (groupIds.has(group.id)) {
      issues.push({ message: `duplicate group id "${group.id}"`, path: `groups[${i}].id` })
    }
    groupIds.add(group.id)
  })

  doc.nodes.forEach((node, i) => {
    if (node.group !== undefined && !groupIds.has(node.group)) {
      issues.push({
        message: `node "${node.id}" references unknown group "${node.group}"`,
        path: `nodes[${i}].group`,
      })
    }
  })

  doc.edges?.forEach((edge, i) => {
    for (const end of ['from', 'to'] as const) {
      if (!ids.has(edge[end])) {
        issues.push({
          message: `edge references unknown node "${edge[end]}"`,
          path: `edges[${i}].${end}`,
        })
      }
    }
  })

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    issues: [],
    document: {
      version: doc.version,
      title: doc.title,
      direction: doc.direction ?? 'DOWN',
      nodes: doc.nodes.map((n) => stripUndefined({ ...n, label: n.label ?? n.id })),
      edges: (doc.edges ?? []).map((e) => stripUndefined(e)),
      groups: (doc.groups ?? []).map((g) => stripUndefined(g)),
    } as DiagramDocument,
  }
}

/**
 * exactOptionalPropertyTypes forbids assigning `undefined` into optional
 * properties. Zod keeps absent keys absent, but explicit `undefined` from
 * JSON is possible — drop those keys so the result matches DiagramDocument.
 */
function stripUndefined<T extends object>(value: T): T {
  const out = {} as T
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) {
      out[key as keyof T] = val as T[keyof T]
    }
  }
  return out
}
