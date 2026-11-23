import yaml from 'js-yaml'
import type { ValidationIssue } from './validate'

export interface ParseResult {
  /** The parsed JavaScript value, or undefined when parsing failed. */
  value?: unknown
  issues: ValidationIssue[]
  /** Which parser accepted the block: 'json' or 'yaml'. */
  format?: 'json' | 'yaml'
}

/**
 * Parses the contents of a ```wapitio fence block.
 *
 * Strategy (decided in PLAN.md §3), most predictable first:
 * 1. strict JSON — the format LLMs are asked to emit;
 * 2. JSON with comments (`//`, `/* *\/`) — comments stripped string-aware and
 *    retried as JSON (plain YAML chokes on `//` inside flow style);
 * 3. YAML — for hand-written blocks, where JSON is nearly a subset of YAML 1.2.
 */
export function parseDiagramSource(source: string): ParseResult {
  const trimmed = source.trim()

  if (trimmed.length === 0) {
    return { issues: [{ message: 'diagram block is empty' }] }
  }

  try {
    return { value: JSON.parse(trimmed), issues: [], format: 'json' }
  } catch {
    // fall through
  }

  const stripped = stripJsonComments(trimmed)
  if (stripped !== trimmed) {
    try {
      return { value: JSON.parse(stripped), issues: [], format: 'json' }
    } catch {
      // fall through to YAML
    }
  }

  try {
    const value = yaml.load(trimmed)
    if (value === undefined || value === null) {
      return { issues: [{ message: 'diagram block parsed to an empty document' }] }
    }
    return { value, issues: [], format: 'yaml' }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      issues: [
        {
          message: `could not parse the block as JSON or YAML. The first line must start with "{" for JSON. YAML error: ${reason}`,
        },
      ],
    }
  }
}

/**
 * Removes `//` line comments and `/* ... *\/` block comments from JSON text
 * without touching their occurrences inside string literals. A naive regex
 * would corrupt values like "https://example.com" (the `//` would eat the
 * rest of the line), so this walks the text tracking string and escape state.
 */
export function stripJsonComments(text: string): string {
  let out = ''
  let inString = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (inString) {
      out += ch
      if (ch === '\\' && i + 1 < text.length) {
        out += text[i + 1]
        i += 2
        continue
      }
      if (ch === '"') inString = false
      i += 1
      continue
    }
    if (ch === '"') {
      inString = true
      out += ch
      i += 1
      continue
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1
      continue
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? text.length : end + 2
      continue
    }
    out += ch
    i += 1
  }
  return out
}
