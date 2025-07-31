// ===== 1. Workflow Types =====
// main/stores/workflow/workflow-types.ts

import { AnyWorkflowNode } from '@/common/types/workflow';
import { Edge } from '@xyflow/react';

export interface NodeExecutionResult {
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
  duration?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  error?: string;
  currentNodeId?: string;
  progress: number; // 0-100
  
  // 실행 컨텍스트 (직렬화 가능한 Record)
  context: Record<string, any>;
  
  // 노드별 실행 결과
  nodeResults: Record<string, NodeExecutionResult>;
  
  // 워크플로우 데이터
  nodes: AnyWorkflowNode[];
  edges: Edge[];
}

export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags?: string[];
  nodes: AnyWorkflowNode[];
  edges: Edge[];
  settings?: {
    autoStart?: boolean;
    maxRetries?: number;
    timeout?: number;
  };
}

export interface WorkflowState {
  // 실행 중인 워크플로우들 (Record 사용)
  executions: Record<string, WorkflowExecution>;
  
  // 저장된 워크플로우들
  workflows: Record<string, SavedWorkflow>;
  
  // 현재 활성 실행 ID들 (여러 개 동시 실행 가능)
  activeExecutionIds: string[];
  
  // 로딩 상태
  loading: boolean;
  error?: string;
}
