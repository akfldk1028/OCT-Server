// ===== 3. 완전한 workflow-executor.ts =====
// main/workflow/workflow-executor.ts

import { workflowStore } from '@/main/stores/workflow/workflowStore';
import { NodeExecutorFactory } from './executors/NodeExecutorFactory';
import { ExecutionContext, ExecuteResult } from './executors/node-executor-types';
import { Logger } from './logger';
import { AnyWorkflowNode } from '@/common/types/workflow';
import { Edge } from '@xyflow/react';
import { IDesktopIntegration, IWorkflowExecutor } from './interfaces/workflow-interfaces';
import { WorkflowExecution } from '@/main/stores/workflow/workflow-types';

export class WorkflowExecutor implements IWorkflowExecutor {
  private factory: NodeExecutorFactory;
  
  constructor(
    private integration: IDesktopIntegration, 
    private logger?: Logger
  ) {
    this.factory = new NodeExecutorFactory(integration, logger);
  }
  
  // Store를 사용한 워크플로우 실행
  async executeStoredWorkflow(workflowId: string): Promise<void> {
    // 1. Store에서 실행 시작
    const executionId = await workflowStore.getState().startExecution({
      workflowId
    });
    
    // 2. 실행 정보 가져오기
    const execution = workflowStore.getState().getExecution({ executionId });
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    // 3. 실제 실행
    try {
      await this.executeWorkflow({
        executionId,
        nodes: execution.nodes,
        edges: execution.edges,
        triggerId: executionId
      });
      
      // 4. 실행 완료
      workflowStore.getState().completeExecution({ executionId });
      
    } catch (error) {
      // 5. 실행 실패
      workflowStore.getState().failExecution({
        executionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  // 실제 워크플로우 실행 로직
  async executeWorkflow(payload: {
    executionId?: string;
    nodes: AnyWorkflowNode[];
    edges: Edge[];
    triggerId: string;
  }): Promise<void> {
    const { executionId, nodes, edges, triggerId } = payload;
    
    // ExecutionContext 생성
    const context = new ExecutionContext();
    
    // Store에서 기존 컨텍스트 로드 (있다면)
    if (executionId) {
      const existingContext = workflowStore.getState().getExecutionContext({ executionId });
      Object.entries(existingContext).forEach(([key, value]) => {
        context.set(key, value);
      });
    }
    
    // 실행 순서 결정
    const executionOrder = this.getExecutionOrder(nodes, edges);
    
    for (const node of executionOrder) {
      // 노드 실행 시작 알림
      if (executionId) {
        workflowStore.getState().updateNodeExecution({
          executionId,
          nodeId: String(node.id),
          result: {
            status: 'running',
            startedAt: new Date().toISOString()
          }
        });
      }
      
      try {
        // Executor 생성 및 실행
        const executor = this.factory.create(node);
        const startTime = Date.now();
        
        const result = await executor.execute({
          nodeId: String(node.id),
          context,
          nodes,
          edges,
          triggerId
        });
        
        // 결과를 컨텍스트에 저장
        context.set(String(node.id), result);
        
        // Store 업데이트
        if (executionId) {
          // 컨텍스트 업데이트
          workflowStore.getState().updateExecutionContext({
            executionId,
            nodeId: String(node.id),
            data: result
          });
          
          // 노드 실행 결과 업데이트
          workflowStore.getState().updateNodeExecution({
            executionId,
            nodeId: String(node.id),
            result: {
              status: 'success',
              completedAt: new Date().toISOString(),
              result: result.data,
              duration: Date.now() - startTime
            }
          });
        }
        
        // 이벤트 발생 - 제거됨 (Zustand bridge 사용)
        
        // 에러 처리
        if (result.status === 'error') {
          throw new Error(`Node ${node.id} failed: ${result.error}`);
        }
        
      } catch (error) {
        // 노드 실행 실패
        if (executionId) {
          workflowStore.getState().updateNodeExecution({
            executionId,
            nodeId: String(node.id),
            result: {
              status: 'error',
              completedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
        
        throw error;
      }
    }
  }
  
  // 토폴로지컬 정렬로 실행 순서 결정
  private getExecutionOrder(nodes: AnyWorkflowNode[], edges: Edge[]): AnyWorkflowNode[] {
    const visited = new Set<string>();
    const result: AnyWorkflowNode[] = [];
    
    // 진입 차수 계산
    const inDegree: Record<string, number> = {};
    nodes.forEach(node => {
      inDegree[node.id] = 0;
    });
    
    edges.forEach(edge => {
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    });
    
    // 진입 차수가 0인 노드부터 시작
    const queue = nodes.filter(node => inDegree[node.id] === 0);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (!visited.has(String(current.id))) {
        visited.add(String(current.id));
        result.push(current);
        
        // 현재 노드에서 나가는 엣지들 처리
        edges
          .filter(edge => edge.source === current.id)
          .forEach(edge => {
            inDegree[edge.target]--;
            
            if (inDegree[edge.target] === 0) {
              const targetNode = nodes.find(n => n.id === edge.target);
              if (targetNode && !visited.has(String(targetNode.id))) {
                queue.push(targetNode);
              }
            }
          });
      }
    }
    
    // 순환 참조 체크
    if (result.length !== nodes.length) {
      throw new Error('Workflow contains circular dependencies');
    }
    
    return result;
  }
  
  // 노드 실행 완료 이벤트 전송 - 제거됨
  // Zustand bridge가 workflowStore 상태 변화를 자동으로 renderer에 동기화하므로 불필요
  
  // 실행 취소
  async cancelExecution(executionId: string): Promise<void> {
    workflowStore.getState().cancelExecution({ executionId });
  }
  
  // 현재 실행 중인 워크플로우 목록
  getActiveExecutions(): WorkflowExecution[] {
    return workflowStore.getState().getActiveExecutions();
  }
}