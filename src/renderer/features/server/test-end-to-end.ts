// 🧪 클라이언트-서버 종합 테스트 파일

import { makeSSRClient } from '@/renderer/supa-client';
import { createWorkflow, updateWorkflowMcpJson, getWorkflowWithMcpJson, convertToMcpWorkflow, convertWorkflowToReactFlow } from './workflow-queries';

// 🧪 테스트용 샘플 워크플로우 데이터
const sampleWorkflowData = {
  name: 'E2E 테스트 워크플로우',
  description: 'End-to-End 테스트용 샘플 워크플로우',
  profile_id: '', // 런타임에 설정
  flow_structure: {
    nodes: [
      {
        id: 'fs-node-1',
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
          ]
        }
      },
      {
        id: 'git-node-1',
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
          ]
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'fs-node-1',
        target: 'git-node-1',
        type: 'smoothstep',
        animated: true
      }
    ]
  }
};

// 🧪 E2E 테스트 결과 타입
interface E2ETestResult {
  phase: string;
  success: boolean;
  data?: any;
  error?: string;
  timing?: number;
}

// 🧪 워크플로우 생성 테스트
export const testCreateWorkflow = async (userId: string): Promise<E2ETestResult> => {
  const startTime = Date.now();

  try {
    console.log('🧪 [E2E] 워크플로우 생성 테스트 시작');

    const { client } = makeSSRClient();
    const workflowData = {
      ...sampleWorkflowData,
      profile_id: userId
    };

    const result = await createWorkflow(client as any, workflowData);

    console.log('✅ [E2E] 워크플로우 생성 성공:', result);

    return {
      phase: 'create_workflow',
      success: true,
      data: result,
      timing: Date.now() - startTime
    };
  } catch (error) {
    console.error('❌ [E2E] 워크플로우 생성 실패:', error);

    return {
      phase: 'create_workflow',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timing: Date.now() - startTime
    };
  }
};

// 🧪 MCP JSON 저장 테스트
export const testSaveMcpJson = async (workflowId: number): Promise<E2ETestResult> => {
  const startTime = Date.now();

  try {
    console.log('🧪 [E2E] MCP JSON 저장 테스트 시작');

    // ReactFlow 데이터를 MCP JSON으로 변환
    const mcpWorkflow = convertToMcpWorkflow(
      sampleWorkflowData.flow_structure.nodes,
      sampleWorkflowData.flow_structure.edges,
      {
        name: sampleWorkflowData.name,
        description: sampleWorkflowData.description
      }
    );

    const { client } = makeSSRClient();
    const result = await updateWorkflowMcpJson(client as any, {
      workflow_id: workflowId,
      mcp_workflow_json: mcpWorkflow
    });

    console.log('✅ [E2E] MCP JSON 저장 성공:', result);

    return {
      phase: 'save_mcp_json',
      success: true,
      data: { workflowId, mcpWorkflow },
      timing: Date.now() - startTime
    };
  } catch (error) {
    console.error('❌ [E2E] MCP JSON 저장 실패:', error);

    return {
      phase: 'save_mcp_json',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timing: Date.now() - startTime
    };
  }
};

// 🧪 워크플로우 로딩 테스트
export const testLoadWorkflow = async (workflowId: number, userId: string): Promise<E2ETestResult> => {
  const startTime = Date.now();

  try {
    console.log('🧪 [E2E] 워크플로우 로딩 테스트 시작');

    const { client } = makeSSRClient();
    const workflow = await getWorkflowWithMcpJson(client as any, {
      workflow_id: workflowId,
      profile_id: userId
    });

    if (!workflow) {
      throw new Error('워크플로우를 찾을 수 없습니다');
    }

    console.log('✅ [E2E] 워크플로우 로딩 성공:', {
      id: workflow.id,
      name: workflow.name,
      has_mcp_json: !!workflow.mcp_workflow_json,
      has_legacy_structure: !!workflow.flow_structure
    });

    return {
      phase: 'load_workflow',
      success: true,
      data: workflow,
      timing: Date.now() - startTime
    };
  } catch (error) {
    console.error('❌ [E2E] 워크플로우 로딩 실패:', error);

    return {
      phase: 'load_workflow',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timing: Date.now() - startTime
    };
  }
};

