/**
 * Diagram document types. This is the contract LLMs generate against — keep it small.
 * Coordinates never appear here: elkjs computes layout at render time.
 */

export const DIAGRAM_VERSION = 1

export type Direction = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT'

export const NODE_TYPES = ['service', 'database', 'queue', 'external', 'person', 'group'] as const

export type NodeType = (typeof NODE_TYPES)[number]

export interface DiagramNode {
  /** Unique within the document. Referenced by edges and groups. */
  id: string
  /** Display text. Defaults to the id when omitted. */
  label?: string
  /** Visual style hint. Unknown values fall back to the default style. */
  type?: NodeType | string
  /** Id of a group this node belongs to. */
  group?: string
  /** Free-form description rendered as a tooltip / subtitle. */
  description?: string
}

export interface DiagramEdge {
  from: string
  to: string
  label?: string
  /** Renders the edge with a dashed line and open arrow. */
  dashed?: boolean
}

export interface DiagramGroup {
  id: string
  label?: string
}

export interface DiagramDocument {
  version: number
  title?: string
  direction?: Direction
  nodes: DiagramNode[]
  edges?: DiagramEdge[]
  groups?: DiagramGroup[]
}

/** Output of layout.ts: input nodes augmented with computed positions. */
export interface PositionedNode extends DiagramNode {
  x: number
  y: number
  width: number
  height: number
}

export interface PositionedEdge extends DiagramEdge {
  /** Points along the routed edge path, in pixel coordinates. */
  points: Array<{ x: number; y: number }>
}

export interface LayoutResult {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  width: number
  height: number
}
