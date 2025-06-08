import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useToast } from '@/renderer/hooks/use-toast';
import { dfsTraverse, FlowNode, FlowEdge } from './FlowDfsUtil';
import { executeWorkflow } from '../Flow/FlowEngine';
import { enhanceNodeData, enhanceWorkflowData } from '../Flow/NodeDataEnhancer';
import { makeSSRClient } from '@/renderer/supa-client';
import { saveWorkflowExecution, updateWorkflowExecution } from '../../workflow-queries';

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

  const handleTrigger = async () => {
    setIsRunning(true);

    // 디버깅용 로그 추가
    console.log('TriggerNode handleTrigger 호출');

    // useReactFlow로 전체 노드/엣지 가져오기
    const nodes = getNodes();
    const edges = getEdges();

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

    // const json = orderedNodes.map((node) => {
    //   // NodeDataEnhancer를 사용하여 노드 데이터 강화
    //   const enhancedData = enhanceNodeData({
    //     id: node.id,
    //     type: node.type,
    //     data: node.data,
    //   });

    //   return {
    //     ...enhancedData,
    //     id: node.id,
    //     position: (node as any).position,
    //     type: node.type,
    //   };
    // });

    // // 로그 추가 - 메타데이터 확인
    // console.log('강화된 노드 JSON:', json);

    // 3. 각 노드 방문 로그 (이모지 + 노드별 JSON)
    // json.forEach((node, idx) => {
    //   const emoji = idx === 0 ? '🟢' : idx === json.length - 1 ? '🏁' : '➡️';
    //   const nodeLog = `${emoji} [${idx + 1}] ${node.type} (${node.id}): ${JSON.stringify(node, null, 2)}`;
    //   setLogs((prevLogs) => [...prevLogs.slice(-4), nodeLog]);
    //   console.log(`🟢🟢🟢노드 ${idx+1}: 🟢🟢🟢🟢🟢🟢🟢🟢🟢`, node); // 디버깅용 콘솔 로그 추가
    // });

    // 4. 워크플로우 실행 (FlowEngine 사용)
    let executionRecord = null;
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startTime = Date.now();
    
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