// 🧪 MCP JSON → ReactFlow 변환 테스트
export const testMcpToReactFlowConversion = (workflow: any): E2ETestResult => {
  const startTime = Date.now();

  try {
    console.log('🧪 [E2E] MCP JSON → ReactFlow 변환 테스트 시작');

    const reactFlowData = convertWorkflowToReactFlow(workflow);

    // 변환 결과 검증
    const validation = {
      hasNodes: reactFlowData.nodes.length > 0,
      hasEdges: reactFlowData.edges.length > 0,
      nodeCount: reactFlowData.nodes.length,
      edgeCount: reactFlowData.edges.length,
      originalNodeCount: sampleWorkflowData.flow_structure.nodes.length,
      originalEdgeCount: sampleWorkflowData.flow_structure.edges.length,
      dataPreserved: (
        reactFlowData.nodes.length === sampleWorkflowData.flow_structure.nodes.length &&
        reactFlowData.edges.length === sampleWorkflowData.flow_structure.edges.length
      )
    };

    console.log('✅ [E2E] MCP JSON → ReactFlow 변환 성공:', validation);

    return {
      phase: 'mcp_to_reactflow',
      success: validation.dataPreserved,
      data: { reactFlowData, validation },
      timing: Date.now() - startTime
    };
  } catch (error) {
    console.error('❌ [E2E] MCP JSON → ReactFlow 변환 실패:', error);

    return {
      phase: 'mcp_to_reactflow',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timing: Date.now() - startTime
    };
  }
};

// 🚀 전체 E2E 테스트 실행
export const runEndToEndTest = async (userId: string): Promise<{
  success: boolean;
  results: E2ETestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    totalTime: number;
  };
}> => {
  console.log('🚀 [E2E] 클라이언트-서버 종합 테스트 시작');
  console.log('='.repeat(50));

  const results: E2ETestResult[] = [];
  const startTime = Date.now();

  try {
    // 1. 워크플로우 생성
    const createResult = await testCreateWorkflow(userId);
    results.push(createResult);

    if (!createResult.success) {
      throw new Error('워크플로우 생성 실패로 인한 테스트 중단');
    }

    const workflowId = createResult.data.id;

    // 2. MCP JSON 저장
    const saveResult = await testSaveMcpJson(workflowId);
    results.push(saveResult);

    // 3. 워크플로우 로딩 (MCP JSON 포함)
    const loadResult = await testLoadWorkflow(workflowId, userId);
    results.push(loadResult);

    // 4. MCP JSON → ReactFlow 변환
    if (loadResult.success && loadResult.data) {
      const conversionResult = testMcpToReactFlowConversion(loadResult.data);
      results.push(conversionResult);
    }

  } catch (error) {
    console.error('❌ [E2E] 테스트 중 오류 발생:', error);
  }

  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('='.repeat(50));
  console.log('🏁 [E2E] 테스트 완료');
  console.log(`📊 결과: ${passed}/${results.length} 통과, 총 소요시간: ${totalTime}ms`);

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.phase}: ${result.timing}ms ${result.error ? `(${result.error})` : ''}`);
  });

  return {
    success: failed === 0,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      totalTime
    }
  };
};

// 브라우저 콘솔에서 테스트 실행하기 위한 전역 함수 등록
if (typeof window !== 'undefined') {
  (window as any).runE2ETest = (userId: string) => runEndToEndTest(userId);
  console.log('💡 브라우저 콘솔에서 runE2ETest("user-id") 실행하여 종합 테스트할 수 있습니다.');
}
