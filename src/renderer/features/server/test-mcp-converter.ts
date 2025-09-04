// 🧪 MCP JSON 변환 및 검증 테스트 파일

import { convertToMcpWorkflow, convertMcpJsonToReactFlow, convertWorkflowToReactFlow } from './workflow-queries';

// 테스트용 ReactFlow 노드/엣지 데이터
const testReactFlowData = {
  nodes: [
    {
      id: 'filesystem-node',
      type: 'server',
      position: { x: 100, y: 100 },
      data: {
        id: 1,
        original_server_id: 42,
        mcp_servers: {
          id: 42,
          name: 'filesystem',
          description: 'File system operations'
        },
        mcp_configs: [
          {
            command: 'uvx',
            args: ['mcp-server-filesystem', '/tmp'],
            env: {}
          }
        ],
        available_tools: [
          {
            name: 'read_file',
            description: 'Read a file from the filesystem'
          },
          {
            name: 'write_file',
            description: 'Write content to a file'
          }
        ]
      }
    },
    {
      id: 'git-node',
      type: 'server',
      position: { x: 400, y: 100 },
      data: {
        id: 2,
        original_server_id: 43,
        mcp_servers: {
          id: 43,
          name: 'git',
          description: 'Git operations'
        },
        mcp_configs: [
          {
            command: 'uvx',
            args: ['mcp-server-git', '--repository', '/tmp/repo'],
            env: {}
          }
        ],
        available_tools: [
          {
            name: 'git_log',
            description: 'Get git commit history'
          }
        ]
      }
    }
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'filesystem-node',
      target: 'git-node',
      sourceHandle: 'output',
      targetHandle: 'input',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#0ea5e9' }
    }
  ]
};

// 🧪 MCP JSON 변환 테스트
export const testMcpConversion = () => {
  console.log('🧪 [테스트] ReactFlow → MCP JSON 변환 시작');

  const mcpWorkflow = convertToMcpWorkflow(
    testReactFlowData.nodes,
    testReactFlowData.edges,
    {
      name: '테스트 워크플로우',
      description: 'ReactFlow에서 MCP JSON으로 변환 테스트'
    }
  );

  console.log('✅ [테스트] MCP JSON 변환 결과:', JSON.stringify(mcpWorkflow, null, 2));

  // 🔍 변환 결과 검증
  const validation = {
    hasMcpVersion: !!mcpWorkflow.mcp_version,
    hasWorkflow: !!mcpWorkflow.workflow,
    hasMetadata: !!mcpWorkflow.workflow?.metadata,
    hasServers: mcpWorkflow.workflow?.servers?.length > 0,
    hasNodes: mcpWorkflow.workflow?.execution_graph?.nodes?.length > 0,
    hasEdges: mcpWorkflow.workflow?.execution_graph?.edges?.length > 0,
    serverCount: mcpWorkflow.workflow?.servers?.length || 0,
    nodeCount: mcpWorkflow.workflow?.execution_graph?.nodes?.length || 0,
    edgeCount: mcpWorkflow.workflow?.execution_graph?.edges?.length || 0
  };

  console.log('🔍 [테스트] 검증 결과:', validation);

  // ✅ 성공 여부 판단
  const isValid = validation.hasMcpVersion &&
                  validation.hasWorkflow &&
                  validation.hasMetadata &&
                  validation.hasServers &&
                  validation.hasNodes;

  console.log(isValid ? '🎉 [테스트] 변환 성공!' : '❌ [테스트] 변환 실패!');

  return { mcpWorkflow, validation, isValid };
};

// 🧪 MCP JSON → ReactFlow 역변환 테스트 (실제 구현)
export const testMcpToReactFlow = (mcpWorkflow: any) => {
  console.log('🧪 [테스트] MCP JSON → ReactFlow 역변환 시작');

  // 실제 변환 함수 사용
  const reactFlowData = convertMcpJsonToReactFlow(mcpWorkflow);

  console.log('✅ [테스트] 역변환 결과:', reactFlowData);

  // 🔍 역변환 검증
  const reverseValidation = {
    hasNodes: reactFlowData.nodes.length > 0,
    hasEdges: reactFlowData.edges.length > 0,
    nodeCount: reactFlowData.nodes.length,
    edgeCount: reactFlowData.edges.length,
    firstNodeHasPosition: !!reactFlowData.nodes[0]?.position,
    firstNodeHasData: !!reactFlowData.nodes[0]?.data
  };

  console.log('🔍 [테스트] 역변환 검증:', reverseValidation);

  return { reactFlowData, reverseValidation };
};

// 🚀 테스트 실행 함수
export const runAllTests = () => {
  console.log('🚀 [테스트] MCP 워크플로우 변환 테스트 시작');
  console.log('==========================================');

  // 1. ReactFlow → MCP JSON 변환 테스트
  const conversionTest = testMcpConversion();

  // 2. 역변환 테스트 (실제 구현)
  let reverseTest = null;
  if (conversionTest.isValid) {
    reverseTest = testMcpToReactFlow(conversionTest.mcpWorkflow);
  }

  // 3. 라운드트립 테스트 (원본 → MCP → ReactFlow → MCP)
  if (reverseTest && conversionTest.isValid) {
    console.log('🔄 [테스트] 라운드트립 테스트 시작');
    const secondMcpConversion = convertToMcpWorkflow(
      reverseTest.reactFlowData.nodes,
      reverseTest.reactFlowData.edges,
      { name: '라운드트립 테스트', description: '원본 → MCP → ReactFlow → MCP' }
    );

    const roundtripResult = {
      original_nodes: testReactFlowData.nodes.length,
      original_edges: testReactFlowData.edges.length,
      final_nodes: secondMcpConversion.workflow.execution_graph.nodes.length,
      final_edges: secondMcpConversion.workflow.execution_graph.edges.length,
      data_preserved: (
        testReactFlowData.nodes.length === secondMcpConversion.workflow.execution_graph.nodes.length &&
        testReactFlowData.edges.length === secondMcpConversion.workflow.execution_graph.edges.length
      )
    };

    console.log('🔄 [테스트] 라운드트립 결과:', roundtripResult);
  }

  console.log('==========================================');
  console.log('🏁 [테스트] 모든 테스트 완료');

  return conversionTest;
};

// 브라우저 콘솔에서 테스트 실행하기 위한 전역 함수 등록
if (typeof window !== 'undefined') {
  (window as any).testMcpWorkflow = runAllTests;
  console.log('💡 브라우저 콘솔에서 testMcpWorkflow() 실행하여 테스트할 수 있습니다.');
}
