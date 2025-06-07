// ===== 단순화된 Workflow Store =====
// main/stores/workflow/workflowStore.ts

import { createStore } from 'zustand/vanilla';
// @ts-ignore - uuid types are intentionally ignored per project requirements
import { v4 as uuidv4 } from 'uuid';
import { WorkflowExecution, NodeExecutionResult } from '@/renderer/features/server/types/server-types';
import { AnyWorkflowNode } from '@/common/types/workflow';
import { Edge } from '@xyflow/react';
// Node.js import 제거 - IPC로 분리
// Node.js 모듈 import 제거 - IPC로 메인 프로세스에서 처리

// 단순화된 상태
interface SimpleWorkflowState {
  executions: Record<string, WorkflowExecution>;
  activeExecutionIds: string[];
  loading: boolean;
  error?: string;
}

const initialState: SimpleWorkflowState = {
  executions: {},
  activeExecutionIds: [],
  loading: false,
  error: undefined
};

export const workflowStore = createStore<SimpleWorkflowState & {
  // === 워크플로우 실행 (핵심 기능) ===
  executeWorkflow: (payload: {
    nodes: AnyWorkflowNode[];
    edges: Edge[];
    triggerId: string;
  }) => Promise<string>;
  
  // === 실행 상태 추적 ===
  updateNodeExecution: (payload: {
    executionId: string;
    nodeId: string;
    result: NodeExecutionResult;
  }) => void;
  
  completeExecution: (payload: { executionId: string }) => void;
  failExecution: (payload: { executionId: string; error: string }) => void;
  
  // === 조회 ===
  getExecution: (payload: { executionId: string }) => WorkflowExecution | undefined;
  getActiveExecutions: () => WorkflowExecution[];
}>((set, get) => ({
  ...initialState,
  
  // === 워크플로우 실행 (단순화) ===
  executeWorkflow: async (payload) => {
    const { nodes, edges, triggerId } = payload;
    const executionId = uuidv4();
    
    // 실행 정보 생성
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: 'temp', // 임시 워크플로우
      name: 'User Layout Workflow',
      status: 'running',
      startedAt: new Date().toISOString(),
      progress: 0,
      context: {},
      nodeResults: {},
      nodes,
      edges
    };
    
    // 노드별 초기 상태 설정
    nodes.forEach(node => {
      execution.nodeResults[String(node.id)] = {
        status: 'pending'
      };
    });
    
    // Store에 추가
    set((state) => ({
      executions: {
        ...state.executions,
        [executionId]: execution
      },
      activeExecutionIds: [...state.activeExecutionIds, executionId]
    }));
    
    // 백그라운드에서 실행
    (async () => {
      try {
        console.log(`🚀 [workflowStore] 워크플로우 실행 시작: ${executionId}`);
        
        // 🔥 IPC를 통해 메인 프로세스에서 워크플로우 실행
        console.log('📡 [workflowStore] IPC로 메인 프로세스에 워크플로우 실행 요청');
        
        // workflowAPI (preload에서 api로 expose된) 사용
        if (typeof window !== 'undefined' && (window as any).api?.executeWorkflow) {
          const result = await (window as any).api.executeWorkflow({
            executionId,
            nodes,
            edges,
            triggerId
          });
          console.log('✅ [workflowStore] IPC 워크플로우 실행 결과:', result);
        } else {
          console.log('⚠️ [workflowStore] api.executeWorkflow 없음 - 시뮬레이션');
          // 시뮬레이션: 각 노드를 성공으로 표시
          for (const node of nodes) {
            console.log(`🎯 [시뮬레이션] 노드 ${node.id} (${node.type}) 시뮬레이션 실행`);
            
            get().updateNodeExecution({
              executionId,
              nodeId: String(node.id),
              result: {
                status: 'success',
                result: { simulated: true, nodeType: node.type }
              }
            });
          }
        }
        
        console.log(`✅ [workflowStore] 워크플로우 실행 완료: ${executionId}`);
        
      } catch (error) {
        console.error(`❌ [workflowStore] 워크플로우 실행 실패:`, error);
        
        get().failExecution({
          executionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })();
    
    return executionId;
  },
  
  // === 노드 실행 업데이트 ===
  updateNodeExecution: (payload) => {
    const { executionId, nodeId, result } = payload;
    
    set((state) => {
      const execution = state.executions[executionId];
      if (!execution) return state;
      
      const updatedExecution: WorkflowExecution = {
        ...execution,
        currentNodeId: nodeId,
        nodeResults: {
          ...execution.nodeResults,
          [nodeId]: result
        }
      };
      
      // 진행률 계산
      const totalNodes = execution.nodes.length;
      const completedNodes = Object.values(updatedExecution.nodeResults)
        .filter(r => r.status === 'success' || r.status === 'error' || r.status === 'skipped')
        .length;
      updatedExecution.progress = Math.round((completedNodes / totalNodes) * 100);
      
      return {
        executions: {
          ...state.executions,
          [executionId]: updatedExecution
        }
      };
    });
  },
  
  // === 실행 완료 ===
  completeExecution: (payload) => {
    const { executionId } = payload;
    
    set((state) => {
      const execution = state.executions[executionId];
      if (!execution) return state;
      
      const updatedExecution: WorkflowExecution = {
        ...execution,
        status: 'completed',
        completedAt: new Date().toISOString(),
        progress: 100
      };
      
      return {
        executions: {
          ...state.executions,
          [executionId]: updatedExecution
        },
        activeExecutionIds: state.activeExecutionIds.filter(id => id !== executionId)
      };
    });
    
    console.log(`✅ [workflowStore] 실행 완료: ${executionId}`);
  },
  
  // === 실행 실패 ===
  failExecution: (payload) => {
    const { executionId, error } = payload;
    
    set((state) => {
      const execution = state.executions[executionId];
      if (!execution) return state;
      
      const updatedExecution: WorkflowExecution = {
        ...execution,
        status: 'failed',
        completedAt: new Date().toISOString(),
        error
      };
      
      return {
        executions: {
          ...state.executions,
          [executionId]: updatedExecution
        },
        activeExecutionIds: state.activeExecutionIds.filter(id => id !== executionId)
      };
    });
    
    console.error(`❌ [workflowStore] 실행 실패: ${executionId} - ${error}`);
  },
  
  // === 실행 조회 ===
  getExecution: (payload) => {
    const { executionId } = payload;
    return get().executions[executionId];
  },
  
  // === 활성 실행 목록 ===
  getActiveExecutions: () => {
    const state = get();
    return state.activeExecutionIds
      .map(id => state.executions[id])
      .filter(Boolean);
  }
}));