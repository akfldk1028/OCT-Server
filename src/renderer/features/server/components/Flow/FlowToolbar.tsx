import React, { useState, useEffect, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/renderer/common/components/ui/button';
import { Input } from '@/renderer/common/components/ui/input';
import { useToast } from '@/renderer/hooks/use-toast';
import {
  Save,
  Upload,
  Download,
  Plus,
  Copy,
  FileText,
  Share2,
  Info,
  Zap,
  Settings2,
  Link2,
  ExternalLink
} from 'lucide-react';
import { useOutletContext } from 'react-router';
import type { ServerLayoutContext } from '../../types/server-types';
import { makeSSRClient } from '@/renderer/supa-client';
import {
  getUserInstalledServers,
  getMcpConfigsByServerId,
  getProductById
} from '../../../products/queries';
import { getClients } from '../../queries';
import { createWorkflow, updateWorkflow, getUserWorkflows, createWorkflowShare, updateWorkflowMcpJson, convertToMcpWorkflow, convertWorkflowToReactFlow } from '../../workflow-queries';
import { publishAsTemplate } from '../../template-queries';
import WorkflowListModal from './WorkflowListModal';
import { runAllTests } from '../../test-mcp-converter';
import { runEndToEndTest } from '../../test-end-to-end';

interface FlowToolbarProps {
  className?: string;
  onLoadWorkflow?: (workflowData: any) => void; // 🔥 워크플로우 로딩 콜백
}

export default function FlowToolbar({ className = '', onLoadWorkflow }: FlowToolbarProps) {
  const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow();
  const { toast } = useToast();
  const [workflowName, setWorkflowName] = useState('');
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // 🎯 템플릿 발행 모달 상태 제거됨 (모달 없이 바로 실행)

  // 🔥 Colab 스타일 워크플로우 상태 관리
  const [currentWorkflowId, setCurrentWorkflowId] = useState<number | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [originalWorkflowName, setOriginalWorkflowName] = useState('');

  // 🎯 템플릿 상태 추적
  const [isCurrentWorkflowTemplate, setIsCurrentWorkflowTemplate] = useState(false);
  const [checkingTemplateStatus, setCheckingTemplateStatus] = useState(false);

  // 서버/클라이언트 데이터 컨텍스트 가져오기
  const { servers, clients, userId } = useOutletContext<ServerLayoutContext>();

  // 🔥 변경 감지 (노드나 엣지가 변경될 때마다)
  useEffect(() => {
    if (currentWorkflowId && !isModified) {
      setIsModified(true);
    }
  }, [getNodes(), getEdges()]);

  // 🔥 워크플로우 이름 변경 감지
  useEffect(() => {
    if (currentWorkflowId && workflowName !== originalWorkflowName) {
      setIsModified(true);
    }
  }, [workflowName, originalWorkflowName, currentWorkflowId]);

  // 🎯 현재 워크플로우의 템플릿 상태 확인
  const checkCurrentWorkflowTemplateStatus = useCallback(async () => {
    if (!userId || !currentWorkflowId) {
      setIsCurrentWorkflowTemplate(false);
      return;
    }

    try {
      setCheckingTemplateStatus(true);
      const { client } = makeSSRClient();

      const { data: workflow, error } = await client
        .from('workflows')
        .select('id, name, status, is_template, is_public')
        .eq('id', currentWorkflowId)
        .eq('profile_id', userId)
        .single();

      if (error) {
        console.error('❌ [checkTemplateStatus] 확인 실패:', error);
        setIsCurrentWorkflowTemplate(false);
        return;
      }

      const isTemplate = workflow?.is_template && workflow?.status === 'shared';
      setIsCurrentWorkflowTemplate(isTemplate);

      console.log('🔍 [checkTemplateStatus] 현재 워크플로우 상태:', {
        id: workflow?.id,
        name: workflow?.name,
        status: workflow?.status,
        is_template: workflow?.is_template,
        is_public: workflow?.is_public,
        isTemplate
      });

    } catch (error) {
      console.error('❌ [checkTemplateStatus] 에러:', error);
      setIsCurrentWorkflowTemplate(false);
    } finally {
      setCheckingTemplateStatus(false);
    }
  }, [userId, currentWorkflowId]);

  // 🔥 currentWorkflowId가 변경될 때마다 템플릿 상태 확인
  useEffect(() => {
    checkCurrentWorkflowTemplateStatus();
  }, [checkCurrentWorkflowTemplateStatus]);

  // 노드 데이터에서 ID 참조 추출
  const getNodeDataRef = (node: any) => {
    switch (node.type) {
      case 'server':
        // 서버 노드의 경우 original_server_id나 id 저장
        return {
          type: 'server',
          serverId: node.data?.original_server_id || node.data?.id,
          userMcpUsageId: node.data?.id, // user_mcp_usage 테이블의 ID
        };
      case 'service':
      case 'client':
        // 클라이언트 노드의 경우 client_id 저장
        return {
          type: 'client',
          clientId: node.data?.config?.client_id || node.data?.id,
        };
      case 'trigger':
        // 트리거 노드는 설정만 저장
        return {
          type: 'trigger',
          label: node.data?.label || 'START TRIGGER',
        };
      default:
        return {
          type: node.type,
          data: node.data,
        };
    }
  };

  // ID 기반으로 실제 데이터 복원 (Supabase 쿼리 사용)
  const restoreNodeData = async (dataRef: any) => {
    try {
      const { client } = makeSSRClient();

      switch (dataRef.type) {
        case 'server':
          console.log('🔍 [restoreNodeData] 서버 복원 시작:', dataRef);

          try {
            // 🔥 1단계: userMcpUsageId가 있으면 사용자 설치 기록에서 찾기
            if (dataRef.userMcpUsageId && userId) {
              const userServers = await getUserInstalledServers(client, {
                profile_id: userId,
              });

              const userServer = userServers.find(server =>
                server.id === dataRef.userMcpUsageId
              );

              if (userServer) {
                // 설정도 함께 로드
                const configs = await getMcpConfigsByServerId(client, {
                  original_server_id: userServer.original_server_id
                });

                const serverWithConfigs = {
                  ...userServer,
                  mcp_configs: configs
                };

                console.log('✅ [restoreNodeData] 사용자 서버 복원:', serverWithConfigs);
                return serverWithConfigs;
              }
            }

            // 🔥 2단계: serverId로 원본 서버 정보 가져오기
            if (dataRef.serverId) {
              const serverInfo = await getProductById(client, {
                id: dataRef.serverId
              });

              const configs = await getMcpConfigsByServerId(client, {
                original_server_id: dataRef.serverId
              });

              const fallbackServer = {
                id: null,
                original_server_id: dataRef.serverId,
                mcp_servers: serverInfo,
                mcp_configs: configs,
                mcp_install_methods: null,
                isFromDB: true, // 🔥 DB에서 가져온 것 표시
              };

              console.log('✅ [restoreNodeData] DB 서버 복원:', fallbackServer);
              return fallbackServer;
            }

          } catch (dbError) {
            console.error('❌ [restoreNodeData] DB 조회 실패:', dbError);
          }

          // 🔥 3단계: 모든 방법 실패시 에러 객체 반환
          console.warn('⚠️ [restoreNodeData] 서버 복원 실패, 에러 객체 반환');
          return {
            id: dataRef.serverId,
            original_server_id: dataRef.serverId,
            mcp_servers: {
              name: '삭제된 서버',
              description: '이 서버는 더 이상 존재하지 않습니다.'
            },
            error: true
          };

        case 'client':
          console.log('🔍 [restoreNodeData] 클라이언트 복원 시작:', dataRef);

          try {
            // 🔥 Supabase에서 클라이언트 정보 가져오기
            const clientsData = await getClients(client, { limit: 1000 });
            const clientInfo = clientsData.find(c => c.client_id === dataRef.clientId);

            if (clientInfo) {
              console.log('✅ [restoreNodeData] 클라이언트 복원:', clientInfo);
              return { config: clientInfo };
            }
          } catch (dbError) {
            console.error('❌ [restoreNodeData] 클라이언트 DB 조회 실패:', dbError);
          }

          console.warn('⚠️ [restoreNodeData] 클라이언트 복원 실패');
          return {
            config: {
              client_id: dataRef.clientId,
              name: '삭제된 클라이언트',
              description: '이 클라이언트는 더 이상 존재하지 않습니다.',
              error: true
            }
          };

        case 'trigger':
          // 트리거 데이터는 단순 복원 (DB 조회 불필요)
          console.log('🔍 [restoreNodeData] 트리거 복원:', dataRef);
          return {
            label: dataRef.label,
          };

        default:
          console.warn('⚠️ [restoreNodeData] 알 수 없는 타입:', dataRef);
          return dataRef.data || {};
      }
    } catch (error) {
      console.error('❌ [restoreNodeData] 전체 복원 실패:', error);
      return { error: true, message: '데이터 복원 실패' };
    }
  };

  // 🔥 Colab 스타일 저장 함수들
  const saveAsNewWorkflow = async (name: string) => {
    const nodes = getNodes();
    const edges = getEdges();

    const workflowData = {
      name: name || `Workflow_${new Date().toISOString().slice(0, 19)}`,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      userId: userId,
      description: `워크플로우 - ${nodes.length}개 노드, ${edges.length}개 연결`,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        width: node.width,
        height: node.height,
        dataRef: getNodeDataRef(node),
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
        animated: edge.animated,
        style: edge.style,
        label: edge.label,
      }))
    };

    const dbResult = await saveWorkflowToDB(workflowData);

    // 새로 저장한 후 현재 워크플로우로 설정
    if (dbResult?.id) {
      setCurrentWorkflowId(dbResult.id);
      setOriginalWorkflowName(name);
      setWorkflowName(name);
      setIsModified(false);
    }

    return dbResult;
  };

  const updateExistingWorkflow = async () => {
    if (!currentWorkflowId) return null;

    const nodes = getNodes();
    const edges = getEdges();

    try {
      const { client } = makeSSRClient();

      // 기존 워크플로우 업데이트 (TODO: 실제 업데이트 쿼리 구현 필요)
      console.log('🔄 [updateExistingWorkflow] 기존 워크플로우 업데이트:', currentWorkflowId);

      // 임시로 새로 저장하는 방식 (나중에 실제 업데이트 로직으로 교체)
      const workflowData = {
        name: workflowName,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        userId: userId,
        description: `워크플로우 - ${nodes.length}개 노드, ${edges.length}개 연결 (업데이트됨)`,
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          width: node.width,
          height: node.height,
          dataRef: getNodeDataRef(node),
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: edge.type,
          animated: edge.animated,
          style: edge.style,
          label: edge.label,
        }))
      };

      const result = await saveWorkflowToDB(workflowData);

      // 수정 상태 초기화
      setIsModified(false);
      setOriginalWorkflowName(workflowName);

      return result;

    } catch (error) {
      console.error('❌ [updateExistingWorkflow] 업데이트 실패:', error);
      throw error;
    }
  };

  // DB에 워크플로우 저장 (중복 이름 확인 후 업데이트 또는 생성)
  // 🔍 DB 쿼리 테스트 함수
  const testDatabaseQuery = async () => {
    if (!userId) {
      toast({ title: "로그인 필요", description: "DB 테스트를 위해 로그인해주세요.", variant: "destructive" });
      return;
    }

    try {
      console.log('🔍 [testDatabaseQuery] DB 직접 쿼리 테스트 시작');
      const { client } = makeSSRClient();

      // 1. 모든 워크플로우 조회 (원시 쿼리)
      const { data: rawWorkflows, error: rawError } = await client
        .from('workflows')
        .select('*')
        .eq('profile_id', userId)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (rawError) {
        console.error('❌ Raw 쿼리 에러:', rawError);
        throw rawError;
      }

      console.log('📋 Raw 워크플로우 데이터:', rawWorkflows?.map(w => ({
        id: w.id,
        name: w.name,
        has_mcp_json: !!w.mcp_workflow_json,
        has_flow_structure: !!w.flow_structure,
        mcp_json_type: typeof w.mcp_workflow_json,
        flow_structure_type: typeof w.flow_structure,
        mcp_json_preview: w.mcp_workflow_json ? JSON.stringify(w.mcp_workflow_json).slice(0, 100) + '...' : null,
        flow_structure_preview: w.flow_structure ? JSON.stringify(w.flow_structure).slice(0, 100) + '...' : null
      })));

      // 2. getUserWorkflows 함수 테스트
      const workflowsFromFunction = await getUserWorkflows(client as any, {
        profile_id: userId,
        limit: 3
      });

      console.log('📋 Function 워크플로우 데이터:', workflowsFromFunction?.map(w => ({
        id: w.id,
        name: w.name,
        has_mcp_json: !!w.mcp_workflow_json,
        has_flow_structure: !!w.flow_structure
      })));

      toast({
        title: "✅ DB 테스트 완료",
        description: `${rawWorkflows?.length || 0}개 워크플로우 조회됨. 콘솔 확인하세요.`
      });

    } catch (error) {
      console.error('❌ [testDatabaseQuery] 실패:', error);
      toast({
        title: "❌ DB 테스트 실패",
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: "destructive"
      });
    }
  };

  const saveWorkflowToDB = async (workflowData: any) => {
    try {
      if (!userId) {
        console.warn('⚠️ [saveWorkflowToDB] userId 없음, DB 저장 스킵');
        return;
      }

      console.log('🔥 [saveWorkflowToDB] Supabase 저장 시작:', workflowData.name);

      const { client } = makeSSRClient();

      // 🔥 1. 같은 이름의 워크플로우가 이미 있는지 확인
      const { data: existingWorkflows, error: searchError } = await client
        .from('workflows')
        .select('id, name, created_at')
        .eq('profile_id', userId)
        .eq('name', workflowData.name);

      if (searchError) {
        console.error('❌ [saveWorkflowToDB] 기존 워크플로우 검색 실패:', searchError);
        throw searchError;
      }

      let workflowResult;
      const nodes = getNodes();
      const edges = getEdges();

      // ReactFlow 데이터를 MCP JSON으로 변환
      const mcpWorkflow = convertToMcpWorkflow(nodes, edges, {
        name: workflowData.name,
        description: workflowData.description
      });

      if (existingWorkflows && existingWorkflows.length > 0) {
        // 🔄 2-A. 기존 워크플로우 업데이트
        const existingWorkflow = existingWorkflows[0];
        console.log('🔄 [saveWorkflowToDB] 기존 워크플로우 업데이트:', existingWorkflow.id);

        workflowResult = await updateWorkflow(client as any, {
          workflow_id: existingWorkflow.id,
          profile_id: userId,
          data: {
            name: workflowData.name,
            description: workflowData.description,
            flow_structure: {
              nodes: workflowData.nodes,
              edges: workflowData.edges,
              metadata: {
                version: workflowData.version,
                updatedAt: new Date().toISOString()
              }
            }
          }
        });

        // MCP JSON도 업데이트
        await updateWorkflowMcpJson(client as any, {
          workflow_id: existingWorkflow.id,
          mcp_workflow_json: mcpWorkflow
        });

        console.log('✅ [saveWorkflowToDB] 기존 워크플로우 업데이트 완료:', {
          workflow_id: existingWorkflow.id,
          name: workflowData.name,
          action: 'UPDATED'
        });

      } else {
        // ➕ 2-B. 새로운 워크플로우 생성
        console.log('➕ [saveWorkflowToDB] 새로운 워크플로우 생성');

        workflowResult = await createWorkflow(client as any, {
          profile_id: userId,
          name: workflowData.name,
          description: workflowData.description,
          flow_structure: {
            nodes: workflowData.nodes,
            edges: workflowData.edges,
            metadata: {
              version: workflowData.version,
              createdAt: workflowData.createdAt
            }
          },
          status: 'draft' as any,
          is_public: false,
          is_template: false
        });

        if (!workflowResult?.id) {
          throw new Error('워크플로우 생성 실패');
        }

        // MCP JSON 저장
        await updateWorkflowMcpJson(client as any, {
          workflow_id: workflowResult.id,
          mcp_workflow_json: mcpWorkflow
        });

        console.log('✅ [saveWorkflowToDB] 새로운 워크플로우 생성 완료:', {
          workflow_id: workflowResult.id,
          name: workflowData.name,
          action: 'CREATED'
        });
      }

      console.log('🎉 [saveWorkflowToDB] Supabase 저장 완료!', {
        workflowId: workflowResult.id,
        name: workflowData.name,
        nodes: nodes.length,
        edges: edges.length,
        mcp_version: mcpWorkflow.mcp_version
      });

      return workflowResult;

    } catch (error) {
      console.error('❌ [saveWorkflowToDB] Supabase 저장 실패:', error);
      throw error;
    }
  };

  // 워크플로우를 ID 기반으로 저장 (실제 데이터는 제외)
  // 🔥 Colab 스타일 저장 처리 (기존 vs 새로운)
  const handleSaveWorkflow = async () => {
    try {
      if (currentWorkflowId && !isModified) {
        // 변경사항이 없으면 저장하지 않음
        toast({
          title: '저장할 변경사항 없음',
          description: '현재 워크플로우에 변경사항이 없습니다.',
          variant: 'default',
        });
        return;
      }

      if (currentWorkflowId) {
        // 기존 워크플로우 업데이트
        const result = await updateExistingWorkflow();

        toast({
          title: '워크플로우 업데이트 완료! 🔄',
          description: `${workflowName} 기존 워크플로우가 업데이트되었습니다.`,
          variant: 'success',
        });

        console.log('🔄 [FlowToolbar] 워크플로우 업데이트됨:', result);
      } else {
        // 새 워크플로우로 저장 (이름 입력 필요)
        if (!workflowName.trim()) {
          toast({
            title: '워크플로우 이름 필요',
            description: '새 워크플로우는 이름이 필요합니다.',
            variant: 'default',
          });
          return;
        }

        // 🔥 NEW: 중복 이름 체크 후 저장/업데이트 결정
        const result = await saveWorkflowToDB({
          name: workflowName,
          description: `워크플로우 - ${new Date().toLocaleString()}`,
          nodes: getNodes(),
          edges: getEdges(),
          version: '1.0.0',
          createdAt: new Date().toISOString()
        });

        // 결과에 따라 메시지 변경
        const action = result.created_at === result.updated_at ? 'CREATED' : 'UPDATED';

        toast({
          title: action === 'CREATED' ? '새 워크플로우 저장 완료! 🎉' : '워크플로우 업데이트 완료! 🔄',
          description: action === 'CREATED'
            ? `${workflowName} 새로운 워크플로우로 저장되었습니다.`
            : `${workflowName} 기존 워크플로우가 업데이트되었습니다.`,
          variant: 'success',
        });

        // 현재 워크플로우 상태 업데이트
        setCurrentWorkflowId(result.id);
        setOriginalWorkflowName(workflowName);
        setIsModified(false);

        console.log(`📝 [FlowToolbar] 워크플로우 ${action}:`, result);
      }

    } catch (error) {
      console.error('❌ [FlowToolbar] 저장 실패:', error);
      toast({
        title: '저장 실패',
        description: '워크플로우 저장 중 오류가 발생했습니다.',
        variant: 'error',
      });
    }
  };

  // 🎯 템플릿으로 발행하기 (모달 없이 바로 실행)
  const handlePublishAsTemplate = async () => {
    if (!userId) {
      toast({ title: "로그인 필요", description: "템플릿 발행을 위해 로그인해주세요.", variant: "destructive" });
      return;
    }

    const nodes = getNodes();
    const edges = getEdges();

    if (nodes.length === 0) {
      toast({ title: "워크플로우 없음", description: "발행할 워크플로우가 없습니다.", variant: "destructive" });
      return;
    }

    try {
      const { client } = makeSSRClient();

      // 🔥 모달 없이 바로 최신 워크플로우를 템플릿으로 변경
      const { data: latestWorkflow } = await client
        .from('workflows')
        .select('id, name')
        .eq('profile_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!latestWorkflow) {
        throw new Error('워크플로우가 없습니다');
      }

      // 바로 템플릿 상태로 변경
      await client
        .from('workflows')
        .update({
          status: 'shared',
          is_template: true,
          is_public: true
        })
        .eq('id', latestWorkflow.id);

      console.log('🎯 [바로 템플릿 발행] 완료:', latestWorkflow.id);

      toast({
        title: "🎉 템플릿 발행 완료!",
        description: `"${latestWorkflow.name}"가 템플릿으로 발행되었습니다`,
        variant: 'default'
      });

      // 상태 즉시 업데이트
      setIsCurrentWorkflowTemplate(true);

      // 상태 재확인 (더블체크)
      await checkCurrentWorkflowTemplateStatus();

    } catch (e: any) {
      console.error('템플릿 발행 에러:', e);
      toast({
        title: "❌ 발행 실패",
        description: e.message,
        variant: 'destructive'
      });
    }
  };

  // 🎯 템플릿 발행 취소
  const handleCancelTemplatePublish = async () => {
    if (!userId || !currentWorkflowId) {
      toast({ title: "❌ 오류", description: "로그인 후 사용해주세요.", variant: 'destructive' });
      return;
    }

    try {
      const { client } = makeSSRClient();

      console.log('🔄 [템플릿 발행 취소] 시작:', currentWorkflowId);

      // 템플릿 상태 해제
      const { data, error } = await client
        .from('workflows')
        .update({
          status: 'draft',
          is_template: false,
          is_public: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentWorkflowId)
        .eq('profile_id', userId)
        .select('id, name, status, is_template, is_public')
        .single();

      if (error) throw error;

      console.log('✅ [템플릿 발행 취소] 완료:', data);

      // 상태 즉시 업데이트
      setIsCurrentWorkflowTemplate(false);

      // 상태 재확인 (더블체크)
      await checkCurrentWorkflowTemplateStatus();

      toast({
        title: "🔄 템플릿 발행 취소됨",
        description: `"${data.name}"가 일반 워크플로우로 변경되었습니다`,
        variant: 'default'
      });
    } catch (e: any) {
      console.error('템플릿 발행 취소 에러:', e);
      toast({
        title: "❌ 취소 실패",
        description: e.message,
        variant: 'destructive'
      });
    }
  };

  // 🔥 다른 이름으로 저장 (항상 새 워크플로우 생성)
  const handleSaveAsNewWorkflow = async () => {
    try {
      const newName = workflowName ? `${workflowName}_복사본` : `Workflow_${new Date().toISOString().slice(0, 19)}`;

      const result = await saveAsNewWorkflow(newName);

      toast({
        title: '다른 이름으로 저장 완료! 📑',
        description: `${newName} 새로운 복사본이 생성되었습니다.`,
        variant: 'success',
      });

      console.log('📑 [FlowToolbar] 다른 이름으로 저장됨:', result);

    } catch (error) {
      console.error('❌ [FlowToolbar] 다른 이름으로 저장 실패:', error);
      toast({
        title: '저장 실패',
        description: '다른 이름으로 저장 중 오류가 발생했습니다.',
        variant: 'error',
      });
    }
  };

  // 🔥 새 워크플로우 시작
  const handleNewWorkflow = () => {
    if (isModified && currentWorkflowId) {
      // 변경사항이 있으면 확인
      const confirm = window.confirm('현재 워크플로우에 저장되지 않은 변경사항이 있습니다. 새 워크플로우를 시작하시겠습니까?');
      if (!confirm) return;
    }

    // 모든 상태 초기화
    setNodes([]);
    setEdges([]);
    setWorkflowName('');
    setCurrentWorkflowId(null);
    setOriginalWorkflowName('');
    setIsModified(false);

    toast({
      title: '새 워크플로우 시작! 🆕',
      description: '새로운 워크플로우를 시작합니다.',
      variant: 'default',
    });

    console.log('🆕 [FlowToolbar] 새 워크플로우 시작');
  };

  // 🔥 JSON 파일 로드 기능 (주석처리 - Supabase 우선)
  /*
  // JSON 파일에서 워크플로우 로드 (ID 기반으로 데이터 파싱)
  const handleLoadWorkflow = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const workflowData = JSON.parse(jsonContent);

        // 데이터 유효성 검사
        if (!workflowData.nodes || !workflowData.edges) {
          throw new Error('잘못된 워크플로우 파일 형식입니다.');
        }

        console.log('📂 [FlowToolbar] JSON 로드됨:', workflowData);

        // 🔥 ID 기반으로 실제 데이터를 Supabase에서 파싱
        const restoredNodes = await Promise.all(
          workflowData.nodes.map(async (nodeSchema: any) => {
            const restoredData = await restoreNodeData(nodeSchema.dataRef);
            return {
              id: nodeSchema.id,
              type: nodeSchema.type,
              position: nodeSchema.position,
              data: restoredData,
              width: nodeSchema.width,
              height: nodeSchema.height,
            };
          })
        );

        // React Flow에 복원된 데이터 로드
        setNodes(restoredNodes);
        setEdges(workflowData.edges);

        // 이름 설정
        setWorkflowName(workflowData.name || '');

        // 뷰 맞춤
        setTimeout(() => {
          fitView({ padding: 0.1 });
        }, 100);

        toast({
          title: '워크플로우 로드 완료! 📂',
          description: `${workflowData.name} (${restoredNodes.length}개 노드 복원)`,
          variant: 'success',
        });

        console.log('✅ [FlowToolbar] 복원된 노드들:', restoredNodes);

      } catch (error) {
        console.error('❌ [FlowToolbar] 로드 실패:', error);
        toast({
          title: '로드 실패',
          description: '파일을 읽는 중 오류가 발생했습니다.',
          variant: 'error',
        });
      }
    };

    reader.readAsText(file);
    // 같은 파일을 다시 선택할 수 있도록 value 초기화
    event.target.value = '';
  };
  */

  // 🔥 Supabase에서 워크플로우를 불러와서 ReactFlow에 로드 (새로운 MCP JSON 방식)
  const handleLoadWorkflowFromDB = useCallback(async (workflowData: any) => {
    try {
      console.log('🔥 [FlowToolbar] MCP JSON 워크플로우 로드 시작:', workflowData);

      // 1. MCP JSON 또는 레거시 구조를 ReactFlow 형식으로 변환
      const reactFlowData = convertWorkflowToReactFlow(workflowData);

      // 2. 워크플로우 이름 설정
      if (workflowData.name) {
        setWorkflowName(workflowData.name);
      }

      // 3. FlowToolbar 내부 상태 업데이트
      setNodes(reactFlowData.nodes || []);
      setEdges(reactFlowData.edges || []);

      // 4. 외부 콜백 호출 (node-page.tsx의 handleLoadWorkflow)
      if (onLoadWorkflow) {
        onLoadWorkflow({
          ...workflowData,
          nodes: reactFlowData.nodes,
          edges: reactFlowData.edges
        });
      }

      // 5. 현재 워크플로우 상태 설정 (기존 워크플로우로 인식)
      setCurrentWorkflowId(workflowData.id);
      setOriginalWorkflowName(workflowData.name || '');
      setIsModified(false);

      // 6. 화면에 맞게 조정
      setTimeout(() => {
        fitView();
      }, 100);

      console.log('🎉 [FlowToolbar] MCP JSON 워크플로우 로드 완료:', {
        id: workflowData.id,
        name: workflowData.name,
        nodes: reactFlowData.nodes?.length || 0,
        edges: reactFlowData.edges?.length || 0,
        has_mcp_json: !!workflowData.mcp_workflow_json
      });

      toast({
        title: "워크플로우 로딩 완료",
        description: `"${workflowData.name}" - ${reactFlowData.nodes?.length || 0}개 노드, ${reactFlowData.edges?.length || 0}개 연결`,
        variant: 'default',
      });

    } catch (error) {
      console.error('❌ [FlowToolbar] MCP JSON 워크플로우 로드 실패:', error);
      toast({
        title: "워크플로우 로딩 실패",
        description: "워크플로우를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      throw error;
    }
  }, [setNodes, setEdges, fitView, onLoadWorkflow, toast]);

  // Supabase에서 사용자 워크플로우 목록 보기 (모달 열기)
  const handleShowSavedWorkflows = async () => {
    if (!userId) {
      toast({
        title: '로그인 필요',
        description: '워크플로우 목록을 보려면 먼저 로그인해주세요.',
        variant: 'default',
      });
      return;
    }

    setShowWorkflowModal(true);
  };

  // 현재 워크플로우 정보 출력
  const handleShowCurrentFlow = () => {
    const nodes = getNodes();
    const edges = getEdges();

    console.log('🔍 [FlowToolbar] 현재 워크플로우 정보:');
    console.log('📊 노드들:', nodes);
    console.log('🔗 엣지들:', edges);

    toast({
      title: '워크플로우 정보',
      description: `현재 ${nodes.length}개 노드, ${edges.length}개 연결 (콘솔 확인)`,
      variant: 'default',
    });
  };

  // 🔥 워크플로우 공유 링크 생성 및 복사
  const handleShareWorkflow = async () => {
    try {
      if (!userId) {
        toast({
          title: '로그인이 필요합니다',
          description: '워크플로우를 공유하려면 먼저 로그인해주세요.',
          variant: 'destructive',
        });
        return;
      }

      const nodes = getNodes();
      const edges = getEdges();

      if (nodes.length === 0) {
        toast({
          title: '공유할 워크플로우가 없습니다',
          description: '노드를 추가한 후 공유해주세요.',
          variant: 'destructive',
        });
        return;
      }

      // 1. 먼저 워크플로우 저장 (저장되지 않은 경우)
      let workflowId = currentWorkflowId;

      if (!workflowId || isModified) {
        if (!workflowName.trim()) {
          const autoName = `공유_워크플로우_${new Date().toISOString().slice(0, 19)}`;
          setWorkflowName(autoName);
        }

        const savedWorkflow = await saveWorkflowToDB({
          name: workflowName || `공유_워크플로우_${new Date().toISOString().slice(0, 19)}`,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          userId: userId,
          description: `공유된 워크플로우 - ${nodes.length}개 노드, ${edges.length}개 연결`,
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            dataRef: getNodeDataRef(node)
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: edge.type,
            animated: edge.animated,
            style: edge.style,
            label: edge.label
          }))
        });

        if (!savedWorkflow?.id) {
          throw new Error('워크플로우 저장 실패');
        }

        workflowId = savedWorkflow.id;
        setCurrentWorkflowId(workflowId);
        setIsModified(false);
      }

      // 2. 공유 링크 생성
      const { client } = makeSSRClient();
      const shareToken = `share_${workflowId}_${Date.now()}`;

      const shareResult = await createWorkflowShare(client as any, {
        workflow_id: workflowId,
        shared_by_user_id: userId,
        share_type: 'link',
        share_title: workflowName || `워크플로우 ${workflowId}`,
        share_description: `${nodes.length}개 노드, ${edges.length}개 연결로 구성된 워크플로우`,
        share_token: shareToken,
        can_view: true,
        can_copy: true,
        can_edit: false,
      });

      // 3. 공유 URL 생성 및 클립보드 복사 (환경별 처리)
      // 일렉트론(HashRouter) vs 웹(BrowserRouter) 환경 감지
      const isElectron = window.location.protocol === 'file:' || window.location.hostname === 'localhost';
      const baseUrl = isElectron
        ? `${window.location.origin}/#`
        : window.location.origin;
      const shareUrl = `${baseUrl}/workflow/share/${shareToken}`;

      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: '공유 링크 복사 완료! 📋',
        description: `링크가 클립보드에 복사되었습니다. 다른 사람과 공유해보세요!`,
      });

      console.log('🔗 공유 링크 생성:', shareUrl);

    } catch (error) {
      console.error('워크플로우 공유 실패:', error);

      // 클립보드 접근 실패시 대체 방법
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast({
          title: '클립보드 접근 권한이 필요합니다',
          description: '브라우저 설정에서 클립보드 접근을 허용해주세요.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '공유 실패',
          description: '워크플로우 공유 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    }
  };

  const currentNodeCount = getNodes().length;
  const currentEdgeCount = getEdges().length;

  return (
    <div className={`w-full bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-md border-b border-border/50 shadow-sm ${className}`}>
      <div className="flex items-center justify-between h-16 px-6">
        {/* 왼쪽: 워크플로우 정보 & 액션 */}
        <div className="flex items-center gap-4">
          {/* 워크플로우 이름 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">워크플로우</span>
            </div>

            <div className="relative">
              <Input
                type="text"
                placeholder="워크플로우 이름을 입력하세요"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className={`min-w-[280px] h-9 bg-background/50 border-border/30 focus:border-primary/50 transition-all ${
                  currentWorkflowId ? 'ring-1 ring-primary/20' : ''
                }`}
              />
              {currentWorkflowId && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
              {isModified && (
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              )}
            </div>

            {/* 상태 표시 */}
            <div className="flex items-center gap-2">
              {currentWorkflowId && (
                <div className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full border border-primary/20">
                  #{currentWorkflowId}
                </div>
              )}
              {isModified && (
                <div className="px-2 py-1 text-xs bg-orange-500/10 text-orange-600 rounded-full border border-orange-500/20">
                  수정됨
                </div>
              )}
            </div>
          </div>

          {/* 구분선 */}
          <div className="h-8 w-px bg-border/30" />

          {/* 주요 액션 버튼들 */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveWorkflow}
              size="sm"
              disabled={!userId}
              className={`h-9 px-4 gap-2 transition-all ${
                !userId
                  ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                  : isModified
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
              title={!userId ? "로그인 후 사용 가능합니다" : "워크플로우 저장"}
            >
              <Save className="h-4 w-4" />
              저장
            </Button>

            <Button
              onClick={handleSaveAsNewWorkflow}
              size="sm"
              variant="outline"
              className="h-9 px-4 gap-2 hover:bg-accent"
            >
              <Copy className="h-4 w-4" />
              복사본
            </Button>

            <Button
              onClick={handleNewWorkflow}
              size="sm"
              variant="outline"
              className="h-9 px-4 gap-2 hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              새로 만들기
            </Button>

            <Button
              onClick={handleShowSavedWorkflows}
              size="sm"
              variant="outline"
              disabled={!userId}
              className={`h-9 px-4 gap-2 ${userId ? 'hover:bg-accent' : 'opacity-50 cursor-not-allowed'}`}
              title={!userId ? "로그인 후 사용 가능합니다" : "저장된 워크플로우 불러오기"}
            >
              <Upload className="h-4 w-4" />
              불러오기
            </Button>

            {/* 🎯 템플릿 발행/취소 버튼 (동적) */}
            <Button
              onClick={isCurrentWorkflowTemplate ? handleCancelTemplatePublish : handlePublishAsTemplate}
              size="sm"
              variant="outline"
              disabled={!userId || getNodes().length === 0 || checkingTemplateStatus}
              className={`h-9 px-4 gap-2 transition-all ${
                isCurrentWorkflowTemplate
                  ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 hover:from-red-100 hover:to-orange-100 text-red-700 hover:text-red-800'
                  : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 text-purple-700 hover:text-purple-800'
              } ${
                !userId || getNodes().length === 0 || checkingTemplateStatus ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={
                !userId
                  ? "로그인 후 사용 가능합니다"
                  : getNodes().length === 0
                    ? "워크플로우를 먼저 만들어주세요"
                    : checkingTemplateStatus
                      ? "템플릿 상태 확인 중..."
                      : isCurrentWorkflowTemplate
                        ? "템플릿 발행을 취소하고 일반 워크플로우로 변경"
                        : "워크플로우를 템플릿으로 마켓플레이스에 공개"
              }
            >
              {isCurrentWorkflowTemplate ? (
                <>
                  <Share2 className="h-4 w-4" />
                  🔄 템플릿 취소
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  🎯 템플릿 발행
                </>
              )}
            </Button>

            {/* 🚀 직접 템플릿 변환 버튼 (간단한 방법) */}
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!userId || !currentWorkflowId) {
                  toast({
                    title: "❌ 오류",
                    description: "워크플로우를 먼저 저장해주세요",
                    variant: 'destructive'
                  });
                  return;
                }

                try {
                  console.log('🚀 [직접 템플릿 변환] 시작:', currentWorkflowId);
                  const { client } = makeSSRClient();

                  // 🔥 현재 워크플로우를 바로 템플릿으로 변환
                  const { data, error } = await client
                    .from('workflows')
                    .update({
                      status: 'shared',
                      is_template: true,
                      is_public: true,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', currentWorkflowId)
                    .select('id, name, status, is_template, is_public')
                    .single();

                  console.log('🔧 [직접 템플릿 변환] DB 업데이트 결과:', { data, error });

                  if (error) throw error;

                  // workflow_shares에도 추가 (이미 있으면 무시)
                  const { error: shareError } = await client
                    .from('workflow_shares')
                    .upsert({
                      workflow_id: currentWorkflowId,
                      shared_by_user_id: userId,
                      share_type: 'template',
                      share_title: data.name,
                      share_description: '직접 변환된 템플릿',
                      is_active: true,
                      download_count: 0
                    }, {
                      onConflict: 'workflow_id,shared_by_user_id'
                    });

                  console.log('📤 [직접 템플릿 변환] 공유 정보:', { shareError });

                  toast({
                    title: "✅ 템플릿 변환 완료!",
                    description: `워크플로우가 템플릿으로 변환되었습니다! Status: ${data.status}`,
                    variant: 'default'
                  });
                } catch (e: any) {
                  console.error('❌ [직접 템플릿 변환] 실패:', e);
                  toast({
                    title: "❌ 변환 실패",
                    description: e.message || '알 수 없는 오류',
                    variant: 'destructive'
                  });
                }
              }}
              disabled={!userId || !currentWorkflowId}
              className={`h-9 px-4 gap-2 bg-green-50 border-green-200 hover:bg-green-100 ${
                !userId || !currentWorkflowId ? 'opacity-50 cursor-not-allowed' : 'text-green-700 hover:text-green-800'
              }`}
              title={
                !userId
                  ? "로그인 후 사용 가능합니다"
                  : !currentWorkflowId
                    ? "워크플로우를 먼저 저장해주세요"
                    : "현재 워크플로우를 바로 템플릿으로 변환"
              }
            >
              <Zap className="h-4 w-4" />
              🚀 직접변환
            </Button>

            {/* 🧪 개발용 테스트 버튼들 (나중에 제거 예정) */}
            <Button
              onClick={() => {
                console.log('🧪 MCP JSON 변환 테스트 실행 중...');
                const testResult = runAllTests();
                if (testResult.isValid) {
                  toast({ title: "✅ 변환 테스트 성공", description: "MCP JSON 변환이 성공적으로 완료되었습니다." });
                } else {
                  toast({ title: "❌ 변환 테스트 실패", description: "MCP JSON 변환에 문제가 있습니다.", variant: "destructive" });
                }
              }}
              size="sm"
              variant="secondary"
              className="h-9 px-3 gap-1 bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300"
            >
              🧪 변환
            </Button>

            <Button
              onClick={testDatabaseQuery}
              size="sm"
              variant="secondary"
              className="h-9 px-3 gap-1 bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
            >
            🔍 DB
          </Button>

          {/* 🔍 DB 상태 확인 버튼 */}
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!userId) {
                toast({ title: "오류", description: "로그인해주세요" });
                return;
              }

              try {
                const { client } = makeSSRClient();

                // 모든 워크플로우 상태 확인
                const { data: allWorkflows, error } = await client
                  .from('workflows')
                  .select('id, name, status, is_template, is_public, created_at')
                  .eq('profile_id', userId)
                  .order('updated_at', { ascending: false })
                  .limit(10);

                console.log('🔍 [DB 상태 확인] 사용자 워크플로우들:', allWorkflows);
                console.log('🔍 [현재 UI 상태]:', {
                  currentWorkflowId,
                  isCurrentWorkflowTemplate,
                  checkingTemplateStatus
                });

                if (error) throw error;

                // 현재 워크플로우 특별 확인
                if (currentWorkflowId) {
                  const currentWorkflow = allWorkflows?.find(w => w.id === currentWorkflowId);
                  console.log('🎯 [현재 워크플로우] 상태:', currentWorkflow);
                  console.log('🎯 [상태 불일치 확인]:', {
                    'DB에서 is_template': currentWorkflow?.is_template,
                    'DB에서 status': currentWorkflow?.status,
                    'UI에서 isCurrentWorkflowTemplate': isCurrentWorkflowTemplate,
                    '실제 템플릿 여부': currentWorkflow?.is_template && currentWorkflow?.status === 'shared'
                  });
                }

                const sharedCount = allWorkflows?.filter(w => w.status === 'shared').length || 0;
                const templateCount = allWorkflows?.filter(w => w.is_template).length || 0;

                // 강제로 상태 재확인
                await checkCurrentWorkflowTemplateStatus();

                toast({
                  title: "🔍 DB 상태 확인 완료",
                  description: `총 ${allWorkflows?.length || 0}개 워크플로우 (shared: ${sharedCount}, 템플릿: ${templateCount})`,
                  variant: 'default'
                });
              } catch (e: any) {
                console.error('DB 상태 확인 에러:', e);
                toast({
                  title: "❌ 확인 실패",
                  description: e.message
                });
              }
            }}
          >
            🔍 상태확인
          </Button>

          {/* 🔧 Status 강제 업데이트 테스트 버튼 */}
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!userId) {
                toast({ title: "오류", description: "로그인해주세요" });
                return;
              }

              try {
                const { client } = makeSSRClient();

                // 현재 워크플로우가 있으면 그걸 업데이트, 없으면 최신 워크플로우 찾아서 업데이트
                let targetWorkflowId = currentWorkflowId;

                if (!targetWorkflowId) {
                  const { data: latestWorkflow } = await client
                    .from('workflows')
                    .select('id, name')
                    .eq('profile_id', userId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();

                  targetWorkflowId = latestWorkflow?.id;
                }

                if (!targetWorkflowId) {
                  throw new Error('업데이트할 워크플로우가 없습니다');
                }

                console.log('🔧 [강제 업데이트] 대상 워크플로우:', targetWorkflowId);

                const { data, error } = await client
                  .from('workflows')
                  .update({
                    status: 'shared',
                    is_template: true,
                    is_public: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', targetWorkflowId)
                  .select('id, name, status, is_template, is_public')
                  .single();

                console.log('🔧 [강제 status 업데이트] 결과:', { data, error });

                if (error) throw error;

                toast({
                  title: "✅ 강제 업데이트 성공!",
                  description: `워크플로우 "${data.name}" → Status: ${data.status}, 템플릿: ${data.is_template}`,
                  variant: 'default'
                });
              } catch (e: any) {
                console.error('강제 업데이트 에러:', e);
                toast({
                  title: "❌ 업데이트 실패",
                  description: e.message
                });
              }
            }}
          >
            🔧 강제업데이트
          </Button>

          {/* 🎯 SHARED 즉시 변경 버튼 (가장 간단) */}
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!userId) {
                toast({ title: "오류", description: "로그인해주세요" });
                return;
              }

              try {
                const { client } = makeSSRClient();

                // 최신 워크플로우 찾기
                const { data: latestWorkflow } = await client
                  .from('workflows')
                  .select('id, name')
                  .eq('profile_id', userId)
                  .order('updated_at', { ascending: false })
                  .limit(1)
                  .single();

                if (!latestWorkflow) {
                  throw new Error('워크플로우가 없습니다');
                }

                // 바로 SHARED로 변경
                await client
                  .from('workflows')
                  .update({ status: 'shared' })
                  .eq('id', latestWorkflow.id);

                console.log('🎯 [SHARED 즉시변경] 완료:', latestWorkflow.id);

                toast({
                  title: "✅ SHARED 변경 완료!",
                  description: `워크플로우 "${latestWorkflow.name}"가 SHARED 상태로 변경되었습니다`,
                  variant: 'default'
                });
              } catch (e: any) {
                console.error('SHARED 변경 에러:', e);
                toast({
                  title: "❌ 변경 실패",
                  description: e.message
                });
              }
            }}
            className="h-9 px-3 gap-1 bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-yellow-800"
          >
            🎯 SHARED
          </Button>

            <Button
              onClick={async () => {
                console.log('🚀 E2E 테스트 실행 중...');
                try {
                  // ServerLayoutContext에서 userId 가져오기
                  const testUserId = userId || 'test-user-id';
                  const e2eResult = await runEndToEndTest(testUserId);
                  if (e2eResult.success) {
                    toast({
                      title: "✅ E2E 테스트 성공",
                      description: `${e2eResult.summary.passed}/${e2eResult.summary.total} 테스트 통과`
                    });
                  } else {
                    toast({
                      title: "❌ E2E 테스트 실패",
                      description: `${e2eResult.summary.failed}/${e2eResult.summary.total} 테스트 실패`,
                      variant: "destructive"
                    });
                  }
                } catch (error) {
                  console.error('E2E 테스트 오류:', error);
                  toast({ title: "❌ E2E 테스트 오류", description: "테스트 실행 중 오류가 발생했습니다.", variant: "destructive" });
                }
              }}
              size="sm"
              variant="secondary"
              className="h-9 px-3 gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
            >
              🚀 E2E
            </Button>
          </div>
        </div>

        {/* 오른쪽: 통계 & 기타 */}
        <div className="flex items-center gap-4">
          {/* 워크플로우 통계 */}
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 rounded-lg border border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span className="text-sm text-muted-foreground">노드</span>
              <span className="text-sm font-semibold text-foreground">{currentNodeCount}</span>
            </div>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm text-muted-foreground">연결</span>
              <span className="text-sm font-semibold text-foreground">{currentEdgeCount}</span>
            </div>

            {/* 🎯 템플릿 상태 표시 */}
            {currentWorkflowId && (
              <>
                <div className="h-4 w-px bg-border/50" />
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isCurrentWorkflowTemplate ? 'bg-purple-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm text-muted-foreground">상태</span>
                  <span className={`text-sm font-semibold ${
                    isCurrentWorkflowTemplate ? 'text-purple-700' : 'text-foreground'
                  }`}>
                    {checkingTemplateStatus ? '확인중...' : isCurrentWorkflowTemplate ? '템플릿' : '일반'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 추가 액션 */}
          <div className="flex items-center gap-1">
            <Button
              onClick={handleShareWorkflow}
              size="sm"
              variant="outline"
              className="h-9 px-3 gap-2 hover:bg-accent text-primary border-primary/20 hover:border-primary/40"
              title="워크플로우 공유 링크 생성"
            >
              <Link2 className="h-4 w-4" />
              <span className="text-sm font-medium">공유</span>
            </Button>

            <Button
              onClick={() => {
                console.log('현재 워크플로우:', { nodes: getNodes(), edges: getEdges() });
                toast({
                  title: '워크플로우 정보',
                  description: `${currentNodeCount}개 노드, ${currentEdgeCount}개 연결 (콘솔 확인)`,
                });
              }}
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0 hover:bg-accent"
              title="디버그 정보"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 워크플로우 목록 모달 */}
      <WorkflowListModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onLoadWorkflow={handleLoadWorkflowFromDB}
        userId={userId}
      />

      {/* 🎯 템플릿 발행 모달 제거됨 - 이제 바로 실행 */}
    </div>
  );
}
