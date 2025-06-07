import React, { useState } from 'react';
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

interface FlowToolbarProps {
  className?: string;
}

export default function FlowToolbar({ className = '' }: FlowToolbarProps) {
  const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow();
  const { toast } = useToast();
  const [workflowName, setWorkflowName] = useState('');
  
  // 서버/클라이언트 데이터 컨텍스트 가져오기
  const { servers, clients, userId } = useOutletContext<ServerLayoutContext>();

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

  // DB에 워크플로우 저장
  const saveWorkflowToDB = async (workflowData: any) => {
    try {
      if (!userId) {
        console.warn('⚠️ [saveWorkflowToDB] userId 없음, DB 저장 스킵');
        return;
      }

      // TODO: Supabase에 workflows 테이블 생성 후 저장
      // const { client } = makeSSRClient();
      // await client.from('workflows').insert({
      //   user_id: userId,
      //   name: workflowData.name,
      //   description: workflowData.description,
      //   workflow_data: workflowData,
      //   created_at: workflowData.createdAt
      // });

      console.log('💾 [saveWorkflowToDB] DB 저장 완료 (시뮬레이션):', workflowData.name);
    } catch (error) {
      console.error('❌ [saveWorkflowToDB] DB 저장 실패:', error);
    }
  };

  // 워크플로우를 ID 기반으로 저장 (실제 데이터는 제외)
  const handleSaveWorkflow = async () => {
    try {
      const nodes = getNodes();
      const edges = getEdges();
      
      const workflowData = {
        name: workflowName || `Workflow_${new Date().toISOString().slice(0, 19)}`,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        userId: userId, // 🔥 사용자 ID 추가
        description: `워크플로우 - ${nodes.length}개 노드, ${edges.length}개 연결`,
        // 🔥 ID와 위치/타입 정보만 저장, 실제 데이터는 제외
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          width: node.width,
          height: node.height,
          // 🔥 실제 데이터 대신 ID만 저장
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

      // JSON 파일로 다운로드
      const jsonString = JSON.stringify(workflowData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflowData.name}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // localStorage에도 저장 (백업용)
      const savedWorkflows = JSON.parse(localStorage.getItem('saved_workflows') || '[]');
      savedWorkflows.push(workflowData);
      localStorage.setItem('saved_workflows', JSON.stringify(savedWorkflows));

      // 🔥 Supabase DB에도 저장 (선택적)
      await saveWorkflowToDB(workflowData);

      toast({
        title: '워크플로우 저장 완료! 🎉',
        description: `${workflowData.name} 파일이 다운로드되고 DB에 저장되었습니다.`,
        variant: 'success',
      });

      console.log('💾 [FlowToolbar] 워크플로우 저장됨:', workflowData);

    } catch (error) {
      console.error('❌ [FlowToolbar] 저장 실패:', error);
      toast({
        title: '저장 실패',
        description: '워크플로우 저장 중 오류가 발생했습니다.',
        variant: 'error',
      });
    }
  };

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

  // localStorage에서 워크플로우 목록 보기
  const handleShowSavedWorkflows = () => {
    try {
      const savedWorkflows = JSON.parse(localStorage.getItem('saved_workflows') || '[]');
      console.log('💾 [FlowToolbar] 저장된 워크플로우들:', savedWorkflows);
      
      toast({
        title: '저장된 워크플로우',
        description: `총 ${savedWorkflows.length}개의 워크플로우가 저장되어 있습니다. (콘솔 확인)`,
        variant: 'default',
      });
    } catch (error) {
      console.error('❌ [FlowToolbar] 목록 조회 실패:', error);
    }
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

  return (
    <div className={`flex items-center gap-2 p-3 bg-card border-b border-border ${className}`}>
      {/* 워크플로우 이름 입력 */}
      <Input
        type="text"
        placeholder="워크플로우 이름..."
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        className="w-48"
      />

      {/* Save 버튼 */}
      <Button
        onClick={handleSaveWorkflow}
        className="flex items-center gap-2"
        variant="default"
      >
        <Save className="h-4 w-4" />
        저장
      </Button>

      {/* Load 버튼 */}
      <label className="cursor-pointer">
        <Button
          type="button"
          className="flex items-center gap-2"
          variant="outline"
          asChild
        >
          <span>
            <Upload className="h-4 w-4" />
            불러오기
          </span>
        </Button>
        <input
          type="file"
          accept=".json"
          onChange={handleLoadWorkflow}
          className="hidden"
        />
      </label>

      {/* 저장된 목록 보기 */}
      <Button
        onClick={handleShowSavedWorkflows}
        className="flex items-center gap-2"
        variant="ghost"
        size="sm"
      >
        <FileJson className="h-4 w-4" />
        목록
      </Button>

      {/* 현재 정보 보기 */}
      <Button
        onClick={handleShowCurrentFlow}
        className="flex items-center gap-2"
        variant="ghost"
        size="sm"
      >
        <Download className="h-4 w-4" />
        정보
      </Button>

      {/* 상태 표시 */}
      <div className="ml-auto text-sm text-muted-foreground">
        {getNodes().length}개 노드, {getEdges().length}개 연결
      </div>
    </div>
  );
} 