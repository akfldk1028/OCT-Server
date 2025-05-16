// ... 기타 노드 타입별 클래스

// NodeExecutorFactory.ts
import { TriggerNodeExecutor } from './TriggerNodeExecutor';
import { ServiceNodeExecutor } from './ServiceNodeExecutor';
import { ServerNodeExecutor } from './ServerNodeExecutor';
// ... 기타 import

export function createNodeExecutor(
  node: any,
  nodes?: any[],
  edges?: any[],
  triggerId?: string
) {
  // undefined 방지: 기본값 빈 배열 할당
  const safeNodes = nodes ?? [];
  const safeEdges = edges ?? [];
  switch (node.type) {
    case 'trigger':
      return new TriggerNodeExecutor(node, safeNodes, safeEdges, triggerId ?? '');
    case 'service':
      return new ServiceNodeExecutor(node, safeNodes, safeEdges, triggerId ?? '');
    case 'server':
      return new ServerNodeExecutor(node, safeNodes, safeEdges, triggerId ?? '');
      // ... 기타 노드 타입
    default:
      return { execute: async () => ({ defaultResult: true }) };
  }
}