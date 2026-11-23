import ELK from 'elkjs/lib/elk-api.js'
import type { DiagramDocument, LayoutResult, PositionedEdge, PositionedNode } from './schema'

/** Fixed node size for v1: elkjs needs a size to route around. */
const NODE_WIDTH = 180
const NODE_HEIGHT = 48

const DIRECTION_TO_ELK: Record<string, string> = {
  DOWN: 'DOWN',
  RIGHT: 'RIGHT',
  UP: 'UP',
  LEFT: 'LEFT',
}

/**
 * Computes node positions and edge routes for a validated document.
 * This is the only place coordinates are invented — user JSON never carries
 * layout information (PLAN.md §3 rule).
 */
export async function layoutDiagram(doc: DiagramDocument): Promise<LayoutResult> {
  const elk = new ELK()
  const edges = doc.edges ?? []

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': DIRECTION_TO_ELK[doc.direction ?? 'DOWN'] ?? 'DOWN',
      'elk.spacing.nodeNode': '48',
      'elk.layered.spacing.nodeNodeBetweenLayers': '72',
      'elk.padding': '[top=24,left=24,bottom=24,right=24]',
      mergeEdges: 'false',
    },
    children: [
      ...(doc.groups ?? []).map((group) => ({
        id: `group:${group.id}`,
        layoutOptions: { 'elk.padding': '[top=36,left=16,bottom=16,right=16]' },
        children: doc.nodes
          .filter((n) => n.group === group.id)
          .map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
      })),
      ...doc.nodes
        .filter((n) => !n.group)
        .map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    ],
    edges: edges.map((e, i) => ({
      id: `edge-${i}`,
      sources: [e.from],
      targets: [e.to],
    })),
  }

  const result = await elk.layout(elkGraph)

  const positions = new Map<string, { x: number; y: number }>()
  collectPositions(result, 0, 0, positions)

  const nodes: PositionedNode[] = doc.nodes.map((n) => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 }
    return { ...n, label: n.label ?? n.id, ...pos, width: NODE_WIDTH, height: NODE_HEIGHT }
  })

  const positionedEdges: PositionedEdge[] = edges.map((e, i) => {
    const elkEdge = result.edges?.find((edge) => edge.id === `edge-${i}`)
    const points =
      elkEdge?.sections?.flatMap((section) => [
        { x: section.startPoint.x, y: section.startPoint.y },
        ...(section.bendPoints ?? []).map((p) => ({ x: p.x, y: p.y })),
        { x: section.endPoint.x, y: section.endPoint.y },
      ]) ?? []
    return { ...e, points }
  })

  return { nodes, edges: positionedEdges, width: result.width ?? 0, height: result.height ?? 0 }
}

function collectPositions(
  node: { id: string; x?: number; y?: number; children?: unknown[] },
  offsetX: number,
  offsetY: number,
  out: Map<string, { x: number; y: number }>,
): void {
  const x = offsetX + (node.x ?? 0)
  const y = offsetY + (node.y ?? 0)
  if (!node.id.startsWith('group:') && node.id !== 'root') {
    out.set(node.id, { x, y })
  }
  for (const child of node.children ?? []) {
    collectPositions(child as typeof node, x, y, out)
  }
}
