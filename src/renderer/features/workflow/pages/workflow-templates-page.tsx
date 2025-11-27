import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Button } from '@/renderer/common/components/ui/button';
import { Input } from '@/renderer/common/components/ui/input';
import { useToast } from '@/renderer/hooks/use-toast';
import {
  Search,
  Filter,
  Star,
  Download,
  Clock,
  User,
  Eye,
  Tag,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { makeSSRClient } from '@/renderer/supa-client';
import { getPopularTemplates, copyTemplateToMyWorkflow } from '../../server/template-queries';
import { convertWorkflowToReactFlow } from '../../server/workflow-queries';

export async function loader() {
  return null;
}

interface TemplateItem {
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
}

export default function WorkflowTemplatesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(params.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(params.get('category') || 'all');
  const [sortBy, setSortBy] = useState(params.get('sort') || 'popular');

  // 카테고리 옵션
  const categories = [
    { value: 'all', label: '전체', icon: '🌟' },
    { value: 'AI', label: 'AI Assistant', icon: '🤖' },
    { value: 'automation', label: '자동화', icon: '⚡' },
    { value: 'data', label: '데이터 처리', icon: '📊' },
    { value: 'productivity', label: '생산성', icon: '🚀' },
    { value: 'development', label: '개발', icon: '💻' },
  ];

  // 정렬 옵션
  const sortOptions = [
    { value: 'popular', label: '인기순', icon: TrendingUp },
    { value: 'latest', label: '최신순', icon: Clock },
    { value: 'downloads', label: '다운로드순', icon: Download },
  ];

  // 템플릿 목록 로드
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { client } = makeSSRClient();
      const data = await getPopularTemplates(client as any, {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        limit: 50,
      });

      setTemplates(data || []);
    } catch (error) {
      console.error('❌ 템플릿 로드 실패:', error);
      toast({
        title: '로드 실패',
        description: '템플릿을 불러올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 템플릿 포크하기
  const handleForkTemplate = async (template: TemplateItem) => {
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
    }
  };

  // 필터링된 템플릿
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // 정렬된 템플릿
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    switch (sortBy) {
      case 'latest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'downloads':
        return (b.workflow_shares[0]?.download_count || 0) - (a.workflow_shares[0]?.download_count || 0);
      case 'popular':
      default:
        return (b.execution_count || 0) - (a.execution_count || 0);
    }
  });

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  // URL 파라미터 업데이트
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('search', searchQuery);
    if (selectedCategory !== 'all') newParams.set('category', selectedCategory);
    if (sortBy !== 'popular') newParams.set('sort', sortBy);
    setParams(newParams);
  }, [searchQuery, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="container mx-auto py-8 px-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🎯 워크플로우 템플릿 마켓플레이스
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            검증된 워크플로우 템플릿으로 빠르게 시작하세요. 커뮤니티가 만든 최고의 워크플로우를 포크해서 바로 사용할 수 있습니다.
          </p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8 space-y-4">
          {/* 검색바 */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="템플릿 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                variant={selectedCategory === category.value ? 'default' : 'outline'}
                size="sm"
                className={`h-9 px-4 gap-2 ${
                  selectedCategory === category.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                <span>{category.icon}</span>
                {category.label}
              </Button>
            ))}
          </div>

          {/* 정렬 옵션 */}
          <div className="flex justify-center gap-2">
            {sortOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  variant={sortBy === option.value ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 템플릿 그리드 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedTemplates.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">템플릿을 찾을 수 없습니다</h3>
            <p className="text-muted-foreground">다른 검색어나 카테고리를 시도해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTemplates.map((template) => (
              <div
                key={template.id}
                className="group bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* 템플릿 카드 헤더 */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {template.workflow_shares[0]?.share_title || template.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3" />
                      {template.execution_count || 0}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {template.workflow_shares[0]?.share_description || template.description}
                  </p>

                  {/* 태그 */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          <Tag className="h-2 w-2" />
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{template.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 템플릿 카드 푸터 */}
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {template.profiles?.name || 'Anonymous'}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {template.workflow_shares[0]?.download_count || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {template.execution_count || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/workflow/templates/${template.id}`)}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                    >
                      미리보기
                    </Button>
                    <Button
                      onClick={() => handleForkTemplate(template)}
                      size="sm"
                      className="flex-1 h-8"
                    >
                      🚀 포크하기
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 결과 요약 */}
        {!loading && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            총 {sortedTemplates.length}개의 템플릿을 찾았습니다
          </div>
        )}
      </div>
    </div>
  );
}


