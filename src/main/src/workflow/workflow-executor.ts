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

  // 🔥 NEW: 병렬 실행이 가능한 워크플로우 실행 로직
  async executeWorkflowParallel(payload: {
    executionId?: string;
    nodes: AnyWorkflowNode[];
    edges: Edge[];
    triggerId: string;
    allowPartialFailure?: boolean;
  }): Promise<void> {
    const { executionId, nodes, edges, triggerId, allowPartialFailure = false } = payload;

    // ExecutionContext 생성
    const context = new ExecutionContext();

    // Store에서 기존 컨텍스트 로드 (있다면)
    if (executionId) {
      const existingContext = workflowStore.getState().getExecutionContext({ executionId });
      Object.entries(existingContext).forEach(([key, value]) => {
        context.set(key, value);
      });
    }

    // 🔥 의존성 레벨별로 노드 그룹화
    const levelGroups = this.groupNodesByDependencyLevel(nodes, edges);

    this.logger?.info(`🚀 워크플로우 병렬 실행 시작: ${levelGroups.length}개 레벨, ${nodes.length}개 노드`);

    // 레벨별로 순차 실행, 같은 레벨 내에서는 병렬 실행
    for (let levelIndex = 0; levelIndex < levelGroups.length; levelIndex++) {
      const currentLevel = levelGroups[levelIndex];

      this.logger?.info(`📊 레벨 ${levelIndex + 1} 실행 중: ${currentLevel.length}개 노드 병렬 처리`);

      // 같은 레벨의 모든 노드를 병렬로 실행
      const levelPromises = currentLevel.map(async (node) => {
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

          // 결과를 컨텍스트에 저장 (동시성 안전)
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

          // 에러 처리
          if (result.status === 'error') {
            throw new Error(`Node ${node.id} failed: ${result.error}`);
          }

          return { nodeId: node.id, result, success: true };

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

          if (allowPartialFailure) {
            this.logger?.warn(`⚠️ 노드 ${node.id} 실행 실패 (부분 실패 허용): ${error}`);
            return { nodeId: node.id, error, success: false };
          } else {
            throw error;
          }
        }
      });

      // 현재 레벨의 모든 노드 완료 대기
      const levelResults = await Promise.all(levelPromises);

      // 결과 확인
      const failedNodes = levelResults.filter(r => !r.success);
      if (failedNodes.length > 0 && !allowPartialFailure) {
        throw new Error(`레벨 ${levelIndex + 1}에서 ${failedNodes.length}개 노드 실행 실패`);
      }

      this.logger?.info(`✅ 레벨 ${levelIndex + 1} 완료: 성공 ${levelResults.filter(r => r.success).length}개, 실패 ${failedNodes.length}개`);
    }

    this.logger?.info(`🎉 워크플로우 병렬 실행 완료`);
  }

  // 기존 순차 실행 로직 (하위 호환성)
  async executeWorkflow(payload: {
    executionId?: string;
    nodes: AnyWorkflowNode[];
    edges: Edge[];
    triggerId: string;
  }): Promise<void> {
    // 🔥 기본적으로 병렬 실행 사용
    return this.executeWorkflowParallel({
      ...payload,
      allowPartialFailure: false
    });
  }

  // 🔥 NEW: 의존성 레벨별로 노드 그룹화 (병렬 실행용)
  private groupNodesByDependencyLevel(nodes: AnyWorkflowNode[], edges: Edge[]): AnyWorkflowNode[][] {
    const visited = new Set<string>();
    const levels: AnyWorkflowNode[][] = [];

    // 진입 차수 계산
    const inDegree: Record<string, number> = {};
    nodes.forEach(node => {
      inDegree[node.id] = 0;
    });

    edges.forEach(edge => {
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    });

    // 레벨별로 노드 분류
    let currentLevel = nodes.filter(node => inDegree[node.id] === 0);

    while (currentLevel.length > 0) {
      // 현재 레벨의 노드들을 결과에 추가
      const levelNodes = currentLevel.filter(node => !visited.has(String(node.id)));
      if (levelNodes.length > 0) {
        levels.push([...levelNodes]);
        levelNodes.forEach(node => visited.add(String(node.id)));
      }

      // 다음 레벨 노드들 찾기
      const nextLevel: AnyWorkflowNode[] = [];
      currentLevel.forEach(node => {
        edges
          .filter(edge => edge.source === node.id)
          .forEach(edge => {
            inDegree[edge.target]--;

            if (inDegree[edge.target] === 0) {
              const targetNode = nodes.find(n => n.id === edge.target);
              if (targetNode && !visited.has(String(targetNode.id))) {
                nextLevel.push(targetNode);
              }
            }
          });
      });

      currentLevel = nextLevel;
    }

    // 순환 참조 체크
    const totalNodes = levels.reduce((sum, level) => sum + level.length, 0);
    if (totalNodes !== nodes.length) {
      throw new Error('Workflow contains circular dependencies');
    }

    return levels;
  }

  // 기존 토폴로지컬 정렬 (하위 호환성)
  private getExecutionOrder(nodes: AnyWorkflowNode[], edges: Edge[]): AnyWorkflowNode[] {
    const levels = this.groupNodesByDependencyLevel(nodes, edges);
    return levels.flat();
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
