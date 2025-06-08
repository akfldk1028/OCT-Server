import React, { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/renderer/common/components/ui/button';
import { Input } from '@/renderer/common/components/ui/input';
import { useToast } from '@/renderer/hooks/use-toast';
import { Save, Upload, Download, FileJson } from 'lucide-react';
import { useOutletContext } from 'react-router';
import type { ServerLayoutContext } from '../../types/server-types';
import { makeSSRClient } from '@/renderer/supa-client';
import { 
  getUserInstalledServers, 
  getMcpConfigsByServerId, 
  getProductById 
} from '../../../products/queries';
import { getClients } from '../../queries';
import { createWorkflow, saveWorkflowNodes, saveWorkflowEdges, getUserWorkflows } from '../../workflow-queries';
import { publishAsTemplate } from '../../template-queries';
import WorkflowListModal from './WorkflowListModal';

interface FlowToolbarProps {
  className?: string;
}

export default function FlowToolbar({ className = '' }: FlowToolbarProps) {
  const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow();
  const { toast } = useToast();
  const [workflowName, setWorkflowName] = useState('');
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  
  // 🔥 Colab 스타일 워크플로우 상태 관리
  const [currentWorkflowId, setCurrentWorkflowId] = useState<number | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [originalWorkflowName, setOriginalWorkflowName] = useState('');
  
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

  // DB에 워크플로우 저장
  const saveWorkflowToDB = async (workflowData: any) => {
    try {
      if (!userId) {
        console.warn('⚠️ [saveWorkflowToDB] userId 없음, DB 저장 스킵');
        return;
      }

      console.log('🔥 [saveWorkflowToDB] Supabase 저장 시작:', workflowData.name);
      
      const { client } = makeSSRClient();
      
      // 1. 워크플로우 생성
      const workflowResult = await createWorkflow(client as any, {
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
      
      console.log('✅ [saveWorkflowToDB] 워크플로우 생성됨:', workflowResult);
      
      // 2. 노드들 저장
      const nodes = getNodes();
      if (nodes.length > 0) {
        const nodeData = nodes
          .filter(node => node.type) // type이 있는 노드만 필터링
          .map(node => ({
            node_id: String(node.id),
            node_type: node.type!,
            position_x: Math.round(node.position.x), // 🔥 정수로 반올림
            position_y: Math.round(node.position.y), // 🔥 정수로 반올림
            node_config: node.data,
            // 🔥 노드 타입별로 ID 연결 (타입 안전하게)
            original_server_id: node.type === 'server' && node.data ? 
              (Number((node.data as any)?.original_server_id) || Number((node.data as any)?.mcp_servers?.id) || undefined) : undefined,
            user_mcp_usage_id: node.type === 'server' && node.data ? 
              (Number((node.data as any)?.id) || undefined) : undefined,
            client_id: (node.type === 'service' || node.type === 'client') && node.data ? 
              (Number((node.data as any)?.config?.client_id) || Number((node.data as any)?.client_id) || undefined) : undefined
          }));
        
        await saveWorkflowNodes(client as any, {
          workflow_id: workflowResult.id,
          nodes: nodeData
        });
        
        console.log('✅ [saveWorkflowToDB] 노드 저장 완료:', nodeData.length, '개');
      }
      
      // 3. 엣지들 저장
      const edges = getEdges();
      if (edges.length > 0) {
        const edgeData = edges.map(edge => ({
          edge_id: String(edge.id),
          source_node_id: String(edge.source),
          target_node_id: String(edge.target),
          source_handle: edge.sourceHandle || undefined,
          target_handle: edge.targetHandle || undefined,
          edge_config: {
            type: edge.type,
            animated: edge.animated,
            style: edge.style,
            label: edge.label ? String(edge.label) : undefined
          }
        }));
        
        await saveWorkflowEdges(client as any, {
          workflow_id: workflowResult.id,
          edges: edgeData
        });
        
        console.log('✅ [saveWorkflowToDB] 엣지 저장 완료:', edgeData.length, '개');
      }

      console.log('🎉 [saveWorkflowToDB] Supabase 저장 완료!', {
        workflowId: workflowResult.id,
        name: workflowData.name,
        nodes: nodes.length,
        edges: edges.length
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

        const result = await saveAsNewWorkflow(workflowName);
        
        toast({
          title: '새 워크플로우 저장 완료! 🎉',
          description: `${workflowName} 새로운 워크플로우로 저장되었습니다.`,
          variant: 'success',
        });
        
        console.log('💾 [FlowToolbar] 새 워크플로우 저장됨:', result);
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

  // Supabase에서 워크플로우를 불러와서 ReactFlow에 로드
  const handleLoadWorkflowFromDB = async (workflowData: any) => {
    try {
      console.log('🔥 [FlowToolbar] 워크플로우 로드 시작:', workflowData);
      
      // 워크플로우 이름 설정
      if (workflowData.name) {
        setWorkflowName(workflowData.name);
      }
      
      // 노드 데이터 복원 (서버/클라이언트 정보를 실제 데이터로 변환)
      const restoredNodes = await Promise.all(
        workflowData.nodes.map(async (node: any) => {
          console.log('🔍 [FlowToolbar] 노드 복원:', node);
          
          // 노드 데이터에서 실제 서버/클라이언트 정보 복원
          let restoredData = node.data;
          
          // 서버 노드인 경우 실제 서버 데이터 복원
          if (node.type === 'server' && node.data?.original_server_id) {
            try {
              const serverData = await restoreNodeData({
                type: 'server',
                serverId: node.data.original_server_id,
                userMcpUsageId: node.data.id,
              });
              restoredData = serverData;
            } catch (error) {
              console.warn('⚠️ [FlowToolbar] 서버 데이터 복원 실패:', error);
            }
          }
          
          // 클라이언트 노드인 경우 실제 클라이언트 데이터 복원
          if ((node.type === 'service' || node.type === 'client') && node.data?.config?.client_id) {
            try {
              const clientData = await restoreNodeData({
                type: 'client',
                clientId: node.data.config.client_id,
              });
              restoredData = clientData;
            } catch (error) {
              console.warn('⚠️ [FlowToolbar] 클라이언트 데이터 복원 실패:', error);
            }
          }
          
          return {
            ...node,
            data: restoredData,
          };
        })
      );
      
      console.log('✅ [FlowToolbar] 노드 복원 완료:', restoredNodes);
      
      // ReactFlow에 노드와 엣지 설정
      setNodes(restoredNodes);
      setEdges(workflowData.edges || []);
      
      // 🔥 현재 워크플로우 상태 설정 (기존 워크플로우로 인식)
      setCurrentWorkflowId(workflowData.id);
      setOriginalWorkflowName(workflowData.name || '');
      setIsModified(false);
      
      // 화면에 맞게 조정
      setTimeout(() => {
        fitView();
      }, 100);
      
      console.log('🎉 [FlowToolbar] 워크플로우 로드 완료 - 현재 워크플로우로 설정:', workflowData.id);
      
    } catch (error) {
      console.error('❌ [FlowToolbar] 워크플로우 로드 실패:', error);
      throw error;
    }
  };

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

  // 🔥 템플릿으로 발행 (관리자용)
  const handlePublishTemplate = async () => {
    try {
      if (!userId) {
        toast({
          title: '로그인 필요',
          description: '템플릿을 발행하려면 먼저 로그인해주세요.',
          variant: 'default',
        });
        return;
      }

      const nodes = getNodes();
      const edges = getEdges();
      
      if (nodes.length === 0) {
        toast({
          title: '노드 없음',
          description: '템플릿으로 발행할 노드가 없습니다.',
          variant: 'default',
        });
        return;
      }

      // 🔥 1단계: 먼저 워크플로우 저장
      const workflowResult = await saveWorkflowToDB({
        name: workflowName || `Template_${new Date().toISOString().slice(0, 19)}`,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        userId: userId,
        description: `템플릿 - ${nodes.length}개 노드, ${edges.length}개 연결`,
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

      if (!workflowResult?.id) {
        throw new Error('워크플로우 저장 실패');
      }

      // 🔥 2단계: 템플릿으로 발행
      const { client } = makeSSRClient();
      const templateResult = await publishAsTemplate(client as any, {
        workflow_id: workflowResult.id,
        profile_id: userId,
        share_title: workflowName || `템플릿 ${workflowResult.id}`,
        share_description: `${nodes.length}개 노드로 구성된 워크플로우 템플릿입니다.`,
      });

      console.log('🎉 [FlowToolbar] 템플릿 발행 완료:', templateResult);

      toast({
        title: '템플릿 발행 완료! 📤',
        description: `"${workflowName || '워크플로우'}"가 템플릿으로 공개되었습니다.`,
        variant: 'success',
      });

    } catch (error) {
      console.error('❌ [FlowToolbar] 템플릿 발행 실패:', error);
      toast({
        title: '템플릿 발행 실패',
        description: '템플릿을 발행하는 중 오류가 발생했습니다.',
        variant: 'error',
      });
    }
  };

  return (
    <div className={`flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-border/50 backdrop-blur-sm ${className}`}>
      {/* 🔥 Colab 스타일 워크플로우 이름 입력 */}
      <div className="relative">
        <Input
          type="text"
          placeholder={currentWorkflowId ? "기존 워크플로우" : "새 워크플로우 이름"}
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className={`w-40 h-8 text-sm border-0 ${
            currentWorkflowId 
              ? 'bg-green-50/80 dark:bg-green-900/20 focus:bg-green-50 dark:focus:bg-green-900/30' 
              : 'bg-white/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800'
          }`}
        />
        {currentWorkflowId && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" title="기존 워크플로우" />
        )}
        {isModified && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" title="수정됨" />
        )}
      </div>

      {/* 구분선 */}
      <div className="h-6 w-px bg-border/50 mx-1" />

      {/* 🔥 Colab 스타일 저장 버튼들 */}
      <div className="flex items-center gap-1">
        {/* Save 버튼 - 기존/새로운에 따라 다른 동작 */}
        <Button
          onClick={handleSaveWorkflow}
          size="sm"
          variant="ghost"
          className={`h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 ${
            isModified ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          title={currentWorkflowId ? 
            (isModified ? `"${workflowName}" 저장 (수정됨)` : `"${workflowName}" 저장 (변경없음)`) : 
            "새 워크플로우로 저장"
          }
        >
          <Save className={`h-4 w-4 mr-1 ${
            isModified ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'
          }`} />
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {currentWorkflowId ? '저장' : '저장'}
          </span>
          {isModified && currentWorkflowId && (
            <span className="ml-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          )}
        </Button>

        {/* SaveAs 버튼 - 항상 새로운 복사본 생성 */}
        <Button
          onClick={handleSaveAsNewWorkflow}
          size="sm"
          variant="ghost"
          className="h-8 px-2 hover:bg-orange-100 dark:hover:bg-orange-900/30"
          title="다른 이름으로 저장 (새 복사본 생성)"
        >
          <Save className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" />
          <span className="text-xs text-orange-600 dark:text-orange-400">복사</span>
        </Button>

        {/* New 버튼 - 새 워크플로우 시작 */}
        <Button
          onClick={handleNewWorkflow}
          size="sm"
          variant="ghost"
          className="h-8 px-2 hover:bg-gray-100 dark:hover:bg-gray-900/30"
          title="새 워크플로우 시작"
        >
          <span className="text-sm mr-1">🆕</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">새로</span>
        </Button>

        {/* Load 버튼 - Supabase에서 불러오기 */}
        <Button
          onClick={handleShowSavedWorkflows}
          size="sm"
          variant="ghost"
          className="h-8 px-2 hover:bg-green-100 dark:hover:bg-green-900/30"
          title="Supabase에서 불러오기"
        >
          <Upload className="h-4 w-4 mr-1 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-600 dark:text-green-400">불러오기</span>
        </Button>

        {/* 파일에서 불러오기 (주석처리 - Supabase 우선) */}
        {/*
        <label className="cursor-pointer">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            title="파일에서 불러오기"
            asChild
          >
            <span>
              <FileJson className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </span>
          </Button>
          <input
            type="file"
            accept=".json"
            onChange={handleLoadWorkflow}
            className="hidden"
          />
        </label>
        */}

        {/* 템플릿 발행 버튼 */}
        <Button
          onClick={handlePublishTemplate}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/30"
          title="템플릿 발행"
        >
          <span className="text-purple-600 dark:text-purple-400">📤</span>
        </Button>
      </div>

      {/* 구분선 */}
      <div className="h-6 w-px bg-border/50 mx-1" />

      {/* 보조 버튼들 */}
      <div className="flex items-center gap-1">
        <Button
          onClick={handleShowCurrentFlow}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700/50"
          title="현재 정보"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
        </Button>
      </div>

      {/* 🔥 Colab 스타일 상태 표시 */}
      <div className="ml-auto flex items-center gap-2">
        {/* 워크플로우 상태 */}
        {currentWorkflowId && (
          <div className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            기존 #{currentWorkflowId}
            {isModified && <span className="ml-1 text-orange-600">*</span>}
          </div>
        )}
        
        {/* 노드/엣지 카운트 */}
        <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
          <span className="font-medium text-blue-600 dark:text-blue-400">{getNodes().length}</span>
          <span className="mx-1">·</span>
          <span className="font-medium text-green-600 dark:text-green-400">{getEdges().length}</span>
        </div>
      </div>

      {/* 워크플로우 목록 모달 */}
      <WorkflowListModal 
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onLoadWorkflow={handleLoadWorkflowFromDB}
        userId={userId}
      />
    </div>
  );
} 