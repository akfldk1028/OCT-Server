// preload-workflow.ts
import { ipcRenderer } from 'electron';
import { WorkflowNodeData, WorkflowPayload } from '@/common/types/workflow';

// 워크플로우 API 정의
export const workflowAPI = {
  // === Claude Desktop 연결 ===
  connectToClaudeDesktop: (serverName: string, serverConfig: any): Promise<boolean> => {
    console.log(`📡 [preload-workflow] Claude Desktop 연결 요청: ${serverName}`);
    return ipcRenderer.invoke('connect-to-claude-desktop', serverName, serverConfig);
  },

  // === 워크플로우 실행 ===
  executeWorkflow: (payload: {
    executionId: string;
    nodes: any[];
    edges: any[];
    triggerId: string;
  }): Promise<void> => {
    console.log(`🚀 [preload-workflow] 워크플로우 실행 요청: ${payload.executionId}`);
    return ipcRenderer.invoke('workflow:execute', payload);
  },

  // === 노드 실행 ===
  executeNode: (nodeId: string, nodeData: WorkflowNodeData): Promise<any> => {
    console.log(`⚡ [preload-workflow] 노드 실행 요청: ${nodeId}`);
    return ipcRenderer.invoke('workflow:executeNode', nodeId, nodeData);
  },

  // === 워크플로우 진행 상태 구독 ===
  onWorkflowProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('workflow:progress', handler);
    return () => ipcRenderer.removeListener('workflow:progress', handler);
  },

  // === 워크플로우 완료 구독 ===
  onWorkflowComplete: (callback: (result: any) => void) => {
    const handler = (_event: any, result: any) => callback(result);
    ipcRenderer.on('workflow:complete', handler);
    return () => ipcRenderer.removeListener('workflow:complete', handler);
  }
};

export type WorkflowAPI = typeof workflowAPI;