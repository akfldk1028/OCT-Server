import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './reactflow-edges.css';

// Custom components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParams, useNavigate } from 'react-router';
import { makeSSRClient } from '@/renderer/supa-client';
import { getWorkflowByShareToken } from '../workflow-queries';
import { useToast } from '@/renderer/hooks/use-toast';
import { 
  Share2, 
  Copy, 
  Download, 
  ArrowLeft,
  Eye,
  User,
  Calendar,
  FileText,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

const nodeTypes = {
  text: (props: any) => <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>{props.data?.text || 'Text Node'}</div>,
  service: (props: any) => <div style={{ padding: '10px', border: '1px solid #0066cc', borderRadius: '4px', backgroundColor: '#f0f8ff' }}>{props.data?.config?.name || 'Service'}</div>,
  server: (props: any) => <div style={{ padding: '10px', border: '1px solid #00cc66', borderRadius: '4px', backgroundColor: '#f0fff0' }}>{props.data?.mcp_servers?.name || props.data?.name || 'Server'}</div>,
  trigger: (props: any) => <div style={{ padding: '10px', border: '1px solid #ff6600', borderRadius: '4px', backgroundColor: '#fff8f0' }}>{props.data?.label || 'Trigger'}</div>,
  default: (props: any) => (
    <div
      style={{
        padding: '12px',
        border: '2px solid #666',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        minWidth: '150px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div>{props.data?.label || 'Default Node'}</div>
    </div>
  ),
};

const defaultEdgeOptions = {
  style: { strokeWidth: 2 },
  type: 'smoothstep',
  animated: true,
};

interface SharedWorkflowPageProps {}

export default function SharedWorkflowPage({}: SharedWorkflowPageProps) {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [shareInfo, setShareInfo] = useState<any>(null);

  // 공유된 워크플로우 로드
  useEffect(() => {
    const loadSharedWorkflow = async () => {
      if (!shareToken) {
        setError('공유 토큰이 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { client } = makeSSRClient();
        
        const result = await getWorkflowByShareToken(client, {
          share_token: shareToken
        });
        
        const { workflow, shareInfo: shareData } = result;
        setWorkflowData(workflow);
        setShareInfo(shareData);
        
        // React Flow 형식으로 노드 변환
        const flowNodes = workflow.nodes.map((node: any) => ({
          id: node.node_id,
          type: node.node_type,
          position: { x: node.position_x, y: node.position_y },
          data: node.node_config,
          // 읽기 전용으로 설정
          draggable: false,
          selectable: false,
          deletable: false,
        }));
        
        // React Flow 형식으로 엣지 변환
        const flowEdges = workflow.edges.map((edge: any) => ({
          id: edge.edge_id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          sourceHandle: edge.source_handle,
          targetHandle: edge.target_handle,
          ...edge.edge_config,
          // 읽기 전용으로 설정
          deletable: false,
        }));
        
        setNodes(flowNodes);
        setEdges(flowEdges);
        
        console.log('🎉 [SharedWorkflowPage] 공유 워크플로우 로드 완료:', {
          workflow: workflow.name,
          nodes: flowNodes.length,
          edges: flowEdges.length,
          shareInfo: shareData
        });
        
      } catch (error) {
        console.error('❌ [SharedWorkflowPage] 로드 실패:', error);
        setError(error instanceof Error ? error.message : '워크플로우를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadSharedWorkflow();
  }, [shareToken]);

  // 워크플로우 복사 (내 계정으로)
  const handleCopyWorkflow = async () => {
    if (!shareInfo?.can_copy) {
      toast({
        title: '복사 권한 없음',
        description: '이 워크플로우를 복사할 권한이 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // TODO: 내 계정으로 워크플로우 복사 로직 구현
      toast({
        title: '복사 완료! 📋',
        description: '워크플로우가 내 계정으로 복사되었습니다.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: '복사 실패',
        description: '워크플로우 복사 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 공유 링크 복사
  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: '링크 복사 완료! 🔗',
        description: '공유 링크가 클립보드에 복사되었습니다.',
      });
    } catch (error) {
      toast({
        title: '복사 실패',
        description: '링크 복사 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">공유 워크플로우를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-semibold">워크플로우를 불러올 수 없습니다</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* 상단 헤더 */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          {/* 왼쪽: 워크플로우 정보 */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              돌아가기
            </Button>
            
            <div className="h-6 w-px bg-border" />
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-semibold">
                  {shareInfo?.share_title || workflowData?.name || '공유된 워크플로우'}
                </h1>
                <Badge variant="outline" className="gap-1">
                  <Eye className="w-3 h-3" />
                  읽기 전용
                </Badge>
              </div>
              
              {shareInfo?.share_description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {shareInfo.share_description}
                </p>
              )}
            </div>
          </div>

          {/* 오른쪽: 액션 버튼들 */}
          <div className="flex items-center gap-2">
            {/* 워크플로우 통계 */}
            <div className="flex items-center gap-4 px-3 py-2 bg-muted/30 rounded-lg border border-border/30">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-sm text-muted-foreground">노드</span>
                <span className="text-sm font-semibold">{nodes.length}</span>
              </div>
              <div className="h-4 w-px bg-border/50" />
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm text-muted-foreground">연결</span>
                <span className="text-sm font-semibold">{edges.length}</span>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <Button
              onClick={handleShareLink}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              링크 복사
            </Button>

            {shareInfo?.can_copy && (
              <Button
                onClick={handleCopyWorkflow}
                size="sm"
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                내 계정으로 복사
              </Button>
            )}
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="px-4 pb-3 flex items-center gap-4 text-sm text-muted-foreground">
          {workflowData?.profiles && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>
                작성자: {workflowData.profiles.name || workflowData.profiles.username || '익명'}
              </span>
            </div>
          )}
          
          {shareInfo?.created_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                공유일: {new Date(shareInfo.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          )}
          
          {shareInfo?.download_count !== undefined && (
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>조회수: {shareInfo.download_count}</span>
            </div>
          )}

          {shareInfo?.expires_at && (
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>
                만료일: {new Date(shareInfo.expires_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 메인 플로우 영역 */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.1, minZoom: 0.3, maxZoom: 1.5 }}
          style={{ backgroundColor: 'hsl(var(--background))' }}
          attributionPosition="bottom-right"
          proOptions={{ hideAttribution: true }}
          // 읽기 전용 설정
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScroll={false}
          preventScrolling={false}
        >
          <Background />
          <Controls position="bottom-left" />
        </ReactFlow>

        {/* 읽기 전용 안내 */}
        <div className="absolute bottom-4 right-4 bg-card/90 border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              이 워크플로우는 읽기 전용입니다
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 