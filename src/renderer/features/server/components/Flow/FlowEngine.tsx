// FlowEngine.tsx
import { Node, Edge } from '@xyflow/react';
import { dfsTraverse } from '../node/FlowDfsUtil';
import { enhanceNodeData, enhanceWorkflowData } from './NodeDataEnhancer';
import { WorkflowNodeData, WorkflowPayload } from '@/common/types/workflow';


const ensureApi = () => {
  if (!window.api) {
    console.warn('Electron API not available. Multi-server features will be limited.');
    return null;
  }
  return window.api;
};

// 실행 결과를 위한 타입
export interface WorkflowExecutionResult {
  workflow: any[];         // 워크플로우 구조 (노드들)
  executionOrder: string[]; // 실행 순서
  results: Record<string, any>; // 각 노드별 실행 결과
  finalData: any;          // 최종 데이터
  success: boolean;        // 성공 여부
  error?: any;             // 오류 정보 (있을 경우)
  originalNodes?: any[];   // 원본 노드 데이터 (시각화용)
}



export async function executeWorkflow(
  triggerId: string, 
  nodes: any[],
  edges: any[]
): Promise<any> {
  // 1. DFS로 노드 순서 가져오기
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  const orderedNodes = dfsTraverse(triggerId, safeNodes, safeEdges);

  // 2. 강화된 노드 데이터로 변환 (TriggerNode.tsx와 동일)
  const enhancedNodes = orderedNodes.map((node) => {
    const enhancedData = enhanceNodeData({
      id: node.id,
      type: node.type,
      data: node.data,
    });
    return {
      id: node.id,
      type: node.type,
      position: (node as any).position,
      data: enhancedData,  // 🔥 data 필드에 강화된 데이터 넣기
    };
  });

  // 3. 워크플로우 실행용 payload 생성
  const payload = {
    executionId: triggerId + '_' + Date.now(),
    workflowId: triggerId,
    nodes: enhancedNodes as any,  // 타입 에러 무시
    edges: safeEdges,
    triggerId,
    context: {},
  };

  // 4. preload-workflow.ts의 API로 실행 요청
  try {
    const api = ensureApi();
    if (api) {
      const result = await api.workflow.executeWorkflow(payload);
      return result;
    }
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}



/**
 * 워크플로우 실행 엔진 
 * 노드를 순서대로 실행하고 결과를 반환
 */
// export async function executeWorkflow(
//   triggerId: string, 
//   nodes: any[],
//   edges: any[]
// ): Promise<WorkflowExecutionResult> {
//   try {
//     // 1. DFS로 노드 순서 가져오기
//     const safeNodes = Array.isArray(nodes) ? nodes : [];
//     const safeEdges = Array.isArray(edges) ? edges : [];
//     const orderedNodes = dfsTraverse(triggerId, safeNodes, safeEdges);
    
//     console.log('실행 순서:', orderedNodes.map(n => n.id));
    
//     // 2. 워크플로우 JSON 생성 (실행용)
//     const workflowJson = orderedNodes.map((node) => {
//       // NodeDataEnhancer를 사용하여 노드 데이터 강화
//       const enhancedData = enhanceNodeData({
//         id: node.id,
//         type: node.type,
//         data: node.data
//       });
      
//       return {
//         ...enhancedData,
//         id: node.id,
//         position: (node as any).position,
//         type: node.type,
//       };
//     });
    
//     // 로그 추가 - 메타데이터 확인
//     console.log('강화된 워크플로우 JSON:', workflowJson);
    
//     // 3. 실행 컨텍스트 초기화
//     let context = {
//       data: {}, // 노드 간 데이터 흐름
//       results: {} as Record<string, any>, // 각 노드 실행 결과
//     };
    
//     // 4. 각 노드 순서대로 실행
//     for (const node of workflowJson) {
//       // 현재 노드 실행 로깅
//       console.log(`노드 실행: [${node.type}] ${node.id} - ${node.name || node.label || 'unnamed'}`);
      
//       try {
//         // 노드 타입별 실행
//         const result = await executeNode(node, context.data);
        
//         // 결과 저장
//         context.results[node.id] = result;
        
//         // 다음 노드로 전달할 데이터 업데이트 
//         context.data = {
//           ...context.data,
//           ...result,
//         };
        
//         console.log(`노드 ${node.id} 실행 완료:`, result);
//       } catch (error: any) {
//         console.error(`노드 ${node.id} 실행 오류:`, error);
//         context.results[node.id] = { 
//           error: true, 
//           message: error.message 
//         };
        
//         // 오류 발생 시 중단 (선택사항)
//         throw new Error(`노드 ${node.id} (${node.type}) 실행 중 오류: ${error.message}`);
//       }
//     }
    
//     // 5. 실행 결과 반환
//     return {
//       workflow: workflowJson,
//       executionOrder: workflowJson.map(n => n.id),
//       results: context.results,
//       finalData: context.data,
//       success: true,
//       originalNodes: orderedNodes // 원본 노드 데이터도 포함
//     };
//   } catch (error: any) {
//     console.error('워크플로우 실행 오류:', error);
//     return {
//       workflow: [],
//       executionOrder: [],
//       results: {},
//       finalData: null,
//       success: false,
//       error
//     };
//   }
// }

/**
 * 개별 노드 실행 함수
 * 노드 타입별로 다른 처리 로직 실행
 */
async function executeNode(node: any, inputData: any): Promise<any> {
  const { type } = node;
  
  switch (type) {
    case 'trigger':
      return executeTriggerNode(node, inputData);
      
    case 'service':
      return executeServiceNode(node, inputData);
      
    case 'server':
      return executeServerNode(node, inputData);
      
    // 다른 노드 타입들...
    case 'text':
      return executeTextNode(node, inputData);
      
    case 'result':
      return executeResultNode(node, inputData);
     
    case 'counter':
      return executeCounterNode(node, inputData);
      
    case 'image':
      return executeImageNode(node, inputData);
      
    case 'color':
      return executeColorPickerNode(node, inputData);
      
    default:
      return executeDefaultNode(node, inputData);
  }
}

// ===== 노드 타입별 실행 함수들 =====

// 트리거 노드 실행
async function executeTriggerNode(node: any, inputData: any): Promise<any> {
  return {
    nodeType: 'trigger',
    nodeName: node.label || 'Trigger',
    started: true,
    timestamp: new Date().toISOString(),
    // 트리거 노드에서 제공할 초기 데이터 (있다면)
    initialData: node.initialData || {}
  };
}

// 서비스 노드 실행 (API 호출 등)
async function executeServiceNode(node: any, inputData: any): Promise<any> {
  console.log(`서비스 노드 '${node.name}' 실행 중... 입력:`, inputData);
  
  // 실제 구현: 서비스 API 호출 등
  // 예시: 딜레이로 비동기 처리 흉내
  return new Promise(resolve => {
    setTimeout(() => {
      const result = {
        nodeType: 'service',
        serviceName: node.name,
        description: node.description || '',
        processedAt: new Date().toISOString(),
        serviceResult: `${node.name} 서비스 처리 결과`,
        // 입력 데이터 처리
        processedInput: inputData.text || inputData.initialData || '입력 없음'
      };
      
      resolve(result);
    }, 300);
  });
}

// 서버 노드 실행
async function executeServerNode(node: any, inputData: any): Promise<any> {
  console.log(`서버 노드 '${node.name || node.id}' 실행 중... 입력:`, inputData);
  
  // 실제 구현: 서버 처리 로직
  // 예시: 딜레이로 비동기 처리 흉내
  return new Promise(resolve => {
    setTimeout(() => {
      const result = {
        nodeType: 'server',
        serverName: node.name || node.id,
        serverId: node.id,
        status: node.status || 'unknown',
        processedAt: new Date().toISOString(),
        serverResult: `${node.name || node.id} 서버 처리 결과`,
        // 이전 서비스 노드 결과 활용 (있다면)
        enhancedData: inputData.serviceResult ? 
          `${inputData.serviceResult} + 서버 처리` : 
          '서버 처리만 수행'
      };
      
      resolve(result);
    }, 500);
  });
}

// 텍스트 노드 실행
async function executeTextNode(node: any, inputData: any): Promise<any> {
  return {
    nodeType: 'text',
    text: node.text || '',
    processedAt: new Date().toISOString()
  };
}

// 결과 노드 실행
async function executeResultNode(node: any, inputData: any): Promise<any> {
  // 입력 데이터를 정리해서 결과로 반환
  return {
    nodeType: 'result',
    label: node.label || 'Result',
    finalResult: true, // 이 노드가 최종 결과임을 표시
    data: inputData, // 이전 노드들에서 처리된 모든 데이터
    timestamp: new Date().toISOString()
  };
}

// 카운터 노드 실행
async function executeCounterNode(node: any, inputData: any): Promise<any> {
  const currentCount = node.count || 0;
  return {
    nodeType: 'counter',
    previousCount: currentCount,
    count: currentCount + 1,
    timestamp: new Date().toISOString()
  };
}

// 이미지 노드 실행
async function executeImageNode(node: any, inputData: any): Promise<any> {
  return {
    nodeType: 'image',
    imageUrl: node.imageUrl,
    imageName: node.imageName,
    processed: true,
    timestamp: new Date().toISOString()
  };
}

// 색상 선택 노드 실행
async function executeColorPickerNode(node: any, inputData: any): Promise<any> {
  return {
    nodeType: 'color',
    color: node.color || '#000000',
    processed: true,
    timestamp: new Date().toISOString()
  };
}

// 기본 노드 실행 (알 수 없는 타입)
async function executeDefaultNode(node: any, inputData: any): Promise<any> {
  return {
    nodeType: node.type || 'unknown',
    processed: true,
    passthrough: true, // 데이터 변경 없이 통과만 함
    inputData, // 입력 데이터 그대로 전달
    timestamp: new Date().toISOString()
  };
}


