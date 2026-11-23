import type MarkdownIt from 'markdown-it'
import { parseDiagramSource } from './parse'
import { validateDiagram } from './validate'

export const FENCE_TAG = 'wapitio'

/**
 * Data attributes carrying the diagram payload from markdown render time to
 * component mount time. The JSON is base64url-encoded so quotes, braces, and
 * `{{ }}` sequences can never break HTML attributes or trigger VitePress's
 * Vue template interpolation (PLAN.md §4 gotcha).
 */
export function encodePayload(value: unknown): string {
  const json = JSON.stringify(value)
  // btoa is available in browsers and Node ≥16; escape surrogates first.
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export function decodePayload(encoded: string): unknown {
  let base64 = encoded.replaceAll('-', '+').replaceAll('_', '/')
  while (base64.length % 4 !== 0) base64 += '='
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

interface BlockIssue {
  message: string
  path?: string
}

function renderErrorHtml(issues: BlockIssue[]): string {
  const items = issues
    .map((issue) => `<li class="wapitio-error-item">${escapeHtml(issue.message)}</li>`)
    .join('')
  return `<div class="wapitio-error" role="alert"><div class="wapitio-error-title">wapitio: invalid diagram</div><ul class="wapitio-error-list">${items}</ul></div>`
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * markdown-it plugin: renders ```wapitio fence blocks as either a placeholder
 * element (valid document — the host app mounts <Wapitio> onto it) or an
 * inline error box (invalid document). The error path works everywhere,
 * including plain markdown-it consumers that never mount the component.
 */
export function markdownItWapitio(md: MarkdownIt): void {
  md.renderer.rules[FENCE_TAG] = (tokens, idx) => {
    const token = tokens[idx]
    if (!token) return ''

    const parseResult = parseDiagramSource(token.content)
    if (parseResult.value === undefined) {
      return renderErrorHtml(parseResult.issues)
    }

    const validation = validateDiagram(parseResult.value)
    if (!validation.valid) {
      return renderErrorHtml(validation.issues)
    }

    const payload = encodePayload(validation.document)
    // Titles are user text: escape HTML, and neutralize {{ }} which VitePress
    // would otherwise treat as Vue interpolation in rendered markdown output.
    const safeTitle = validation.document?.title
      ? escapeHtml(validation.document.title).replaceAll('{', '&#123;').replaceAll('}', '&#125;')
      : undefined
    const title = safeTitle ? `: ${safeTitle}` : ''
    return `<div class="wapitio" data-wapitio-payload="${payload}" role="img" aria-label="wapitio diagram${title}"><noscript>${safeTitle ?? 'wapitio diagram'}</noscript></div>`
  }

  md.core.ruler.push('wapitio_fence', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'fence' || token.info.trim() !== FENCE_TAG) continue
      token.type = FENCE_TAG
    }
  })
}
