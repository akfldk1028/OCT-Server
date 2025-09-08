import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/renderer/common/components/ui/button';
import { Input } from '@/renderer/common/components/ui/input';
import { useToast } from '@/renderer/hooks/use-toast';
import { X, Search, Clock, Star, Download, Trash2 } from 'lucide-react';
import { makeSSRClient } from '@/renderer/supa-client';
import { getUserWorkflows, getWorkflowWithMcpJson, convertWorkflowToReactFlow } from '../../workflow-queries';
import { useWorkflowMutations, WorkflowItem } from '../../workflow-mutations';
import { dfsTraverse } from '../node/FlowDfsUtil';

// WorkflowItem 인터페이스는 workflow-mutations.ts에서 import

interface WorkflowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadWorkflow: (workflowData: any) => Promise<void>;
  onServerAdded?: (newServerNode: any) => Promise<void>;
  userId?: string;
  // 특정 클라이언트 타입만 보여주도록 필터링
  filterClientType?: 'claude_desktop' | 'local' | 'openai' | 'mixed' | 'unknown' | null;
  // 커스텀 제목
  title?: string;
  description?: string;
}

export default function WorkflowListModal({
  isOpen,
  onClose,
  onLoadWorkflow,
  onServerAdded,
  userId,
  filterClientType = null,
  title = '워크플로우 불러오기',
  description = '저장된 워크플로우를 선택해서 캔버스에 불러올 수 있습니다'
}: WorkflowListModalProps) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClientTab, setSelectedClientTab] = useState<string>('all');
  const [deletingWorkflows, setDeletingWorkflows] = useState<Set<number>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<number>>(new Set());
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const { toast } = useToast();

  // 🚨 userId가 없으면 로그인 안내 표시
  if (!userId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-4">
          <h2 className="text-lg font-semibold mb-4">로그인이 필요합니다</h2>
          <p className="text-muted-foreground mb-4">
            워크플로우를 불러오려면 먼저 로그인해주세요.
          </p>
          <Button
            onClick={onClose}
            className="w-full"
          >
            확인
          </Button>
        </div>
      </div>
    );
  }

  // 🔥 Mutation Hook 사용 (userId 확인 후)
  const mutations = useWorkflowMutations(
    userId,
    (title: string, description: string) => toast({ title, description, variant: 'default' }),
    (title: string, description: string) => toast({ title, description, variant: 'destructive' }),
    setWorkflows,
    (workflowId: number, loading: boolean) => {
      if (loading) {
        setDeletingWorkflows(prev => new Set([...prev, workflowId]));
        setUpdatingStatus(prev => new Set([...prev, workflowId]));
      } else {
        setDeletingWorkflows(prev => {
          const next = new Set(prev);
          next.delete(workflowId);
          return next;
        });
        setUpdatingStatus(prev => {
          const next = new Set(prev);
          next.delete(workflowId);
          return next;
        });
      }
    }
  );

  // 🔥 DFS를 활용한 최적화된 워크플로우 클라이언트 타입 분석
  // 📊 DFS 기반 워크플로우 분석 시스템 (리팩토링)

  // 타입 정의
  type AnalysisResult = {
    clients: string[];
    mcpServers: string[];
    hasClaudeClient: boolean;
    hasOpenAIClient: boolean;
    hasLocalClient: boolean;
    hasMCPServers: boolean;
    primaryClientType: string | null;
  };

  // 🎯 메인 분석 함수
  const analyzeWorkflowClientType = async (workflowId: number): Promise<{ client_type: string; target_clients: string[] }> => {
    try {
      console.log(`🔍 [analyzeWorkflowClientType] 워크플로우 ${workflowId} 분석 시작`);

      // 1. 워크플로우 데이터 로드
      const workflowDetails = await loadWorkflowDetails(workflowId);
      if (!workflowDetails) {
        console.log('❌ 워크플로우 데이터 없음');
        return { client_type: 'unknown', target_clients: [] };
      }

      console.log(`📊 로드된 데이터:`, {
        name: workflowDetails.name,
        nodes: workflowDetails.nodes?.length || 0,
        edges: workflowDetails.edges?.length || 0,
        has_mcp_json: !!workflowDetails.mcp_workflow_json,
        raw_data_keys: Object.keys(workflowDetails),
        raw_nodes_sample: workflowDetails.nodes?.slice(0, 2),
        raw_edges_sample: workflowDetails.edges?.slice(0, 2)
      });

      // 2. DFS 기반 노드 분석
      const analysisResult = await analyzeNodesByDFS(workflowDetails);
      if (!analysisResult) {
        console.log('❌ 분석 결과 없음');
        return { client_type: 'unknown', target_clients: [] };
      }

      // 3. 최종 클라이언트 타입 결정
      const clientType = determineClientType(analysisResult, workflowDetails);

      console.log('🎯 분석 완료:', { clientType, clients: analysisResult.clients });
      return {
        client_type: clientType,
        target_clients: [...new Set(analysisResult.clients)]
      };

    } catch (error) {
      console.error('❌ 워크플로우 분석 실패:', error);
      return { client_type: 'unknown', target_clients: [] };
    }
  };

  // 📥 워크플로우 상세 정보 로드 (새로운 MCP JSON 방식)
  const loadWorkflowDetails = async (workflowId: number) => {
    const { client } = makeSSRClient();
    const workflowDetails = await getWorkflowWithMcpJson(client as any, {
      workflow_id: workflowId,
      profile_id: userId!,
    });

    if (!workflowDetails) {
      return null;
    }

    // MCP JSON 또는 레거시 구조를 ReactFlow 형식으로 변환
    const reactFlowData = convertWorkflowToReactFlow(workflowDetails);

    return {
      ...workflowDetails,
      nodes: reactFlowData.nodes,
      edges: reactFlowData.edges,
      metadata: reactFlowData.metadata
    };
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

    // DFS 순회
    const orderedNodes = dfsTraverse(triggerNode.node_id, nodes, edges);
    console.log('🔍 실행 순서:', orderedNodes.map(n => `${n.type}(${n.id})`).join(' → '));

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
        console.log('✅ Claude 클라이언트:', clientName);
      } else if (result.primaryClientType === 'openai') {
        result.hasOpenAIClient = true;
        console.log('✅ OpenAI 클라이언트:', clientName);
      } else {
        result.hasLocalClient = true;
        console.log('✅ 로컬 클라이언트:', clientName);
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
    if (node.mcp_servers) {
      result.hasMCPServers = true;
      const serverName = node.mcp_servers.name || `서버 ${node.id}`;
      result.mcpServers.push(serverName);
    }
  };

  // 🏷️ 클라이언트 타입 분류
  const classifyClientType = (clientName: string): string => {
    const name = clientName.toLowerCase();

    if (name.includes('claude')) {
      return 'claude_desktop';
    } else if (name.includes('openai') || name.includes('gpt')) {
      return 'openai';
    } else {
      return 'local';
    }
  };

  // 🎯 최종 클라이언트 타입 결정
  const determineClientType = (result: AnalysisResult, workflowDetails: any): string => {
    // 1. 명시적 클라이언트가 있는 경우
    if (result.primaryClientType) {
      return checkMixedType(result) || result.primaryClientType;
    }

    // 2. MCP 서버만 있는 경우
    if (result.hasMCPServers) {
      return analyzeWorkflowMetadata(workflowDetails, result);
    }

    // 3. 분류 기준 부족
    console.log('❓ 분류 기준 부족 → unknown');
    return 'unknown';
  };

  // 🔀 Mixed 타입 체크
  const checkMixedType = (result: AnalysisResult): string | null => {
    const activeTypes = [
      result.hasClaudeClient,
      result.hasOpenAIClient,
      result.hasLocalClient
    ].filter(Boolean).length;

    if (activeTypes > 1) {
      console.log('🔀 여러 클라이언트 타입 → mixed');
      return 'mixed';
    }

    return null;
  };

  // 📝 워크플로우 메타데이터 분석
  const analyzeWorkflowMetadata = (workflowDetails: any, result: AnalysisResult): string => {
    const workflowName = workflowDetails.name?.toLowerCase() || '';
    const workflowDesc = workflowDetails.description?.toLowerCase() || '';

    const localKeywords = ['local', 'prototype', 'test', '로컬', '테스트', '개발'];
    const hasLocalKeywords = localKeywords.some(keyword =>
      workflowName.includes(keyword) || workflowDesc.includes(keyword)
    );

    if (hasLocalKeywords) {
      console.log('🏠 로컬 키워드 감지 → local');
      result.hasLocalClient = true;
      return 'local';
    } else {
      console.log('🧠 MCP 서버 감지 → claude_desktop');
      result.hasClaudeClient = true;
      return 'claude_desktop';
    }
  };

  // 워크플로우 목록 로드
  const loadWorkflows = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { client } = makeSSRClient();

      const params: any = {
        profile_id: userId,
        limit: 100,
      };

      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const data = await getUserWorkflows(client as any, params);

      // 각 워크플로우의 클라이언트 타입 분석
      const workflowsWithClientInfo = await Promise.all(
        (data || []).map(async (workflow: any) => {
          const { client_type, target_clients } = await analyzeWorkflowClientType(workflow.id);
          return {
            ...workflow,
            description: workflow.description || undefined,
            status: workflow.status || 'draft',
            client_type,
            target_clients
          };
        })
      );

      setWorkflows(workflowsWithClientInfo);

    } catch (error) {
      console.error('❌ [WorkflowListModal] 워크플로우 로드 실패:', error);
      toast({
        title: '로드 실패',
        description: '워크플로우 목록을 불러올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 워크플로우 선택 및 로드
  const handleSelectWorkflow = async (workflowItem: WorkflowItem) => {
    try {
      setLoading(true);

      const { client } = makeSSRClient();
      const workflowWithDetails = await getWorkflowWithMcpJson(client as any, {
        workflow_id: workflowItem.id,
        profile_id: userId!,
      });

      if (!workflowWithDetails) {
        throw new Error('워크플로우 상세 정보를 찾을 수 없습니다.');
      }

      // 새로운 MCP JSON 변환 방식 사용
      const reactFlowData = convertWorkflowToReactFlow(workflowWithDetails);
      const workflowData = {
        name: workflowWithDetails.name,
        description: workflowWithDetails.description,
        nodes: reactFlowData.nodes,
        edges: reactFlowData.edges,
        metadata: reactFlowData.metadata
      };

      console.log('🔥 [WorkflowListModal] 변환된 데이터:', workflowData);

      await onLoadWorkflow(workflowData);

      toast({
        title: '워크플로우 로드 완료',
        description: `"${workflowItem.name}"를 성공적으로 불러왔습니다.`,
        variant: 'default',
      });

      onClose();

    } catch (error) {
      console.error('❌ [WorkflowListModal] 워크플로우 로드 실패:', error);
      toast({
        title: '로드 실패',
        description: error instanceof Error ? error.message : '워크플로우를 불러올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 워크플로우 삭제 - mutations hook 사용
  const handleDeleteWorkflow = async (workflowId: number, workflowName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await mutations.deleteWorkflow(workflowId, workflowName);
  };

  // 🔥 워크플로우 상태 변경 - mutations hook 사용
  const handleStatusChange = async (workflowId: number, newStatus: 'draft' | 'active' | 'archived' | 'shared', workflowName: string) => {
    await mutations.updateStatus(workflowId, newStatus, workflowName);
  };

  // 🔥 템플릿/공개 상태 토글 - mutations hook 사용
  const handleToggleTemplate = async (workflowId: number, currentValue: boolean, workflowName: string) => {
    await mutations.toggleTemplate(workflowId, currentValue, workflowName);
  };

  const handleTogglePublic = async (workflowId: number, currentValue: boolean, workflowName: string) => {
    await mutations.togglePublic(workflowId, currentValue, workflowName);
  };

  // 🔥 이름 편집 (더블클릭으로 시작)
  const handleStartNameEdit = (workflowId: number, currentName: string) => {
    setEditingName(workflowId);
    setEditingNameValue(currentName);
  };

  const handleSaveNameEdit = async (workflowId: number) => {
    const success = await mutations.updateName(workflowId, editingNameValue);
    if (success) {
      setEditingName(null);
      setEditingNameValue('');
    }
  };

  const handleCancelNameEdit = () => {
    setEditingName(null);
    setEditingNameValue('');
  };

  // 검색 및 클라이언트 타입 필터링
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.description && workflow.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // 부모에서 특정 클라이언트 타입 필터가 설정된 경우 해당 타입만 보여주기
    const matchesParentFilter = !filterClientType || workflow.client_type === filterClientType;

    const matchesClientType = selectedClientTab === 'all' || workflow.client_type === selectedClientTab;

    return matchesSearch && matchesParentFilter && matchesClientType;
  });

  // 클라이언트 타입별 카운트 (부모 필터 적용)
  const baseWorkflows = filterClientType
    ? workflows.filter(w => w.client_type === filterClientType)
    : workflows;

  const clientTypeCounts = {
    all: baseWorkflows.length,
    claude_desktop: baseWorkflows.filter(w => w.client_type === 'claude_desktop').length,
    local: baseWorkflows.filter(w => w.client_type === 'local').length,
    openai: baseWorkflows.filter(w => w.client_type === 'openai').length,
    mixed: baseWorkflows.filter(w => w.client_type === 'mixed').length,
    unknown: baseWorkflows.filter(w => w.client_type === 'unknown').length,
  };

  // 모달이 열릴 때 워크플로우 로드
  useEffect(() => {
    if (isOpen && userId) {
      loadWorkflows();
    }
  }, [isOpen, userId, selectedStatus]);

  // ESC 키 이벤트 핸들러
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 외부 클릭 핸들러
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

    const modalContent = (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{
        zIndex: 999999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={handleBackdropClick}
    >
       <div
         className="bg-card rounded-2xl shadow-2xl w-[900px] max-h-[700px] flex flex-col relative border border-border"
         style={{
           zIndex: 1000000,
           maxWidth: '95vw',
           maxHeight: '95vh',
           boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
         }}
         onClick={(e) => e.stopPropagation()}
       >
        {/* 헤더 */}
        <div className="flex justify-between items-start p-8 border-b border-border">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-card-foreground tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {description}
              {filterClientType && (
                <span className="block mt-1 text-primary font-medium">
                  {filterClientType === 'local' && '💻 로컬 전용 워크플로우'}
                  {filterClientType === 'claude_desktop' && '🧠 Claude Desktop 전용 워크플로우'}
                  {filterClientType === 'openai' && '🔧 OpenAI 전용 워크플로우'}
                  {filterClientType === 'mixed' && '🔀 멀티 클라이언트 워크플로우'}
                  {filterClientType === 'unknown' && '❓ 기타 워크플로우'}
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        {/* 클라이언트 타입 탭 (filterClientType이 설정되지 않은 경우만 보여주기) */}
        {!filterClientType && (
          <div className="px-8 pt-6 pb-4 bg-muted/30">
            <div className="flex space-x-1 bg-muted rounded-xl p-1">
            {[
              { key: 'all', label: '전체', icon: '🌐', count: clientTypeCounts.all },
              { key: 'claude_desktop', label: 'Claude Desktop', icon: '🧠', count: clientTypeCounts.claude_desktop },
              { key: 'local', label: 'Local', icon: '💻', count: clientTypeCounts.local },
              { key: 'openai', label: 'OpenAI', icon: '🔧', count: clientTypeCounts.openai },
              { key: 'mixed', label: 'Mixed', icon: '🔀', count: clientTypeCounts.mixed },
              { key: 'unknown', label: '기타', icon: '❓', count: clientTypeCounts.unknown },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedClientTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedClientTab === tab.key
                    ? 'bg-card shadow-sm text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedClientTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* 검색 및 필터 */}
        <div className="px-8 pb-6 bg-muted/30">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="워크플로우 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 bg-card rounded-xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 border border-border rounded-xl bg-card text-sm shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[140px]"
            >
              <option value="all">모든 상태</option>
              <option value="draft">초안</option>
              <option value="active">활성</option>
              <option value="shared">공유됨</option>
              <option value="archived">보관됨</option>
            </select>
          </div>
        </div>

        {/* 워크플로우 목록 */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
              <span className="text-muted-foreground font-medium">워크플로우를 불러오는 중...</span>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-card-foreground font-medium">
                  {searchTerm ? '검색 결과가 없습니다' : '저장된 워크플로우가 없습니다'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? '다른 검색어를 시도해보세요' : '새로운 워크플로우를 만들어보세요'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="group border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer hover:shadow-md"
                  onClick={() => handleSelectWorkflow(workflow)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      {/* 첫 번째 줄: 제목 + 뱃지들 */}
                      <div className="flex items-center gap-2 mb-2">
                        {/* 🔥 이름 편집 (더블클릭으로 활성화) */}
                        {editingName === workflow.id ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNameEdit(workflow.id);
                                if (e.key === 'Escape') handleCancelNameEdit();
                              }}
                              onBlur={() => handleSaveNameEdit(workflow.id)}
                              className="text-sm font-semibold bg-primary/5 border border-primary/20 rounded px-2 py-1 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              autoFocus
                              disabled={updatingStatus.has(workflow.id)}
                            />
                            <button
                              onClick={() => handleSaveNameEdit(workflow.id)}
                              className="text-xs text-primary hover:text-primary/80 px-1"
                              disabled={updatingStatus.has(workflow.id)}
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelNameEdit}
                              className="text-xs text-muted-foreground hover:text-foreground px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <h3
                            className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors truncate cursor-pointer hover:bg-muted rounded px-1 py-0.5"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleStartNameEdit(workflow.id, workflow.name);
                            }}
                            title="더블클릭하여 이름 편집"
                          >
                            {workflow.name}
                          </h3>
                        )}

                        {/* 🔥 상태 드롭다운 (Excel/Notion 스타일) */}
                        <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={workflow.status}
                            onChange={(e) => handleStatusChange(workflow.id, e.target.value as any, workflow.name)}
                            disabled={updatingStatus.has(workflow.id)}
                            className={`text-xs font-medium px-2 py-0.5 rounded border-0 cursor-pointer transition-all ${
                              workflow.status === 'active' ? 'bg-primary/10 text-primary' :
                              workflow.status === 'draft' ? 'bg-muted text-muted-foreground' :
                              workflow.status === 'shared' ? 'bg-chart-2/10 text-chart-2' :
                              'bg-chart-3/10 text-chart-3'
                            } ${updatingStatus.has(workflow.id) ? 'opacity-50 cursor-wait' : 'hover:opacity-80'}`}
                          >
                            <option value="draft">초안</option>
                            <option value="active">활성</option>
                            <option value="shared">공유됨</option>
                            <option value="archived">보관됨</option>
                          </select>
                          {updatingStatus.has(workflow.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-card/50 rounded">
                              <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent" />
                            </div>
                          )}
                        </div>

                        {/* 클라이언트 타입 뱃지 */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                          workflow.client_type === 'claude_desktop' ? 'bg-chart-2/10 text-chart-2' :
                          workflow.client_type === 'local' ? 'bg-chart-1/10 text-chart-1' :
                          workflow.client_type === 'openai' ? 'bg-primary/10 text-primary' :
                          workflow.client_type === 'mixed' ? 'bg-chart-4/10 text-chart-4' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {workflow.client_type === 'claude_desktop' && '🧠 Claude'}
                          {workflow.client_type === 'local' && '💻 Local'}
                          {workflow.client_type === 'openai' && '🔧 OpenAI'}
                          {workflow.client_type === 'mixed' && '🔀 Mixed'}
                          {workflow.client_type === 'unknown' && '❓ 기타'}
                        </span>

                        {/* 🔥 템플릿/공개 토글 뱃지 (클릭 가능) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTemplate(workflow.id, workflow.is_template, workflow.name);
                          }}
                          disabled={updatingStatus.has(workflow.id)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 transition-all ${
                            workflow.is_template
                              ? 'bg-chart-4/10 text-chart-4 hover:bg-chart-4/20'
                              : 'bg-muted text-muted-foreground hover:bg-chart-4/5'
                          } ${updatingStatus.has(workflow.id) ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                          title={workflow.is_template ? '템플릿 해제하기' : '템플릿으로 설정하기'}
                        >
                          <Star className={`h-3 w-3 ${workflow.is_template ? 'fill-current' : ''}`} />
                          {workflow.is_template ? '템플릿' : '템플릿?'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePublic(workflow.id, workflow.is_public, workflow.name);
                          }}
                          disabled={updatingStatus.has(workflow.id)}
                          className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 transition-all ${
                            workflow.is_public
                              ? 'bg-chart-1/10 text-chart-1 hover:bg-chart-1/20'
                              : 'bg-muted text-muted-foreground hover:bg-chart-1/5'
                          } ${updatingStatus.has(workflow.id) ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                          title={workflow.is_public ? '비공개로 변경하기' : '공개로 변경하기'}
                        >
                          {workflow.is_public ? '공개' : '비공개'}
                        </button>
                      </div>

                      {/* 두 번째 줄: 설명 (짧게 표시) */}
                      {workflow.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                          {workflow.description}
                        </p>
                      )}

                      {/* 세 번째 줄: 메타 정보 */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(workflow.updated_at).toLocaleDateString('ko-KR')}
                        </span>
                        {workflow.profiles?.name && (
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                              {workflow.profiles.name.charAt(0)}
                            </div>
                            {workflow.profiles.name}
                          </span>
                        )}
                        {/* 대상 클라이언트 개수 */}
                        {workflow.target_clients && workflow.target_clients.length > 0 && (
                          <span>
                            클라이언트 {workflow.target_clients.length}개
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 🔥 액션 버튼들 (불러오기 + 삭제) */}
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-lg px-3 py-1 shadow-sm group-hover:shadow-md transition-all text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        불러오기
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg p-1 transition-all opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDeleteWorkflow(workflow.id, workflow.name, e)}
                        disabled={deletingWorkflows.has(workflow.id)}
                        title="워크플로우 삭제"
                      >
                        {deletingWorkflows.has(workflow.id) ? (
                          <div className="animate-spin rounded-full h-3 w-3 border border-destructive border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-8 py-6 border-t border-border bg-muted/30">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-card-foreground">
                총 {filteredWorkflows.length}개의 워크플로우
              </span>
              {searchTerm && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  "{searchTerm}" 검색 중
                </span>
              )}
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              className="rounded-xl hover:bg-muted transition-colors"
            >
              취소
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Portal을 사용해서 body에 직접 렌더링
  return createPortal(modalContent, document.body);
}
