// INodeExecutor.ts
export interface INodeExecutor {
    execute(
      context: any,
      nodes: any[],
      edges: any[],
      triggerId: string
    ): Promise<any>;
  }
//   (1) 특정 노드의 결과 전체를 꺼내고 싶을 때
//   const serverNodeResult = context['server1']; // { serverResult: { foo: 123, bar: 456 } }

// (2) 평탄화된 결과의 특정 key만 꺼내고 싶을 때
// const serverResult = context.serverResult; // { foo: 123, bar: 456 }
// const foo = context.serverResult?.foo;     // 123

// (3) 여러 노드 결과를 조합하고 싶을 때
// const server1Result = context['server1']?.serverResult;
// const server2Result = context['server2']?.serverResult;
// const myValue = context.serverResult?.foo;

// 입력 edge(내 노드로 들어오는 edge) 추출
export function getInputEdges(nodeId: string, edges: any[]) {
  return (edges || []).filter(e => e.target === nodeId);
}

// 이전 노드 id 리스트 추출
export function getPrevNodeIds(nodeId: string, edges: any[]) {
  return getInputEdges(nodeId, edges).map(e => e.source);
}

// 이전 노드 결과 리스트 추출
export function getPrevResults(nodeId: string, edges: any[], context: any) {
  const prevNodeIds = getPrevNodeIds(nodeId, edges);
  return prevNodeIds.map(id => context[id]);
}

export function isLastNode(nodeId: string, edges: any[]): boolean {
    return !edges.some(e => e.source === nodeId);
  }
  
// 이모지 포함 예쁜 로그 출력
export function logPrevNodeInfo(nodeId: string, edges: any[], context: any) {
  const inputEdges = getInputEdges(nodeId, edges);
  const prevNodeIds = inputEdges.map(e => e.source);
  const prevResults = prevNodeIds.map(id => context[id]);
  console.log('🔗 [Edge Info] 입력 edge:', inputEdges);
  console.log('🪢 [Prev Node Ids] 이전 노드 id:', prevNodeIds);
  prevNodeIds.forEach((id, idx) => {
    console.log(`📦 [Prev Result] 이전 노드(${id}) 결과:`, prevResults[idx]);
  });
}