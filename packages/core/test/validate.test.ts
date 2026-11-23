import { describe, expect, it } from 'vitest'
import { validateDiagram } from '../src/validate'

const valid = {
  version: 1,
  nodes: [
    { id: 'api', label: 'API', type: 'service', group: 'backend' },
    { id: 'db', type: 'database' },
  ],
  edges: [{ from: 'api', to: 'db', label: 'reads' }],
  groups: [{ id: 'backend', label: 'Backend' }],
}

describe('validateDiagram', () => {
  it('accepts a valid document and fills defaults', () => {
    const result = validateDiagram(valid)
    expect(result.valid).toBe(true)
    expect(result.document?.direction).toBe('DOWN')
    expect(result.document?.edges).toHaveLength(1)
    expect(result.document?.nodes.find((n) => n.id === 'db')?.label).toBe('db')
  })

  it('rejects a missing version', () => {
    const result = validateDiagram({ nodes: [{ id: 'a' }] })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.path === 'version')).toBe(true)
  })

  it('rejects an unsupported version', () => {
    const result = validateDiagram({ ...valid, version: 99 })
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.message).toContain('version 1')
  })

  it('reports duplicate node ids', () => {
    const result = validateDiagram({ version: 1, nodes: [{ id: 'a' }, { id: 'a' }] })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.message.includes('duplicate node id "a"'))).toBe(true)
  })

  it('reports edges pointing at missing nodes with the path', () => {
    const result = validateDiagram({
      version: 1,
      nodes: [{ id: 'a' }],
      edges: [{ from: 'a', to: 'ghost' }],
    })
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.path).toBe('edges[0].to')
    expect(result.issues[0]?.message).toContain('ghost')
  })

  it('reports nodes referencing unknown groups', () => {
    const result = validateDiagram({
      version: 1,
      nodes: [{ id: 'a', group: 'nope' }],
    })
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.path).toBe('nodes[0].group')
  })

  it('accepts unknown node types (style fallback, no hard failure)', () => {
    const result = validateDiagram({ version: 1, nodes: [{ id: 'a', type: 'mainframe' }] })
    expect(result.valid).toBe(true)
  })

  it('collects multiple issues in one pass', () => {
    const result = validateDiagram({
      version: 1,
      nodes: [{ id: 'a' }, { id: 'a' }],
      edges: [{ from: 'x', to: 'y' }],
    })
    expect(result.issues.length).toBeGreaterThanOrEqual(3)
  })
})
