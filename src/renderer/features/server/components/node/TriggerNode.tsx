import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useToast } from '@/renderer/hooks/use-toast';
import { dfsTraverse, FlowNode, FlowEdge } from './FlowDfsUtil';
import { executeWorkflow } from '../Flow/FlowEngine';
import { enhanceNodeData, enhanceWorkflowData } from '../Flow/NodeDataEnhancer';
import { makeSSRClient } from '@/renderer/supa-client';
import { saveWorkflowExecution, updateWorkflowExecution } from '../../workflow-queries';
import { useMCPConnectionStore } from '@/renderer/stores/mcpConnectionStore';

interface TriggerNodeProps {
  id: string;
  data: {
    label?: string;
    onTrigger?: () => void;
    onExtractJson?: (json: any) => void;
  };
  selected?: boolean;
}

export default function TriggerNode({ id, data, selected }: TriggerNodeProps) {
  const { getNodes, getEdges } = useReactFlow();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // 🔥 NEW: 실시간 MCP 연결 상태 관리
  const {
    startWorkflowProgress,
    updateWorkflowProgress,
    completeWorkflowProgress,
    addConnection,
    updateConnectionStatus,
    getActiveWorkflows,
    globalStats
  } = useMCPConnectionStore();

  const handleTrigger = async () => {
    setIsRunning(true);

    // 🔥 NEW: 워크플로우 진행 상황 추적 시작
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const nodes = getNodes();
    const edges = getEdges();

    // 서버 노드 수 계산
    const serverNodes = nodes.filter(node => node.type === 'server');
    const totalLevels = Math.max(1, Math.ceil(nodes.length / 3)); // 임시 레벨 계산

    // 워크플로우 진행 상황 시작
    startWorkflowProgress(executionId, {
      workflowName: data.label || 'Untitled Workflow',
      totalServers: serverNodes.length,
      connectedServers: 0,
      runningServers: 0,
      completedServers: 0,
      failedServers: 0,
      currentLevel: 0,
      totalLevels,
      startTime: new Date(),
      status: 'starting'
    });

    console.log('🚀 [TriggerNode] 워크플로우 시작:', {
      executionId,
      totalServers: serverNodes.length,
      totalNodes: nodes.length
    });

    // 서버 노드들을 MCP 연결 스토어에 등록
    serverNodes.forEach((node) => {
      const serverData = node.data?.mcp_servers;
      if (serverData) {
        addConnection({
          serverId: node.id,
          serverName: serverData.name || `Server ${node.id}`,
          clientType: 'claude-desktop', // 기본값
          status: 'connecting',
          retryCount: 0,
          maxRetries: 3,
          capabilities: ['mcp-standard']
        });
      }
    });

    console.log('🔍 [TriggerNode] 전체 노드 데이터:', nodes);
    console.log('🔍 [TriggerNode] 각 노드별 데이터 확인:');
    nodes.forEach((node, idx) => {
      console.log(`  노드 ${idx + 1} (${node.id}):`, {
        type: node.type,
        hasData: !!node.data,
        dataKeys: node.data ? Object.keys(node.data) : [],
        data: node.data
      });
    });
    console.log('🔍 [TriggerNode] 엣지:', edges);
    const triggerNode = (Array.isArray(nodes) ? nodes : []).find(
      (n) => n.id === id,
    );
    console.log('triggerNode:', triggerNode);
    const connectedEdges = (Array.isArray(edges) ? edges : []).filter(
      (e) => e.source === id,
    );
    console.log('connectedEdges:', connectedEdges);

    // 1. 트리거 활성화 로그
    const newLog = `🚀 [${new Date().toLocaleTimeString()}] Trigger ${id} activated`;
    setLogs((prevLogs) => [...prevLogs.slice(-4), newLog]);

    // 2. DFS로 연결된 노드 순서대로 추출 후 JSON 변환 (워크플로우 스타일)
    const safeNodes = Array.isArray(nodes) ? nodes : [];
    const safeEdges = Array.isArray(edges) ? edges : [];
    const orderedNodes = dfsTraverse(id, safeNodes, safeEdges);

    // 순서대로 노드 출력 디버깅 추가
    console.log('순서대로 정렬된 노드들:', orderedNodes);

    const json = orderedNodes.map((node) => {
      // NodeDataEnhancer를 사용하여 노드 데이터 강화
      const enhancedData = enhanceNodeData({
        id: node.id,
        type: node.type,
        data: node.data,
      });

      return {
        ...enhancedData,
        id: node.id,
        position: (node as any).position,
        type: node.type,
      };
    });


    // 3. 각 노드 방문 로그 (이모지 + 노드별 JSON)
    json.forEach((node, idx) => {
      const emoji = idx === 0 ? '🟢' : idx === json.length - 1 ? '🏁' : '➡️';
      const nodeLog = `${emoji} [${idx + 1}] ${node.type} (${node.id})`;
      setLogs((prevLogs) => [...prevLogs.slice(-4), nodeLog]);
    });

    // 4. 워크플로우 실행 (FlowEngine 사용)
    let executionRecord = null;
    const startTime = Date.now();

    // 🔥 NEW: 워크플로우 실행 상태로 변경
    updateWorkflowProgress(executionId, {
      status: 'running',
      runningServers: serverNodes.length
    });

    try {
      // 🔥 실행 기록 저장 (시작)
      try {
        const { client } = makeSSRClient();
        const userId = (window as any).zubridge?.getState?.()?.session?.profile_id;
        const workflowId = 1; // 임시로 1 사용 (실제로는 저장된 워크플로우 ID)

        if (userId) {
          executionRecord = await saveWorkflowExecution(client, {
            workflow_id: workflowId,
            user_id: userId,
            execution_id: executionId,
            status: 'running',
            nodes_executed: 0,
          });
          console.log('✅ [TriggerNode] 실행 기록 저장됨:', executionRecord);
        }
      } catch (dbError) {
        console.warn('⚠️ [TriggerNode] 실행 기록 저장 실패 (계속 진행):', dbError);
      }

      // 워크플로우 실행
      const executionResult = await executeWorkflow(id, nodes, edges);
      console.log('워크플로우 실행 결과:', executionResult);

      // 🔥 NEW: 실행 완료 후 상태 업데이트
      if (executionResult && executionResult.success) {
        // 성공한 서버 노드 수 계산
        const completedServers = serverNodes.length;
        updateWorkflowProgress(executionId, {
          completedServers,
          runningServers: 0,
          status: 'completed',
          estimatedEndTime: new Date()
        });

        // 각 서버 연결 상태를 성공으로 업데이트
        serverNodes.forEach(node => {
          updateConnectionStatus(node.id, 'connected');
        });

        completeWorkflowProgress(executionId, true);
      } else {
        // 실패 처리
        updateWorkflowProgress(executionId, {
          failedServers: serverNodes.length,
          runningServers: 0,
          status: 'failed'
        });

        serverNodes.forEach(node => {
          updateConnectionStatus(node.id, 'error', '워크플로우 실행 실패');
        });

        completeWorkflowProgress(executionId, false);
      }

      // executionResult가 없는 경우 기본값 설정
      if (!executionResult) {
        setLogs((prevLogs) => [...prevLogs.slice(-4), '❌ 워크플로우 실행 결과를 받지 못했습니다.']);

        // 🔥 NEW: 실패 상태 업데이트
        updateWorkflowProgress(executionId, {
          failedServers: serverNodes.length,
          runningServers: 0,
          status: 'failed'
        });
        completeWorkflowProgress(executionId, false);

        return;
      }

      // executionResult null/undefined 체크 추가
      if (!executionResult) {
        console.error('❌ [TriggerNode] executeWorkflow가 undefined를 반환했습니다');
        setLogs((prevLogs) => [...prevLogs.slice(-4), '❌ 워크플로우 실행 실패: 결과가 없습니다']);
        toast({
          title: '워크플로우 실행 실패',
          description: '워크플로우 엔진에서 결과를 반환하지 않았습니다',
          variant: 'error',
        });

        // 🔥 NEW: 실패 상태 업데이트
        updateWorkflowProgress(executionId, {
          failedServers: serverNodes.length,
          runningServers: 0,
          status: 'failed'
        });
        completeWorkflowProgress(executionId, false);

        throw new Error('워크플로우 실행 결과가 없습니다');
      }

      // finalData 전체를 순회하며 isLast와 message가 있는 객체를 찾는다
      if (executionResult.finalData) {
        Object.entries(executionResult.finalData).forEach(([k, v]) => {
          console.log('finalData key:', k, v);
        });

        const lastNode = Object.values(executionResult.finalData).find(
          (r: any) =>
            r &&
            typeof r === 'object' &&
            r.isLast === true &&
            typeof r.message === 'string' &&
            r.message.length > 0,
        );
        if (lastNode) {
          console.log('toast 호출!', lastNode);
          const msg = (lastNode as any).message as string;
          const isSuccess =
            msg.includes('성공') || msg.toLowerCase().includes('success');
          toast({
            title: isSuccess ? '워크플로우 성공' : '워크플로우 실패',
            description: msg,
            variant: isSuccess ? 'success' : 'error',
          });
        }
      }

      // 실행 결과도 로그에 추가
      const executionLog = `⚙️ 워크플로우 실행 결과: ${executionResult.success ? '성공' : '실패'}`;
      setLogs((prevLogs) => [...prevLogs.slice(-4), executionLog]);

      // 각 노드별 실행 결과도 로그에 추가
      if (executionResult.success && executionResult.results) {
        Object.entries(executionResult.results).forEach(([nodeId, result]) => {
          const resultLog = `🔹 노드 ${nodeId} 실행 결과: ${JSON.stringify(result)}`;
          setLogs((prevLogs) => [...prevLogs.slice(-4), resultLog]);
        });
      }

      // 🔥 실행 완료 기록 업데이트
      if (executionRecord) {
        try {
          const { client } = makeSSRClient();
          const endTime = Date.now();
          const duration = endTime - startTime;

          await updateWorkflowExecution(client, executionId, {
            status: executionResult.success ? 'completed' : 'failed',
            result_data: executionResult,
            duration_ms: duration,
            nodes_executed: nodes.length,
            nodes_failed: executionResult.success ? 0 : 1,
          });
          console.log('✅ [TriggerNode] 실행 완료 기록 업데이트됨');
        } catch (dbError) {
          console.warn('⚠️ [TriggerNode] 실행 완료 기록 업데이트 실패:', dbError);
        }
      }

    } catch (error) {
      console.error('워크플로우 실행 오류:', error);
      setLogs((prevLogs) => [...prevLogs.slice(-4), `❌ 오류: ${error}`]);

      // 🔥 실행 실패 기록 업데이트
      if (executionRecord) {
        try {
          const { client } = makeSSRClient();
          const endTime = Date.now();
          const duration = endTime - startTime;

          await updateWorkflowExecution(client, executionId, {
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            duration_ms: duration,
            nodes_executed: 0,
            nodes_failed: 1,
          });
          console.log('✅ [TriggerNode] 실행 실패 기록 업데이트됨');
        } catch (dbError) {
          console.warn('⚠️ [TriggerNode] 실행 실패 기록 업데이트 실패:', dbError);
        }
      }
    }

    // 5. 전체 결과 JSON 로그 (이모지 포함)
    // const resultLog = `📦 전체 결과: ${JSON.stringify(json, null, 2)}`;
    // setLogs((prevLogs) => [...prevLogs.slice(-4), resultLog]);

    // 결과 콜백
    // if (data.onExtractJson) {
    //   // 워크플로우 실행 결과와 함께 전달
    //   try {
    //     const executionResult = await executeWorkflow(id, nodes, edges);
    //     data.onExtractJson({
    //       nodes: json, // 원래 노드 구조
    //       workflow: executionResult // 실행 결과
    //     });
    //   } catch (error) {
    //     // 오류 발생 시 원래 구조만 전달
    //     data.onExtractJson(json);
    //   }
    // }

    // 콘솔 출력도 가능
    // console.log(JSON.stringify(json, null, 2));

    // 커스텀 콜백 실행
    if (data.onTrigger) {
      data.onTrigger();
    }

    // 1초 후 실행 완료 상태로 변경
    setTimeout(() => {
      setIsRunning(false);
      const completedLog = `✅ [${new Date().toLocaleTimeString()}] Trigger ${id} completed`;
      setLogs((prevLogs) => [...prevLogs.slice(-4), completedLog]);
      console.log(completedLog);
    }, 1000);
  };

  return (
    <div
      className={`p-4 bg-card border ${selected ? 'border-primary shadow-md ring-2 ring-primary/30' : 'border-border shadow'} rounded-lg flex flex-col max-w-[250px] transition-shadow duration-200`}
    >
      <div className="text-lg font-bold text-center mb-3">
        {data.label || 'START TRIGGER'}
      </div>
      <button
        className={`py-3 px-4 rounded-lg font-bold text-white ${
          isRunning
            ? 'bg-amber-500 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
        } transition-colors duration-200 flex items-center justify-center`}
        onClick={handleTrigger}
        disabled={isRunning}
      >
        {isRunning ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            PROCESSING...
          </>
        ) : (
          <>
            <svg
              className="h-6 w-6 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            PLAY
          </>
        )}
      </button>

      {/* 🔥 NEW: 실시간 상태 표시 */}
      {(globalStats.activeConnections > 0 || getActiveWorkflows().length > 0) && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
            🔗 실시간 연결 상태
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
            <div>활성 연결: {globalStats.activeConnections}/{globalStats.totalConnections}</div>
            <div>성공률: {globalStats.successRate.toFixed(1)}%</div>
            {getActiveWorkflows().length > 0 && (
              <div>실행 중인 워크플로우: {getActiveWorkflows().length}개</div>
            )}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-3 text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 max-h-[500px] overflow-y-auto">
          {logs.map((log, index) => (
            <div
              key={index}
              className="text-muted-foreground whitespace-pre-wrap"
            >
              {log}
            </div>
          ))}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}
