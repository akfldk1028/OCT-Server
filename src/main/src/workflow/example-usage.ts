// ===== 7. 올바른 사용 예시 =====
// main/workflow/example-usage.ts

import { WorkflowExecutor } from './workflow-executor';
import { WorkflowManager } from './workflow-manager';
import { FileWorkflowRepository } from './persistence/file-workflow-repository';
import { ClaudeDesktopIntegration } from './service/claude';
import { ConsoleLogger } from './logger';
import { workflowStore } from '@/main/stores/workflow/workflowStore';

export async function setupWorkflowSystem() {
  // 1. 의존성 준비
  const integration = new ClaudeDesktopIntegration();
  const logger = new ConsoleLogger();
  const repository = new FileWorkflowRepository();
  
  // 2. Executor와 Manager 생성
  const executor = new WorkflowExecutor(integration, logger);
  const manager = new WorkflowManager(repository, executor);
  
  // 3. Store 초기화
  await workflowStore.getState().initialize();
  
  // 4. 워크플로우 생성 및 저장
  const workflow = await manager.createWorkflow({
    name: 'Claude + MCP Integration',
    description: 'Connects Claude to local MCP servers',
    nodes: [
      {
        id: '1',
        type: 'trigger',
        label: 'START TRIGGER',
        position: { x: 0, y: 0 }
      },
      {
        id: '2',
        type: 'service',
        config: { name: 'Claude AI' },
        position: { x: 200, y: 0 }
      },
      {
        id: '3',
        type: 'server',
        config: { name: 'filesystem' },
        position: { x: 400, y: 0 }
      }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' }
    ],
    tags: ['claude', 'mcp']
  });
  
  // 5. 실행
  await executor.executeStoredWorkflow(workflow.id);
  
  console.log('✅ Workflow system setup complete');
}