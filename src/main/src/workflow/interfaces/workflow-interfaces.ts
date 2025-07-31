// ===== 1. 수정된 workflow-interfaces.ts =====
// main/workflow/interfaces/workflow-interfaces.ts

import { AnyWorkflowNode } from '@/common/types/workflow';
import { Edge } from '@xyflow/react';
import { WorkflowExecution } from '@/main/stores/workflow/workflow-types';
import { SerializedWorkflow, WorkflowManifest } from '../persistence/workflow-persistence-types';

// Desktop Integration 인터페이스
export interface IDesktopIntegration {
  isServerConnected(serverName: string): boolean;
  connectServer(serverName: string, config: any): boolean;
  disconnectServer(serverName: string): boolean;
}

// Workflow Executor 인터페이스
export interface IWorkflowExecutor {
  executeWorkflow(payload: {
    executionId?: string;
    nodes: AnyWorkflowNode[];
    edges: Edge[];
    triggerId: string;
  }): Promise<void>;
  
  executeStoredWorkflow(workflowId: string): Promise<void>;
  cancelExecution(executionId: string): Promise<void>;
  getActiveExecutions(): WorkflowExecution[];
}

// Workflow Repository 인터페이스 (여기에만 정의)
export interface IWorkflowRepository {
  save(workflow: SerializedWorkflow): Promise<void>;
  load(id: string): Promise<SerializedWorkflow>;
  list(): Promise<WorkflowManifest>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  export(id: string): Promise<string>;
  import(jsonString: string): Promise<SerializedWorkflow>;
}