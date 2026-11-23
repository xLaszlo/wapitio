import { describe, expect, it } from 'vitest'
import { parseDiagramSource } from '../src/parse'

describe('parseDiagramSource', () => {
  it('parses strict JSON', () => {
    const result = parseDiagramSource('{"version":1,"nodes":[{"id":"a"}]}')
    expect(result.issues).toHaveLength(0)
    expect(result.format).toBe('json')
    expect(result.value).toEqual({ version: 1, nodes: [{ id: 'a' }] })
  })

  it('parses JSON with // comments and /* block comments via the YAML fallback', () => {
    const source = `{
      // deployment view
      "version": 1, /* added after review */
      "nodes": [{"id": "api"}]
    }`
    const result = parseDiagramSource(source)
    expect(result.issues).toHaveLength(0)
    expect(result.value).toEqual({ version: 1, nodes: [{ id: 'api' }] })
  })

  it('does not corrupt string values containing protocol-style //', () => {
    const source = '{"version":1,"nodes":[{"id":"a","description":"see https://example.com/x"}]}'
    const result = parseDiagramSource(source)
    expect(result.issues).toHaveLength(0)
    expect(result.value).toEqual({
      version: 1,
      nodes: [{ id: 'a', description: 'see https://example.com/x' }],
    })
  })

  it('does not corrupt JSON string values containing # that look like comments', () => {
    const source = '{"version":1,"nodes":[{"id":"c1","label":"room #1"}]}'
    const result = parseDiagramSource(source)
    expect(result.issues).toHaveLength(0)
    expect(result.value).toEqual({ version: 1, nodes: [{ id: 'c1', label: 'room #1' }] })
  })

  it('does not corrupt YAML string values containing # when quoted', () => {
    const source = 'version: 1\nnodes:\n  - id: c1\n    label: "room #1"'
    const result = parseDiagramSource(source)
    expect(result.issues).toHaveLength(0)
    expect(result.value).toEqual({ version: 1, nodes: [{ id: 'c1', label: 'room #1' }] })
  })

  it('parses YAML documents', () => {
    const source = `
version: 1
title: Deployment
nodes:
  - id: api
    label: API
  - id: db
edges:
  - from: api
    to: db
`
    const result = parseDiagramSource(source)
    expect(result.issues).toHaveLength(0)
    expect(result.format).toBe('yaml')
    expect(result.value).toEqual({
      version: 1,
      title: 'Deployment',
      nodes: [{ id: 'api', label: 'API' }, { id: 'db' }],
      edges: [{ from: 'api', to: 'db' }],
    })
  })

  it('parses YAML with # comments', () => {
    const source = `
# added after review
version: 1
nodes:
  - id: cache  # redis
`
    const result = parseDiagramSource(source)
    expect(result.issues).toHaveLength(0)
    expect(result.value).toEqual({ version: 1, nodes: [{ id: 'cache' }] })
  })

  it('reports an issue for an empty block', () => {
    const result = parseDiagramSource('   \n  ')
    expect(result.value).toBeUndefined()
    expect(result.issues[0]?.message).toContain('empty')
  })

  it('reports a readable issue for invalid syntax', () => {
    const result = parseDiagramSource('{version: 1, nodes:')
    expect(result.value).toBeUndefined()
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]?.message).toContain('JSON or YAML')
  })
})
