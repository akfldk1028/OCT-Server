// [1] 🪢 [Prev Node Ids] 이전 노드 id: [ '2' ]
// [1] 📦 [Prev Result] 이전 노드(2) 결과: {
// [1]   node: {
// [1]     config: {
// [1]       client_id: 1,
// [1]       name: 'Claude AI',
// [1]       tagline: 'Advanced AI Assistant for Complex Tasks',
// [1]       description: 'Claude is an AI assistant by Anthropic that excels at reasoning, writing, coding, and analysis. Built with constitutional AI principles for helpful, harmless, and honest interactions.',
// [1]       how_it_works: 'Access through web interface, API, or mobile app. Type questions or upload documents for analysis. Claude can help with writing, coding, research, and complex problem-solving with detailed explanations.',
// [1]       icon: 'https://github.com/claude.png',
// [1]       url: 'https://claude.ai',
// [1]       stats: [Object],
// [1]       promoted_from: null,
// [1]       promoted_to: null,
// [1]       created_at: '2025-05-15T11:57:43.140613',
// [1]       updated_at: '2025-05-15T11:57:43.140613'
// [1]     },
// [1]     id: '2',
// [1]     type: 'service',
// [1]     typeVersion: '0.0.1',
// [1]     category: 'Services',
// [1]     description: '외부 서비스 또는 API와 연동',
// [1]     position: { x: 12, y: 192 }
// [1]   },
// [1]   triggerId: '1',
// [1]   started: true,
// [1]   timestamp: '2025-05-16T13:35:35.113Z'
// [1] }

import { INodeExecutor } from './INodeExecutor';
import { ClaudeDesktopIntegration } from './service/claude';
import { getInputEdges, getPrevNodeIds, getPrevResults, logPrevNodeInfo, isLastNode } from './INodeExecutor';
import { WorkflowNodeData, ServerNodeData, WorkflowPayload, AnyWorkflowNode } from 'src/common/types/workflow';

export class ServerNodeExecutor implements INodeExecutor {
  constructor(
    private node: ServerNodeData,
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
    console.log('🔥 context', context);
    console.log('🔥 this.node', this.node); // 현재 실행 중인 노드만 나옴
    console.log('🔥 triggerId', triggerId);

    // 이전 노드 결과 파싱
    const prevResults = getPrevResults(this.node.id.toString(), this.edges, context);

    let lastMessage = '';
    for (const prev of prevResults) {
      const prevNode = prev?.node;
      if (!prevNode) continue;
      handlePrevNode(prevNode, this.node);
      // 연결 메시지 생성
      const name = prevNode?.config?.name;
      if (name) {
        if (name.toLowerCase().includes('claude')) {
          lastMessage += `연결 성공: ${name}\n Claude Desktop 재시작 필요`;
        } 
        else 
        {
          lastMessage += `연결 성공: ${name}`;
        }
      }
    }

    logPrevNodeInfo(this.node.id.toString(), this.edges, context);
    if (isLastNode(this.node.id.toString(), this.edges)) {
      console.log('🏁 이 노드는 워크플로우의 마지막 노드입니다!');
      return {
        node: this.node,
        triggerId: triggerId,
        started: true,
        timestamp: new Date().toISOString(),
        isLast: true,
        message: lastMessage.trim(), // 연결 메시지 반환
      };
    }
    
    // 마지막이 아니면 기존대로
    return {
      node: this.node,
      triggerId: triggerId,
      started: true,
      timestamp: new Date().toISOString()
    };
  }
}


function handlePrevNode(prevNode: any, node: ServerNodeData) {
  switch (prevNode.type) {
    case 'service':
      handleServiceNode(prevNode, node);
      break;
    case 'trigger':
      console.log('🚦 이전 노드가 트리거입니다!');
      // 트리거 관련 처리
      break;
    case 'server':
      console.log('🖥️ 이전 노드가 서버입니다!');
      // 서버 관련 처리
      break;
    default:
      console.log('❓ 이전 노드 타입:', prevNode.type);
      // 기타 타입 처리
      break;
  }
}

function handleServiceNode(prevNode: any, node: ServerNodeData) {
  const name = prevNode.config?.name?.toLowerCase() || '';
  switch (true) {
    case name.startsWith('claude'):
      console.log('🧠 이전 노드가 Claude 서비스입니다!');
      if (node.config) {
        console.log(node.config.id); // 자동완성 OK
      }
      console.log(node.config?.id)
      console.log(node.config?.name)

      const claude = new ClaudeDesktopIntegration();
      const isConnected = claude.isServerConnected(node.config?.name?.toString() || '');
      if (!isConnected) {
        const connected = claude.connectServer(node.config?.name?.toString() || '', node.config || {});
        if (!connected) {
          throw new Error('Claude 서버 연결 실패');
        }
      }
      break;
    case name.startsWith('other'):
      console.log('🔧 이전 노드가 Other Service입니다!');
      // Other Service 관련 함수 호출
      break;
    default:
      console.log('🛠️ 이전 노드가 기타 서비스입니다!');
      // 기본 서비스 처리
      break;
  }
}

