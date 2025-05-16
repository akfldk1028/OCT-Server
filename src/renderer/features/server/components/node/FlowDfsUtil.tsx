import React from 'react';

// 노드와 엣지 타입 정의 (React Flow 기준)
export interface FlowNode {
  id: string;
  data?: any;
  type?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

// DFS로 연결된 노드들을 순서대로 반환
export function dfsTraverse(
  startId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  visited: Set<string> = new Set()
): FlowNode[] {
  if (visited.has(startId)) return [];
  visited.add(startId);

  const node = nodes.find((n) => n.id === startId);
  if (!node) return [];

  const result: FlowNode[] = [node];
  const nextEdges = edges.filter((e) => e.source === startId);
  for (const edge of nextEdges) {
    result.push(...dfsTraverse(edge.target, nodes, edges, visited));
  }
  return result;
}

// 샘플 사용 예시 (컴포넌트가 아니라 함수 유틸리티로 사용)
// const orderedNodes = dfsTraverse('triggerNodeId', nodes, edges);
// console.log(orderedNodes);

// 필요시 컴포넌트로 감싸서 결과를 렌더링할 수도 있음 