// ===== 2. 수정된 NodeExecutorFactory =====
// main/workflow/executors/NodeExecutorFactory.ts

import { AnyWorkflowNode } from '@/common/types/workflow';
import { BaseNodeExecutor } from './BaseNodeExecutor';
import { ConsoleLogger, Logger } from '../logger';
import { ServerNodeExecutor } from './ServerNodeExecutor';
import { ServiceNodeExecutor } from './ServiceNodeExecutor';
import { TriggerNodeExecutor } from './TriggerNodeExecutor';
import { IDesktopIntegration } from '../interfaces/workflow-interfaces';

export class NodeExecutorFactory {
  private executors: Record<string, new (...args: any[]) => BaseNodeExecutor> = {};
  private integration: IDesktopIntegration;
  private logger: Logger;
  
  constructor(integration: IDesktopIntegration, logger?: Logger) {
    this.integration = integration;
    this.logger = logger || new ConsoleLogger();
    
    // 기본 executor들 등록
    this.register('trigger', TriggerNodeExecutor);
    this.register('service', ServiceNodeExecutor);
    this.register('server', ServerNodeExecutor);
  }
  
  register(type: string, executor: new (...args: any[]) => BaseNodeExecutor): void {
    this.executors[type] = executor;
  }
  
  create(node: AnyWorkflowNode): BaseNodeExecutor {
    let nodeType = node.type;
    
    // client도 service로 처리
    switch (nodeType) {
      case 'client':
        nodeType = 'service';
        break;
    }
    
    const ExecutorClass = this.executors[nodeType];
    
    if (!ExecutorClass) {
      throw new Error(`No executor registered for node type: ${node.type}`);
    }
    
    // 특별한 의존성이 필요한 경우 처리
    if (nodeType === 'server') {
      return new (ExecutorClass as any)(node, this.integration, this.logger);
    }
    
    return new ExecutorClass(node, this.logger);
  }
}
