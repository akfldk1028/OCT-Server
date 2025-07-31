// ===== 2. 기본 Executor 클래스 =====
// BaseNodeExecutor.ts

import { AnyWorkflowNode } from "@/common/types/workflow";
import { ConsoleLogger, Logger } from "../logger";
import { ExecutePayload, ExecuteResult } from "./node-executor-types";

// ===== 2. 기본 Executor 클래스 =====
// BaseNodeExecutor.ts

export abstract class BaseNodeExecutor<T extends AnyWorkflowNode = AnyWorkflowNode> {
    protected node: T;
    protected logger: Logger;
    
    constructor(node: T, logger?: Logger) {
      this.node = node;
      this.logger = logger || new ConsoleLogger();
    }
    
    // Template Method Pattern
    async execute(payload: ExecutePayload): Promise<ExecuteResult> {
      const startTime = Date.now();
      
      try {
        // 전처리
        this.beforeExecute(payload);
        
        // 노드별 실제 실행 로직
        const result = await this.doExecute(payload);
        
        // 후처리
        this.afterExecute(payload, result);
        
        // 실행 시간 로깅
        const duration = Date.now() - startTime;
        this.logger.info(`Node ${this.node.id} executed in ${duration}ms`);
        
        return {
          nodeId: String(this.node.id),
          triggerId: payload.triggerId,
          status: 'success',
          timestamp: new Date().toISOString(),
          ...result
        };
        
      } catch (error) {
        this.logger.error(`Node ${this.node.id} execution failed:`, error);
        
        return {
          nodeId: String(this.node.id),
          triggerId: payload.triggerId,
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // Hook methods
    protected beforeExecute(payload: ExecutePayload): void {
      this.logger.debug(`Executing node ${this.node.id} of type ${this.node.type}`);
    }
    
    protected afterExecute(payload: ExecutePayload, result: any): void {
      // 기본 구현은 비어있음. 서브클래스에서 필요시 오버라이드
    }
    
    // 서브클래스에서 구현해야 하는 추상 메서드
    protected abstract doExecute(payload: ExecutePayload): Promise<Partial<ExecuteResult>>;
    
    // 유틸리티 메서드들
    protected isLastNode(payload: ExecutePayload): boolean {
      return !payload.edges.some(e => e.source === this.node.id);
    }
    
    protected getPreviousNodes(payload: ExecutePayload): AnyWorkflowNode[] {
      const prevNodeIds = payload.edges
        .filter(e => e.target === this.node.id)
        .map(e => e.source);
      
      return payload.nodes.filter(n => prevNodeIds.includes(String(n.id)));
    }
  }