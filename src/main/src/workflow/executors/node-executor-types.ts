// ===== 1. 타입 정의 =====
// node-executor-types.ts

import { AnyWorkflowNode } from '@/common/types/workflow';
import { Edge } from '@xyflow/react';

// Payload 패턴 적용
export interface ExecutePayload {
  nodeId: string;
  context: ExecutionContext;
  nodes: AnyWorkflowNode[];
  edges: Edge[];
  triggerId: string;
}

export interface ExecuteResult {
  nodeId: string;
  triggerId: string;
  status: 'success' | 'error' | 'skipped';
  timestamp: string;
  data?: any;
  error?: string;
  isLast?: boolean;
  message?: string;
}

// Context를 타입 안전하게 관리 (Record 사용)
export class ExecutionContext {
  private data: Record<string, any> = {};
  
  set(nodeId: string, result: any): void {
    this.data[nodeId] = result;
  }
  
  get(nodeId: string): any {
    return this.data[nodeId];
  }
  
  getAll(): Record<string, any> {
    return { ...this.data };
  }
  
  // 이전 노드 결과들을 타입 안전하게 가져오기
  getPreviousResults(nodeId: string, edges: Edge[]): any[] {
    const prevNodeIds = edges
      .filter(e => e.target === nodeId)
      .map(e => e.source);
    
    return prevNodeIds.map(id => this.data[id]).filter(Boolean);
  }
}
