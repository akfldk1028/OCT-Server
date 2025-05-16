// preload-workflow.ts
import { ipcRenderer } from 'electron';
import { WorkflowNodeData, WorkflowPayload } from '@/common/types/workflow';



export interface NodeExecutionPayload {
  workflowId: string;
  node: any;
  context: any;
  nodeIndex: number;
  totalNodes: number;
}

// 워크플로우 API 정의
export const workflowAPI = {
  // 전체 워크플로우 실행
  executeWorkflow: async (payload: WorkflowPayload) => {
    return ipcRenderer.invoke('workflow:execute', payload);
  },

  // 단일 노드 실행
  executeNode: async (payload: NodeExecutionPayload) => {
    return ipcRenderer.invoke('workflow:executeNode', payload);
  },

  // MCP 툴 실행
  executeMCPTool: async (payload: {
    toolName: string;
    serverName?: string;
    parameters: any;
    context?: any;
  }) => {
    return ipcRenderer.invoke('mcp-workflow:tool-call', payload);
  },

  // 이벤트 리스너들
  onWorkflowProgress: (workflowId: string, callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => {
      if (data.workflowId === workflowId) callback(data);
    };
    ipcRenderer.on('workflow:progress', subscription);
    return () => ipcRenderer.removeListener('workflow:progress', subscription);
  },

  onWorkflowComplete: (workflowId: string, callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => {
      if (data.workflowId === workflowId) callback(data);
    };
    ipcRenderer.on('workflow:complete', subscription);
    return () => ipcRenderer.removeListener('workflow:complete', subscription);
  },

  onWorkflowError: (workflowId: string, callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => {
      if (data.workflowId === workflowId) callback(data);
    };
    ipcRenderer.on('workflow:error', subscription);
    return () => ipcRenderer.removeListener('workflow:error', subscription);
  },

  onNodeExecuted: (workflowId: string, callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => {
      if (data.workflowId === workflowId) callback(data);
    };
    ipcRenderer.on('mcp-workflow:node', subscription);
    return () => ipcRenderer.removeListener('mcp-workflow:node', subscription);
  },

  // 워크플로우 관리
  saveWorkflow: (payload: any) => ipcRenderer.invoke('workflow:save', payload),
  loadWorkflow: (workflowId: string) => ipcRenderer.invoke('workflow:load', workflowId),
  listWorkflows: () => ipcRenderer.invoke('workflow:list'),
  deleteWorkflow: (workflowId: string) => ipcRenderer.invoke('workflow:delete', workflowId),
  
  // 상태 관리
  getWorkflowStatus: (workflowId: string) => ipcRenderer.invoke('workflow:status', workflowId),
  cancelWorkflow: (workflowId: string) => ipcRenderer.invoke('workflow:stop', workflowId),
  validateWorkflow: (payload: any) => ipcRenderer.invoke('workflow:validate', payload),
};

export type WorkflowAPI = typeof workflowAPI;