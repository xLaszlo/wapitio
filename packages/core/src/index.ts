export const DIAGRAM_VERSION = 1
export { NODE_TYPES } from './schema'
export type {
  DiagramDocument,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  Direction,
  LayoutResult,
  NodeType,
  PositionedEdge,
  PositionedNode,
} from './schema'
export { parseDiagramSource } from './parse'
export type { ParseResult } from './parse'
export { validateDiagram } from './validate'
export type { ValidationIssue, ValidationResult } from './validate'
export { layoutDiagram } from './layout'
export { encodePayload, decodePayload, markdownItWapitio, FENCE_TAG } from './markdown-it-wapitio'

// The Vue component is exported through a separate entry consumed by bundlers
// (it requires a Vue app context); see ./component in a later milestone.
