// ===== 2. 수정된 workflow-persistence-types.ts =====
// main/workflow/persistence/workflow-persistence-types.ts

import { AnyWorkflowNode } from '@/common/types/workflow';
import { Edge } from '@xyflow/react';

export interface SerializedWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags?: string[];
  
  // 실제 워크플로우 데이터
  nodes: AnyWorkflowNode[];
  edges: Edge[];
  
  // 메타데이터
  metadata?: {
    [key: string]: any;
  };
  
  // 실행 설정
  settings?: {
    autoStart?: boolean;
    maxRetries?: number;
    timeout?: number;
  };
}

export interface WorkflowManifest {
  workflows: Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
  }>;
}
