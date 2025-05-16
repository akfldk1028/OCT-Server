/**
 * NodeDataEnhancer.tsx
 * 각 노드 타입별로 필요한 기본 데이터와 메타데이터를 제공하는 유틸리티
 */

import { NodeMetadata } from "@/common/types/workflow";

// 워크플로우 노드 메타데이터 타입


// 각 노드 타입별 기본 메타데이터
const DEFAULT_NODE_METADATA: Record<string, NodeMetadata> = {
  trigger: {
    typeVersion: '0.0.1',
    category: 'Flow Control',
    description: '워크플로우의 시작점, 수동 또는 자동으로 트리거됨',

  },
  
  service: {
    typeVersion: '0.0.1',
    category: 'Services',
    description: '외부 서비스 또는 API와 연동',

  },
  
  server: {
    typeVersion: '0.0.1',
    category: 'Infrastructure',
    description: '서버 인스턴스 또는 백엔드 시스템과 통신',

  },
  
  text: {
    typeVersion: '0.0.1',
    category: 'Data',
    description: '텍스트 데이터 처리 및 변환',
   
  },
  
  result: {
    typeVersion: '0.0.1',
    category: 'Flow Control',
    description: '워크플로우의 최종 결과 처리',
 
  },
  
  image: {
    typeVersion: '0.0.1',
    category: 'Media',
    description: '이미지 처리 및 변환',
 
  },
  
  counter: {
    typeVersion: '0.0.1',
    category: 'Utilities',
    description: '카운터 값 관리',
 
  },
  
  color: {
    typeVersion: '0.0.1',
    category: 'Utilities',
    description: '색상 선택 및 변환',
 
  }
};

/**
 * 노드 타입에 해당하는 기본 메타데이터를 반환하는 함수
 */
export function getNodeMetadata(nodeType: string): NodeMetadata {
  return DEFAULT_NODE_METADATA[nodeType] || {
    typeVersion: '0.0.1',
    category: 'Custom',
    description: '사용자 정의 노드',
  };
}

/**
 * 노드 데이터를 강화하는 함수
 * 누락된 메타데이터를 기본값으로 보완
 */
export function enhanceNodeData(node: any): any {
  if (!node) return {};
  
  const nodeType = node.type || 'unknown';
  const metadata = getNodeMetadata(nodeType);
  
  // 노드 데이터와 메타데이터 병합
  return {
    ...(node.data || {}),
    id: node.id,
    type: nodeType,
    typeVersion: metadata.typeVersion,
    category: metadata.category,
    description: (node.data?.description || metadata.description),
  };
}

/**
 * 워크플로우의 모든 노드 데이터를 강화하는 함수
 */
export function enhanceWorkflowData(nodes: any[]): any[] {
  if (!Array.isArray(nodes)) return [];
  
  return nodes.map(node => ({
    ...node,
    data: enhanceNodeData(node)
  }));
} 