import { getWorkflowWithDetails } from '../features/server/workflow-queries';

// 타입 정의
export type AnalysisResult = {
  clients: string[];
  mcpServers: string[];
  hasClaudeClient: boolean;
  hasOpenAIClient: boolean; 
  hasLocalClient: boolean;
  hasMCPServers: boolean;
  primaryClientType: string | null;
};

// 🎯 메인 분석 함수
export const analyzeWorkflowClientType = async (workflow: any, client: any, userId: string): Promise<{ client_type: string; target_clients: string[] }> => {
  try {
    // 1. 워크플로우 데이터 로드
    const workflowDetails = await loadWorkflowDetails(workflow.id, client, userId);
    if (!workflowDetails) {
      return { client_type: 'unknown', target_clients: [] };
    }

    // 2. DFS 기반 노드 분석
    const analysisResult = await analyzeNodesByDFS(workflowDetails);
    if (!analysisResult) {
      return { client_type: 'unknown', target_clients: [] };
    }

    // 3. 최종 클라이언트 타입 결정
    const clientType = determineClientType(analysisResult, workflowDetails);
    
    return { 
      client_type: clientType, 
      target_clients: [...new Set(analysisResult.clients)] 
    };
    
  } catch (error) {
    console.error('❌ 워크플로우 분석 실패:', error);
    return { client_type: 'unknown', target_clients: [] };
  }
};

// 📥 워크플로우 상세 정보 로드
const loadWorkflowDetails = async (workflowId: number, client: any, userId: string) => {
  const workflowDetails = await getWorkflowWithDetails(client as any, {
    workflow_id: workflowId,
    profile_id: userId,
  });
  
  if (!workflowDetails?.nodes || !workflowDetails?.edges) {
    return null;
  }
  
  return workflowDetails;
};

// 🔄 DFS 기반 노드 분석
const analyzeNodesByDFS = async (workflowDetails: any): Promise<AnalysisResult | null> => {
  // 트리거 노드 찾기
  const triggerNode = workflowDetails.nodes.find((node: any) => node.node_type === 'trigger');
  if (!triggerNode) {
    console.log('⚠️ 트리거 노드 없음');
    return null;
  }

  // ReactFlow 형식으로 변환
  const { nodes, edges } = convertToReactFlowFormat(workflowDetails);
  
  // 간단한 DFS 순회 (dfsTraverse 함수 없이)
  const orderedNodes = performSimpleDFS(triggerNode.node_id, nodes, edges);

  // 분석 결과 초기화
  const result: AnalysisResult = {
    clients: [],
    mcpServers: [],
    hasClaudeClient: false,
    hasOpenAIClient: false,
    hasLocalClient: false,
    hasMCPServers: false,
    primaryClientType: null
  };

  // 순서대로 노드 분석
  for (const node of orderedNodes) {
    analyzeNode(node, result);
  }

  return result;
};

// 🔄 ReactFlow 형식 변환
const convertToReactFlowFormat = (workflowDetails: any) => {
  const nodes = workflowDetails.nodes.map((node: any) => ({
    id: node.node_id,
    type: node.node_type,
    data: node.node_config || {},
    mcp_servers: node.mcp_servers,
  }));

  const edges = workflowDetails.edges.map((edge: any) => ({
    id: edge.edge_id,
    source: edge.source_node_id,
    target: edge.target_node_id,
  }));

  return { nodes, edges };
};

// 간단한 DFS 구현
const performSimpleDFS = (startNodeId: string, nodes: any[], edges: any[]): any[] => {
  const visited = new Set<string>();
  const result: any[] = [];
  
  const dfs = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      result.push(node);
      
      // 연결된 노드들 찾기
      const connectedEdges = edges.filter(e => e.source === nodeId);
      for (const edge of connectedEdges) {
        dfs(edge.target);
      }
    }
  };
  
  dfs(startNodeId);
  return result;
};

// 🔍 개별 노드 분석
const analyzeNode = (node: any, result: AnalysisResult) => {
  if (node.type === 'service' || node.type === 'client') {
    analyzeServiceNode(node, result);
  } else if (node.type === 'server') {
    analyzeServerNode(node, result);
  }
};

// 🔧 서비스 노드 분석
const analyzeServiceNode = (node: any, result: AnalysisResult) => {
  const config = node.data?.config || node.data;
  const clientName = config?.name;
  
  if (!clientName) return;

  // 첫 번째 클라이언트가 주요 타겟
  if (!result.primaryClientType) {
    result.clients.push(clientName);
    result.primaryClientType = classifyClientType(clientName);
    
    // 플래그 설정
    if (result.primaryClientType === 'claude_desktop') {
      result.hasClaudeClient = true;
    } else if (result.primaryClientType === 'openai') {
      result.hasOpenAIClient = true;
    } else {
      result.hasLocalClient = true;
    }
  } else if (!result.clients.includes(clientName)) {
    // 추가 클라이언트 수집
    result.clients.push(clientName);
    
    const additionalType = classifyClientType(clientName);
    if (additionalType === 'claude_desktop') result.hasClaudeClient = true;
    else if (additionalType === 'openai') result.hasOpenAIClient = true;
    else result.hasLocalClient = true;
  }
};

// 🖥️ 서버 노드 분석
const analyzeServerNode = (node: any, result: AnalysisResult) => {
  const mcpServers = node.mcp_servers || [];
  if (mcpServers.length > 0) {
    result.hasMCPServers = true;
    result.mcpServers.push(...mcpServers.map((s: any) => s.name || s.id));
  }
};

// 🏷️ 클라이언트 타입 분류
const classifyClientType = (clientName: string): string => {
  const name = clientName.toLowerCase();
  
  if (name.includes('claude') || name.includes('anthropic')) {
    return 'claude_desktop';
  } else if (name.includes('openai') || name.includes('gpt') || name.includes('chatgpt')) {
    return 'openai';
  } else {
    return 'local';
  }
};

// 🎯 최종 클라이언트 타입 결정
const determineClientType = (result: AnalysisResult, workflowDetails: any): string => {
  // 1. Mixed 타입 체크
  const mixedType = checkMixedType(result);
  if (mixedType) return mixedType;
  
  // 2. Primary 타입 기반 결정
  if (result.primaryClientType) {
    return result.primaryClientType;
  }
  
  // 3. 메타데이터 기반 분석
  return analyzeWorkflowMetadata(workflowDetails, result);
};

// 🔀 Mixed 타입 체크
const checkMixedType = (result: AnalysisResult): string | null => {
  const typeCount = [
    result.hasClaudeClient,
    result.hasOpenAIClient,
    result.hasLocalClient
  ].filter(Boolean).length;
  
  if (typeCount > 1) {
    return 'mixed';
  }
  
  return null;
};

// 📊 메타데이터 기반 분석
const analyzeWorkflowMetadata = (workflowDetails: any, result: AnalysisResult): string => {
  // 노드 타입 기반 추론
  const hasServiceNodes = workflowDetails.nodes?.some((node: any) => 
    node.node_type === 'service' || node.node_type === 'client'
  );
  
  if (hasServiceNodes && result.hasMCPServers) {
    return 'claude_desktop'; // MCP 서버가 있으면 Claude Desktop으로 추정
  } else if (hasServiceNodes) {
    return 'local'; // 서비스 노드만 있으면 로컬로 추정
  }
  
  return 'unknown';
}; 