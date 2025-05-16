// [1] 🧩 context {
//     [1]   '1': { started: true, timestamp: '2025-05-16T12:38:14.802Z' },
//     [1]   started: true,
//     [1]   timestamp: '2025-05-16T12:38:14.802Z'
//     [1] }
//     [1] 🧩 this.node {
//     [1]   config: {
//     [1]     client_id: 1,
//     [1]     name: 'Claude AI',
//     [1]     tagline: 'Advanced AI Assistant for Complex Tasks',
//     [1]     description: 'Claude is an AI assistant by Anthropic that excels at reasoning, writing, coding, and analysis. Built with constitutional AI principles for helpful, harmless, and honest interactions.',
//     [1]     how_it_works: 'Access through web interface, API, or mobile app. Type questions or upload documents for analysis. Claude can help with writing, coding, research, and complex problem-solving with detailed explanations.',
//     [1]     icon: 'https://github.com/claude.png',
//     [1]     url: 'https://claude.ai',
//     [1]     stats: { views: 867, reviews: 0, upvotes: 26 },
//     [1]     promoted_from: null,
//     [1]     promoted_to: null,
//     [1]     created_at: '2025-05-15T11:57:43.140613',
//     [1]     updated_at: '2025-05-15T11:57:43.140613'
//     [1]   },
//     [1]   id: '2',
//     [1]   type: 'service',
//     [1]   typeVersion: '0.0.1',
//     [1]   category: 'Services',
//     [1]   description: '외부 서비스 또는 API와 연동',
//     [1]   position: { x: 12, y: 192 }
//     [1] }
//     [1] 🧩 triggerId 1
    
    
import { getInputEdges, getPrevNodeIds, getPrevResults, logPrevNodeInfo } from './INodeExecutor';

import { INodeExecutor } from './INodeExecutor';
import { ClaudeDesktopIntegration } from './service/claude';
import { WorkflowNodeData, ServiceNodeData, WorkflowPayload, AnyWorkflowNode } from 'src/common/types/workflow';

export class ServiceNodeExecutor implements INodeExecutor {
    constructor(
      private node: ServiceNodeData,
      private nodes: AnyWorkflowNode[],
      private edges: any[],
      private triggerId: string
    ) {}
  
    async execute(
        context: any,
        nodes: AnyWorkflowNode[],
        edges: any[],
        triggerId: string
      ) {

    console.log('🧩 context', context);
    console.log('🧩 this.node', this.node); // 현재 실행 중인 노드만 나옴
    console.log('🧩 triggerId', triggerId);
    console.log('🧩 this.node', this.node.category); // 현재 실행 중인 노드만 나옴
    // (2) 서비스 노드의 결과만 context[this.node.id]에 저장
 
  const inputEdges = getInputEdges(this.node.id.toString(), edges);
  const prevNodeIds = getPrevNodeIds(this.node.id.toString(), edges);
  const prevResults = getPrevResults(this.node.id.toString(), edges, context);
  logPrevNodeInfo(this.node.id.toString(), edges, context);

  // (3) context만 반환
  return { 
    node: this.node, 
    triggerId: triggerId, 
    started: true, 
    timestamp: new Date().toISOString() 
  };

}
}
