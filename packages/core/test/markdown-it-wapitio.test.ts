import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'
import { decodePayload, encodePayload, markdownItWapitio } from '../src/markdown-it-wapitio'

function render(source: string): string {
  const md = new MarkdownIt({ html: false })
  md.use(markdownItWapitio)
  return md.render(source)
}

describe('encodePayload / decodePayload', () => {
  it('round-trips a document without attribute-hostile characters', () => {
    const doc = { version: 1, title: 'A "quoted" {{title}}', nodes: [{ id: 'a<b>' }] }
    const encoded = encodePayload(doc)
    expect(encoded).not.toMatch(/["{}&<>\s]/)
    expect(decodePayload(encoded)).toEqual(doc)
  })
})

describe('markdownItWapitio fence rule', () => {
  it('emits a placeholder with a payload for a valid document', () => {
    const html = render(['```wapitio', '{"version":1,"nodes":[{"id":"api"}]}', '```'].join('\n'))
    expect(html).toContain('class="wapitio"')
    expect(html).toMatch(/data-wapitio-payload="[A-Za-z0-9_-]+"/)
    expect(html).not.toContain('{')
  })

  it('never leaks raw {{ }} into the HTML (VitePress interpolation guard)', () => {
    const html = render(
      ['```wapitio', '{"version":1,"title":"use {{ braces }}","nodes":[{"id":"a"}]}', '```'].join(
        '\n',
      ),
    )
    expect(html).not.toContain('{{')
  })

  it('renders an inline error box for unparseable blocks', () => {
    const html = render(['```wapitio', 'this is : not : valid', '```'].join('\n'))
    expect(html).toContain('wapitio-error')
    expect(html).toContain('role="alert"')
    expect(html).not.toContain('data-wapitio-payload')
  })

  it('renders an inline error box for schema violations', () => {
    const html = render(
      ['```wapitio', '{"version":1,"nodes":[{"id":"a"},{"id":"a"}]}', '```'].join('\n'),
    )
    expect(html).toContain('duplicate node id')
  })

  it('renders an error box for edges referencing missing nodes', () => {
    const html = render(
      [
        '```wapitio',
        '{"version":1,"nodes":[{"id":"a"}],"edges":[{"from":"a","to":"z"}]}',
        '```',
      ].join('\n'),
    )
    expect(html).toContain('unknown node &quot;z&quot;')
  })

  it('leaves other fences untouched', () => {
    const html = render(['```json', '{"a":1}', '```'].join('\n'))
    expect(html).not.toContain('wapitio')
    expect(html).toContain('language-json')
  })

  it('handles YAML blocks too', () => {
    const html = render(['```wapitio', 'version: 1', 'nodes:', '  - id: api', '```'].join('\n'))
    expect(html).toContain('data-wapitio-payload')
  })
})
