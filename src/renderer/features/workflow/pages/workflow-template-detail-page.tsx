import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/renderer/common/components/ui/button';
import { useToast } from '@/renderer/hooks/use-toast';
import {
  ArrowLeft,
  Download,
  Star,
  User,
  Clock,
  Eye,
  Tag,
  GitFork,
  Play,
  Code,
  Info
} from 'lucide-react';
import { makeSSRClient } from '@/renderer/supa-client';
import { getTemplateDetails, copyTemplateToMyWorkflow } from '../../server/template-queries';
import { convertWorkflowToReactFlow } from '../../server/workflow-queries';

export async function loader() {
  return null;
}

interface TemplateDetail {
  id: number;
  name: string;
  description: string;
  tags: string[];
  execution_count: number;
  created_at: string;
  profiles: {
    name: string;
    username: string;
    avatar: string;
  };
  workflow_shares: Array<{
    download_count: number;
    share_title: string;
    share_description: string;
  }>;
  mcp_workflow_json?: any;
  flow_structure?: any;
}

export default function WorkflowTemplateDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = params as { id?: string };

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [forking, setForking] = useState(false);
  const [previewData, setPreviewData] = useState<{ nodes: any[], edges: any[] } | null>(null);

  // 템플릿 상세 정보 로드
  const loadTemplateDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { client } = makeSSRClient();
      const data = await getTemplateDetails(client as any, {
        workflow_id: parseInt(id),
      });

      if (!data) {
        throw new Error('템플릿을 찾을 수 없습니다');
      }

      setTemplate(data);

      // MCP JSON 또는 flow_structure를 ReactFlow 형식으로 변환
      const flowData = convertWorkflowToReactFlow(data);
      setPreviewData(flowData);

    } catch (error) {
      console.error('❌ 템플릿 상세 로드 실패:', error);
      toast({
        title: '로드 실패',
        description: '템플릿 상세 정보를 불러올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 템플릿 포크하기
  const handleForkTemplate = async () => {
    if (!template) return;

    setForking(true);
    try {
      const { client } = makeSSRClient();
      const userId = 'test-user-id'; // TODO: 실제 유저 ID 가져오기

      const newWorkflow = await copyTemplateToMyWorkflow(client as any, {
        template_id: template.id,
        my_profile_id: userId,
      });

      toast({
        title: '🎉 템플릿 포크 완료',
        description: `"${template.name}" 템플릿을 내 워크플로우로 복사했습니다.`,
        variant: 'default',
      });

      // 포크된 워크플로우로 이동
      navigate(`/jobs/node?workflow=${newWorkflow.id}`);

    } catch (error) {
      console.error('❌ 템플릿 포크 실패:', error);
      toast({
        title: '포크 실패',
        description: error instanceof Error ? error.message : '템플릿을 복사할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setForking(false);
    }
  };

  useEffect(() => {
    loadTemplateDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="container mx-auto py-8 px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-xl border shadow-sm p-8">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">템플릿을 찾을 수 없습니다</h3>
            <p className="text-muted-foreground mb-4">요청하신 템플릿이 존재하지 않거나 삭제되었습니다.</p>
            <Button onClick={() => navigate('/workflow/templates')}>
              템플릿 목록으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="container mx-auto py-8 px-4">
        {/* 뒤로가기 버튼 */}
        <Button
          onClick={() => navigate('/workflow/templates')}
          variant="ghost"
          size="sm"
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          템플릿 목록으로
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 템플릿 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 메인 정보 카드 */}
            <div className="bg-white rounded-xl border shadow-sm p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">
                    {template.workflow_shares[0]?.share_title || template.name}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {template.workflow_shares[0]?.share_description || template.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-lg font-semibold text-amber-600">
                  <Star className="h-5 w-5" />
                  {template.execution_count || 0}
                </div>
              </div>

              {/* 메타 정보 */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {template.profiles?.name || 'Anonymous'}
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {template.workflow_shares[0]?.download_count || 0} 다운로드
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {template.execution_count || 0} 실행
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {new Date(template.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* 태그 */}
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {template.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3">
                <Button
                  onClick={handleForkTemplate}
                  disabled={forking}
                  size="lg"
                  className="flex-1"
                >
                  <GitFork className="h-4 w-4 mr-2" />
                  {forking ? '포크 중...' : '🚀 포크하기'}
                </Button>
                <Button
                  onClick={() => navigate(`/jobs/node?template=${template.id}`)}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  미리 실행해보기
                </Button>
              </div>
            </div>

            {/* 워크플로우 미리보기 */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Code className="h-5 w-5" />
                워크플로우 구조
              </h2>

              {previewData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="font-semibold text-blue-800 mb-2">노드</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {previewData.nodes.length}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="font-semibold text-green-800 mb-2">연결</div>
                      <div className="text-2xl font-bold text-green-600">
                        {previewData.edges.length}
                      </div>
                    </div>
                  </div>

                  {/* 노드 목록 */}
                  <div>
                    <h3 className="font-semibold mb-2">포함된 노드들</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {previewData.nodes.slice(0, 6).map((node, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: node.type === 'trigger' ? '#10b981' : node.type === 'server' ? '#3b82f6' : '#6b7280' }}
                          />
                          <span className="font-medium">{node.type}</span>
                          {node.data?.name && (
                            <span className="text-muted-foreground">({node.data.name})</span>
                          )}
                        </div>
                      ))}
                      {previewData.nodes.length > 6 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          +{previewData.nodes.length - 6}개 더
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  워크플로우 구조를 불러올 수 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 제작자 정보 */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold mb-4">제작자</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {template.profiles?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <div className="font-medium">{template.profiles?.name || 'Anonymous'}</div>
                  <div className="text-sm text-muted-foreground">
                    @{template.profiles?.username || 'unknown'}
                  </div>
                </div>
              </div>
            </div>

            {/* 통계 */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold mb-4">통계</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">다운로드</span>
                  <span className="font-medium">{template.workflow_shares[0]?.download_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">실행 횟수</span>
                  <span className="font-medium">{template.execution_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">생성일</span>
                  <span className="font-medium">
                    {new Date(template.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* MCP 호환성 */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="font-semibold mb-4">MCP 호환성</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${template.mcp_workflow_json ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm">
                    {template.mcp_workflow_json ? 'MCP 표준 준수' : '레거시 형식'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {template.mcp_workflow_json
                    ? '최신 MCP 표준으로 제작된 템플릿입니다'
                    : '이전 버전으로 제작되었지만 호환됩니다'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


