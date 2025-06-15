import React, { useState, useEffect } from 'react';
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
import { createWorkflow, saveWorkflowNodes, saveWorkflowEdges, getUserWorkflows, createWorkflowShare } from '../../workflow-queries';
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
              className={`h-9 px-4 gap-2 transition-all ${
                isModified 
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md' 
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
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
              className="h-9 px-4 gap-2 hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              불러오기
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
    </div>
  );
} 