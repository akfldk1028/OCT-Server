import {Link, type MetaFunction, useLoaderData, useOutletContext} from "react-router";
import { ProductCard } from "../../features/products/components/product-card";
// import { PostCard } from "~/features/community/components/post-card";
// import { IdeaCard } from "~/features/ideas/components/idea-card";
// import { JobCard } from "~/features/jobs/components/job-card";
// import { TeamCard } from "~/features/teams/components/team-card";
import { getProductsBypopularity } from "../../features/products/queries";
// import { DateTime, Settings } from "luxon";
// import { getPosts } from "~/features/community/queries";
// import { getGptIdeas } from "~/features/ideas/queries";
// import { getJobs } from "~/features/jobs/queries";
// import { getTeams } from "~/features/teams/queries";
// import { makeSSRClient } from "~/supa-client";
import FlickeringGrid from "../components/ui/flickering-grid";
import { BlurFade } from "../components/ui/blur-fade";
import { VelocityScroll } from "../components/ui/scroll-based-velocity";
import { Marquee } from "../components/ui/marquee";
import { RetroGrid } from "../components/ui/retro-grid";
import { MagicCard } from "../components/ui/magic-card";
import { Ripple } from "../components/ui/ripple";
import { supabase } from "../../supa-client";
import { Button } from "../components/ui/button";
import type { Database } from "../../supa-client";
import { InitialAvatar } from "../components/ui/initial-avatar";
import { type LoaderFunctionArgs } from "react-router";
import {  IS_ELECTRON, IS_WEB } from '../../utils/environment';
import { Server, Play, Eye, Clock, Edit, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { ensureClaudeApi } from "../../lib/utils";
import { MoreVertical, Trash2, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
// export type HomePageLoaderData = {
//   products: Product[];
//   posts: Post[];
//   ideas: Idea[];
//   jobs: Job[];
//   teams: Team[];
// };


export type HomePageLoaderData = {
  products: any;
};

// props 타입 수동 정의
type ComponentProps = {
  loaderData: HomePageLoaderData;
};

// Define the product type based on the view
type Product = Database["public"]["Views"]["github_popularity_view"]["Row"];

export const meta: MetaFunction = () => {
  return [
    { title: "Home | wemake" },
    { name: "description", content: "Welcome to wemake" },
  ];
};

export const loader = async ({  request } : LoaderFunctionArgs) => {
  try {
    console.log("🔥 [HomePage Loader] 제품 데이터만 로드 (나머지는 root.tsx에서)");
    
    // 🔥 제품 데이터만 로드 (서버/클라이언트/워크플로우는 root.tsx에서 가져옴)
    const products = await getProductsBypopularity(supabase as any, { 
      limit: 100,
    });
    
    console.log('🔥 [HomePage Loader] 로드된 데이터:', {
      products: products?.length || 0
    });
    
    return {
      products,
    };
  } catch (error) {
    console.error("Home page loader error:", error);
    if (error instanceof Error) {
       console.error("Error details:", error.message, error.stack);
    }
    return {
      products: [],
    };
  }
};









type ServerTabGridProps = { 
  claudeServers: string[], 
  setClaudeServers: (servers: string[]) => void,
  workflowClientType?: string,
  targetClients?: string[],
  realServers?: any[], // 🔥 실제 서버 데이터
  realClients?: any[],  // 🔥 실제 클라이언트 데이터
  workflows?: any[]     // 🔥 워크플로우 데이터
};

function ServerTabGrid({ 
  claudeServers = [], 
  setClaudeServers, 
  workflowClientType = 'all',
  targetClients = [],
  realServers = [],
  realClients = [],
  workflows = []
}: ServerTabGridProps) {
  // 🔥 더보기 상태 관리
  const [showAllWorkflows, setShowAllWorkflows] = useState(false);
  
  // 🔥 워크플로우를 클라이언트 타입별로 분류
  const getLocalWorkflows = () => {
    return workflows.filter(workflow => 
      workflow.client_type === 'local' || workflow.client_type === 'mixed'
    );
  };

  const getClaudeWorkflows = () => {
    return workflows.filter(workflow => 
      workflow.client_type === 'claude_desktop' || workflow.client_type === 'mixed'
    );
  };

  const getOpenAIWorkflows = () => {
    return workflows.filter(workflow => 
      workflow.client_type === 'openai' || workflow.client_type === 'mixed'
    );
  };

  // 🔥 모든 서버 탭 정의 (워크플로우 데이터 사용)
  const allServerTabs = [
    {
      label: 'Local',
      key: 'my',
      clientType: 'local',
      workflows: getLocalWorkflows(),
      icon: '💻',
      color: 'hsl(var(--primary))',
      description: '로컬 환경에서 실행되는 워크플로우'
    },
    {
      label: 'Claude',
      key: 'claude',
      clientType: 'claude_desktop',
      workflows: getClaudeWorkflows(),
      icon: '🧠',
      color: 'hsl(var(--chart-2))',
      description: 'Claude Desktop과 연동된 워크플로우'
    },
    {
      label: 'OpenAI/Cursor',
      key: 'company',
      clientType: 'openai',
      workflows: getOpenAIWorkflows(),
      icon: '🔧',
      color: 'hsl(var(--chart-1))',
      description: 'OpenAI API를 사용하는 워크플로우'
    },
  ];

  const getFilteredTabs = () => {
    if (workflowClientType === 'all') {
      return allServerTabs;
    }
    
    return allServerTabs.filter(tab => {
      if (workflowClientType === 'mixed') {
        return targetClients.some(client => {
          const name = client.toLowerCase();
          let clientType = 'local';
          if (name.includes('claude')) clientType = 'claude_desktop';
          else if (name.includes('openai') || name.includes('gpt') || name.includes('cursor')) clientType = 'openai';
          
          return clientType === tab.clientType;
        });
      }
      
      return tab.clientType === workflowClientType;
    });
  };

  const getInitialActiveTab = () => {
    const filteredTabs = getFilteredTabs();
    if (filteredTabs.length === 0) return '';
    
    if (workflowClientType !== 'all') {
      const targetTab = filteredTabs.find(tab => tab.clientType === workflowClientType);
      if (targetTab) return targetTab.key;
    }
    
    return filteredTabs[0].key;
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialActiveTab());

  useEffect(() => {
    setActiveTab(getInitialActiveTab());
  }, [workflowClientType, targetClients]);

  const filteredTabs = getFilteredTabs();
  const currentTab = filteredTabs.find(tab => tab.key === activeTab);

  if (filteredTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/70 rounded-3xl flex items-center justify-center shadow-2xl relative">
            <Server className="h-12 w-12 text-white" />
            {/* 글로우 효과 */}
            <div className="absolute inset-0 rounded-3xl blur-xl opacity-40 animate-pulse bg-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-3">워크플로우가 없습니다</h3>
        <p className="text-muted-foreground mb-8">
          새로운 워크플로우를 만들어서 자동화를 시작해보세요! ✨
        </p>
        <Link to="/jobs/node">
          <Button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
            {/* 버튼 글로우 */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-transparent to-primary opacity-20 group-hover:opacity-30 transition-opacity" />
            <span className="relative z-10">✨ 새 워크플로우 만들기</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* 🎨 심플한 탭 헤더 */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {filteredTabs.map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tab.workflows.length})
          </button>
        ))}
      </div>

      {/* 🎯 워크플로우 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 조건부 표시: showAllWorkflows가 true면 전체, false면 8개까지 */}
        {(showAllWorkflows 
          ? currentTab?.workflows 
          : currentTab?.workflows.slice(0, 8)
        )?.map((workflow) => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        )) || []}
      </div>
      
      {/* 더보기/간략히 버튼 */}
      {currentTab && currentTab.workflows.length > 8 && (
        <div className="flex justify-center mt-6">
          <Button 
            variant="outline"
            onClick={() => setShowAllWorkflows(!showAllWorkflows)}
            className="px-6 py-2"
          >
            {showAllWorkflows 
              ? `간략히 보기 (${currentTab.workflows.length}개 중 8개만)` 
              : `더보기 (+${currentTab.workflows.length - 8}개)`
            }
          </Button>
        </div>
      )}

              {/* 빈 상태 - 블링블링 */}
        {currentTab && currentTab.workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div 
                className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl relative"
                style={{ backgroundColor: currentTab.color }}
              >
                <span className="text-4xl">{currentTab.icon}</span>
                {/* 글로우 효과 */}
                <div 
                  className="absolute inset-0 rounded-3xl blur-xl opacity-40 animate-pulse"
                  style={{ backgroundColor: currentTab.color }}
                />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3">
              {currentTab.label} 워크플로우가 없습니다
            </h3>
            <p className="text-muted-foreground mb-8">
              새로운 워크플로우를 만들어서 자동화를 시작해보세요! ✨
            </p>
            <Link to="/jobs/node">
              <Button 
                className="text-white px-8 py-3 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
                style={{ backgroundColor: currentTab.color }}
              >
                {/* 버튼 글로우 */}
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{ 
                    background: `linear-gradient(45deg, ${currentTab.color}, transparent, ${currentTab.color})`
                  }}
                />
                <span className="relative z-10">✨ 새 워크플로우 만들기</span>
              </Button>
            </Link>
          </div>
        )}
    </div>
  );
}

// 🎴 모던 워크플로우 카드 컴포넌트
function WorkflowCard({ workflow }: { workflow: any }) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '날짜 없음';
    }
  };

  const getStatusConfig = (status: string) => {
    const statusMap = {
      draft: { 
        label: '초안', 
        className: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: '📝'
      },
      active: { 
        label: '활성', 
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: '🟢'
      },
      archived: { 
        label: '보관', 
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: '📦'
      },
      shared: { 
        label: '공유', 
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: '🔗'
      },
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.draft;
  };

  const getClientTypeConfig = (clientType: string) => {
    const typeMap = {
      local: { 
        label: 'Local', 
        className: 'bg-primary/10 text-primary',
        icon: <Server className="h-10 w-10" style={{ color: 'hsl(var(--primary))' }} />,
        color: 'hsl(var(--primary))'
      },
      claude_desktop: { 
        label: 'Claude', 
        className: 'bg-chart-2/10 text-chart-2',
        icon: <div className="text-4xl font-bold" style={{ color: 'hsl(var(--chart-2))' }}>C</div>,
        color: 'hsl(var(--chart-2))'
      },
      openai: { 
        label: 'OpenAI', 
        className: 'bg-chart-1/10 text-chart-1',
        icon: <div className="text-2xl font-bold" style={{ color: 'hsl(var(--chart-1))' }}>AI</div>,
        color: 'hsl(var(--chart-1))'
      },
      mixed: { 
        label: 'Mixed', 
        className: 'bg-chart-3/10 text-chart-3',
        icon: <div className="grid grid-cols-2 gap-1 w-8 h-8">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-3))' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-1))' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2))' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
        </div>,
        color: 'hsl(var(--chart-3))'
      },
      unknown: { 
        label: 'Unknown', 
        className: 'bg-muted text-muted-foreground',
        icon: <div className="text-3xl" style={{ color: 'hsl(var(--muted-foreground))' }}>?</div>,
        color: 'hsl(var(--muted-foreground))'
      },
    };
    
    return typeMap[clientType as keyof typeof typeMap] || typeMap.unknown;
  };

  const statusConfig = getStatusConfig(workflow.status);
  const clientConfig = getClientTypeConfig(workflow.client_type);

  const handleRunWorkflow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // TODO: 워크플로우 실행 로직 구현
    console.log('🚀 워크플로우 실행:', workflow.name);
    
    // 나중에 실제 실행 API 호출
    // await executeWorkflow(workflow.id);
  };

  return (
    <div className="group relative">
      {/* 깔끔한 카드 */}
      <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all duration-200 hover:shadow-md h-[260px] flex flex-col">
        
        {/* 상단: 타입 라벨 */}
        <div className="flex justify-end mb-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${clientConfig.className}`}>
            {clientConfig.label}
          </span>
        </div>

        {/* 중앙: 큰 아이콘 */}
        <div className="flex items-center justify-center mb-3">
          {clientConfig.icon}
        </div>

        {/* 제목 */}
        <h3 className="font-semibold text-sm text-card-foreground text-center mb-2 px-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'keep-all',
          lineHeight: '1.3',
          height: '2.6rem'
        }}>
          {workflow.name || '제목 없음'}
        </h3>

        {/* 설명 (있으면) */}
        {workflow.description && (
          <p className="text-xs text-muted-foreground text-center mb-2 px-1" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'keep-all',
            lineHeight: '1.2',
            height: '2.4rem'
          }}>
            {workflow.description}
          </p>
        )}

        {/* 상태와 날짜 */}
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground mb-2">
          <span className={`px-1.5 py-0.5 rounded ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
          <span>•</span>
          <span>{formatDate(workflow.updated_at)}</span>
        </div>

        {/* 클라이언트 정보 (있으면) */}
        {workflow.target_clients && workflow.target_clients.length > 0 && (
          <div className="text-xs text-muted-foreground text-center mb-3">
            🔗 {workflow.target_clients.length}개 연결
          </div>
        )}

        {/* Spacer - 남은 공간 차지 */}
        <div className="flex-1" />

        {/* 액션 버튼 - 하단 고정 */}
        <div className="flex items-center space-x-2 mt-auto">
          <button
            onClick={handleRunWorkflow}
            className="flex-1 text-white px-3 py-2 rounded font-medium text-sm transition-colors hover:opacity-90 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: clientConfig.color }}
          >
            <Play className="h-3 w-3" />
            실행
          </button>
          
          <Link 
            to={`/jobs/node?workflow=${workflow.id}`}
            className="px-2.5 py-2 border border-border text-muted-foreground rounded text-sm hover:bg-accent transition-colors"
          >
            <Edit className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// 🎴 Preview Card Components
function WorkflowPreviewCard({ 
  title, 
  description, 
  usage, 
  category, 
  icon 
}: { 
  title: string; 
  description: string; 
  usage: number; 
  category: string; 
  icon: string; 
}) {
  return (
    <div className="group relative">
      <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all duration-200 hover:shadow-md h-[260px] flex flex-col">
        
        {/* 상단: 카테고리 라벨 */}
        <div className="flex justify-end mb-2">
          <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
            {category}
          </span>
        </div>

        {/* 중앙: 큰 아이콘 */}
        <div className="flex items-center justify-center mb-3">
          <span className="text-4xl">{icon}</span>
        </div>

        {/* 제목 */}
        <h3 className="font-semibold text-sm text-card-foreground text-center mb-2 px-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'keep-all',
          lineHeight: '1.3',
          height: '2.6rem'
        }}>
          {title}
        </h3>

        {/* 설명 */}
        <p className="text-xs text-muted-foreground text-center mb-2 px-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'keep-all',
          lineHeight: '1.2',
          height: '2.4rem'
        }}>
          {description}
        </p>

        {/* 사용량 */}
        <div className="text-xs text-muted-foreground text-center mb-3">
          👥 {usage.toLocaleString()} users
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 액션 버튼 */}
        <div className="flex items-center space-x-2 mt-auto">
          <button
            className="flex-1 bg-primary text-white px-3 py-2 rounded font-medium text-sm transition-colors hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            <Play className="h-3 w-3" />
            Use Template
          </button>
          
          <button className="px-2.5 py-2 border border-border text-muted-foreground rounded text-sm hover:bg-accent transition-colors">
            <Eye className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolPreviewCard({ 
  title, 
  description, 
  addedDays, 
  author, 
  downloads, 
  icon 
}: { 
  title: string; 
  description: string; 
  addedDays: number; 
  author: string; 
  downloads: number; 
  icon: string; 
}) {
  return (
    <div className="group relative">
      <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all duration-200 hover:shadow-md h-[260px] flex flex-col">
        
        {/* 상단: 새로운 라벨 */}
        <div className="flex justify-end mb-2">
          <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border-emerald-200">
            ✨ {addedDays} days ago
          </span>
        </div>

        {/* 중앙: 큰 아이콘 */}
        <div className="flex items-center justify-center mb-3">
          <span className="text-4xl">{icon}</span>
        </div>

        {/* 제목 */}
        <h3 className="font-semibold text-sm text-card-foreground text-center mb-2 px-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'keep-all',
          lineHeight: '1.3',
          height: '2.6rem'
        }}>
          {title}
        </h3>

        {/* 설명 */}
        <p className="text-xs text-muted-foreground text-center mb-2 px-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'keep-all',
          lineHeight: '1.2',
          height: '2.4rem'
        }}>
          {description}
        </p>

        {/* 작성자와 다운로드 */}
        <div className="text-xs text-muted-foreground text-center mb-3">
          👤 {author} • ⬇️ {downloads}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 액션 버튼 */}
        <div className="flex items-center space-x-2 mt-auto">
          <button
            className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded font-medium text-sm transition-colors hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3 w-3" />
            Install
          </button>
          
          <button className="px-2.5 py-2 border border-border text-muted-foreground rounded text-sm hover:bg-accent transition-colors">
            <Eye className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GuidePreviewCard({ 
  title, 
  description, 
  readTime, 
  difficulty, 
  icon 
}: { 
  title: string; 
  description: string; 
  readTime: string; 
  difficulty: string; 
  icon: string; 
}) {
  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-700 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="group relative">
      <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all duration-200 hover:shadow-md h-[260px] flex flex-col">
        
        {/* 상단: 난이도 라벨 */}
        <div className="flex justify-end mb-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
        </div>

        {/* 중앙: 큰 아이콘 */}
        <div className="flex items-center justify-center mb-3">
          <span className="text-4xl">{icon}</span>
        </div>

        {/* 제목 */}
        <h3 className="font-semibold text-sm text-card-foreground text-center mb-2 px-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'keep-all',
          lineHeight: '1.3',
          height: '2.6rem'
        }}>
          {title}
        </h3>

        {/* 설명 */}
        <p className="text-xs text-muted-foreground text-center mb-2 px-1" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'keep-all',
          lineHeight: '1.2',
          height: '2.4rem'
        }}>
          {description}
        </p>

        {/* 읽기 시간 */}
        <div className="text-xs text-muted-foreground text-center mb-3">
          ⏱️ {readTime}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 액션 버튼 */}
        <div className="flex items-center space-x-2 mt-auto">
          <button
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded font-medium text-sm transition-colors hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            📖 Read Guide
          </button>
          
          <button className="px-2.5 py-2 border border-border text-muted-foreground rounded text-sm hover:bg-accent transition-colors">
            <Clock className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 🔥 Outlet context 타입 정의 (root.tsx에서 전달되는 데이터)
type OutletContext = {
  isLoggedIn: boolean;
  name: string;
  userId: string;
  username: string;
  avatar: string | null;
  email: string;
  servers: any[];
  clients: any[];
  workflows: any[];
};

export default  function HomePage() {
  const { products } = useLoaderData() as HomePageLoaderData;
  
  // 🔥 package.json에서 동적으로 버전 가져오기
  const appVersion = process.env.APP_VERSION || '0.0.1';
  // 🔥 root.tsx에서 전달된 모든 데이터 사용
  const { isLoggedIn, userId, servers, clients, workflows } = useOutletContext<OutletContext>();
  const [claudeServers, setClaudeServers] = useState<string[]>([]);
  
  // 🔥 워크플로우 클라이언트 타입 상태 관리
  const [workflowClientType, setWorkflowClientType] = useState<string>('all');
  const [targetClients, setTargetClients] = useState<string[]>([]);

  // 🔥 로드된 데이터 디버깅
  console.log('🏠 [HomePage] 로드된 데이터:', {
    products: products?.length || 0,
    servers: servers?.length || 0,
    clients: clients?.length || 0,
    workflows: workflows?.length || 0
  });

  useEffect(() => {
    if ((window as any).claudeAPI) {
      (window as any).claudeAPI.getAllServers().then(setClaudeServers);
    }
  }, []);

  // 🔥 워크플로우 클라이언트 타입 변경 핸들러 (다른 컴포넌트에서 호출 가능)
  const handleWorkflowClientTypeChange = (clientType: string, clients: string[]) => {
    console.log('🎯 [HomePage] 워크플로우 클라이언트 타입 변경:', { clientType, clients });
    setWorkflowClientType(clientType);
    setTargetClients(clients);
  };

  // 🔥 전역적으로 접근 가능하도록 window 객체에 등록 (필요시)
  useEffect(() => {
    (window as any).setWorkflowClientType = handleWorkflowClientTypeChange;
    return () => {
      delete (window as any).setWorkflowClientType;
    };
  }, []);

  // Log the fetched products data to the console
  console.log("Fetched Products:", products);

  return (
    <>
      <div className="space-y-32 pb-20 w-full">
        {IS_WEB ? (
          <div className="relative h-[500px] w-full flex justify-center items-center bg-background overflow-hidden ">
            <FlickeringGrid
              className="z-0 absolute inset-0 size-full"
              squareSize={4}
              gridGap={5}
              color="#e11d48"
              maxOpacity={0.5}
              flickerChance={0.2}
            />
            <div className="flex flex-col text-center md:space-y-5 items-center">
              <BlurFade delay={0.25} duration={1} inView>
                <h2 className="font-bold text-5xl md:text-8xl">
                  welcome to Context
                </h2>
              </BlurFade>
              <BlurFade delay={1} duration={1} inView>
                <span className="text-2xl md:text-5xl">
                  the home of MCP
                </span>
              </BlurFade>
            </div>
          </div>
        ) : (
          <ServerTabGrid 
            claudeServers={claudeServers} 
            setClaudeServers={setClaudeServers}
            workflowClientType={workflowClientType}
            targetClients={targetClients}
            realServers={servers}
            realClients={clients}
            workflows={workflows}
          />
        )}

               {/* 다운로드 네비게이션: 웹에서만 노출 */}
               {IS_WEB && (
                  <section className="w-full flex justify-center mt-[-80px] mb-12 z-10 relative">
                    <div className="flex flex-row gap-10 items-center">
                      {/* Mac 버튼 */}
                      <div className="relative">
                        {/* 버튼에 딱 맞는 Glow */}
                        <div
                          aria-hidden
                          className="absolute inset-0 rounded-2xl blur-md opacity-80
                                     bg-gradient-to-r from-[#e11d48] via-[#f43f5e] to-[#a21caf]
                                     animate-pulse pointer-events-none z-[-1]"
                        />
                        <Button
                          asChild
                          className="gap-2 px-12 py-8 text-base font-semibold bg-primary text-white hover:bg-primary/90 shadow-none transition-shadow relative"
                        >
                          <a
                            href={`https://pub-453f6f0e9aab4be4a88dd25cff24d9bd.r2.dev/downloads/OCT-Server-Setup-${appVersion}.exe`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg className="inline-block" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="20" width="20"><path d="M11.6734 7.22198C10.7974 7.22198 9.44138 6.22598 8.01338 6.26198C6.12938 6.28598 4.40138 7.35397 3.42938 9.04597C1.47338 12.442 2.92538 17.458 4.83338 20.218C5.76938 21.562 6.87338 23.074 8.33738 23.026C9.74138 22.966 10.2694 22.114 11.9734 22.114C13.6654 22.114 14.1454 23.026 15.6334 22.99C17.1454 22.966 18.1054 21.622 19.0294 20.266C20.0974 18.706 20.5414 17.194 20.5654 17.11C20.5294 17.098 17.6254 15.982 17.5894 12.622C17.5654 9.81397 19.8814 8.46998 19.9894 8.40998C18.6694 6.47798 16.6414 6.26198 15.9334 6.21398C14.0854 6.06998 12.5374 7.22198 11.6734 7.22198ZM14.7934 4.38998C15.5734 3.45398 16.0894 2.14598 15.9454 0.849976C14.8294 0.897976 13.4854 1.59398 12.6814 2.52998C11.9614 3.35798 11.3374 4.68998 11.5054 5.96198C12.7414 6.05798 14.0134 5.32598 14.7934 4.38998Z"></path></svg>
                            Windows용 다운로드 (Mac 준비중)
                          </a>
                        </Button>
                      </div>
                      {/* Windows 버튼 */}
                      <div className="relative">
                        {/* 버튼에 딱 맞는 Glow */}
                        <div
                          aria-hidden
                          className="absolute inset-0 rounded-2xl blur-md opacity-80
                                     bg-gradient-to-r from-[#e11d48] via-[#f43f5e] to-[#a21caf]
                                     animate-pulse pointer-events-none z-[-1]"
                        />
                        <Button
                          asChild
                          variant="outline"
                          className="gap-2 px-12 py-8 text-base font-semibold border-primary text-primary hover:bg-primary/10 shadow-none transition-shadow relative bg-white/80 dark:bg-zinc-900/80"
                        >
                          <a
                            href={`https://pub-453f6f0e9aab4be4a88dd25cff24d9bd.r2.dev/downloads/OCT-Server-Setup-${appVersion}.exe`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg className="inline-block" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="20" width="20"><path d="M11.501 3V11.5H3.00098V3H11.501ZM11.501 21H3.00098V12.5H11.501V21ZM12.501 3H21.001V11.5H12.501V3ZM21.001 12.5V21H12.501V12.5H21.001Z"></path></svg>
                            Windows용 다운로드
                          </a>
                        </Button>
                      </div>
                    </div>
                  </section>
                )}
        {IS_WEB && (
          <div className="relative">
            <VelocityScroll
              defaultVelocity={1}
              className="font-display text-center text-5xl font-bold tracking-[-0.02em] md:leading-[5rem]"
              numRows={1}
            >
              <div className="flex items-center justify-center gap-4 p-4 flex-nowrap relative z-10">
                {products && products.length > 0 ? (
                  products.map((product: Product, index: number) => (
                    <InitialAvatar
                      key={product.unique_id ?? index}
                      initials={product.fallback_avatar_initials}
                      colorString={product.fallback_avatar_color}
                      size={60}
                    />
                  ))
                ) : (
                  <span>Loading Avatars...</span>
                )}
              </div>
            </VelocityScroll>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background"></div>
          </div>
        )}


        <BlurFade delay={0.25} duration={1} inView>
          <div className="grid grid-cols-1 w-full md:grid-cols-3 gap-4">
            <div className="space-y-2.5 text-center md:text-left md:space-y-0">
              <h2 className="text-3xl md:text-5xl font-bold leading-10 md:leading-tight tracking-tight">
                Today's Products
              </h2>
              <p className="text-lg md:text-xl font-light text-foreground">
                The best products made by our community today.
              </p>
              <Button variant="link" asChild className="text-lg p-0">
                <Link to="/products/leaderboards">
                  Explore all products &rarr;
                </Link>
              </Button>
            </div>
            {products.map((product: Product, index: number) => (
              <ProductCard
                key={product.unique_id ?? index}
                id={product.id}
                uniqueId={product.unique_id}
                name={product.name}
                reviewsCount={0}
                viewsCount={0}
                isUpvoted={false}
                promotedFrom={null}
                stars={product.stars}
                forks={product.forks}
                githubUrl={product.github_url}
                owner={product.owner}
                repoName={product.repo_name}
                localImagePath={(product as any).local_image_path || null}
              />
            ))}
          </div>
        </BlurFade>
        
        {/* 🔥 Popular Workflows Section */}
        <BlurFade delay={0.4} duration={1} inView>
          <div className="grid grid-cols-1 w-full md:grid-cols-3 gap-4">
            <div className="space-y-2.5 text-center md:text-left md:space-y-0">
              <h2 className="text-3xl md:text-5xl font-bold leading-10 md:leading-tight tracking-tight">
                Popular Workflows
              </h2>
              <p className="text-lg md:text-xl font-light text-foreground">
                Discover the most used automation workflows by our community
              </p>
              <Button variant="link" asChild className="text-lg p-0">
                <Link to="/jobs/node">
                  Create your workflow &rarr;
                </Link>
              </Button>
            </div>
            {/* Sample workflow cards */}
            <WorkflowPreviewCard
              title="AI Code Review"
              description="Automatically review code with Claude and generate suggestions"
              usage={1250}
              category="Development"
              icon="🤖"
            />
            <WorkflowPreviewCard
              title="Smart Documentation"
              description="Generate and maintain docs from your codebase automatically"
              usage={890}
              category="Documentation"
              icon="📚"
            />
          </div>
        </BlurFade>

        {/* 🛠️ New Tools Section */}
        <BlurFade delay={0.6} duration={1} inView>
          <div className="grid grid-cols-1 w-full md:grid-cols-3 gap-4">
            <div className="space-y-2.5 text-center md:text-left md:space-y-0">
              <h2 className="text-3xl md:text-5xl font-bold leading-10 md:leading-tight tracking-tight">
                New Tools
              </h2>
              <p className="text-lg md:text-xl font-light text-foreground">
                Latest MCP servers and extensions added to our ecosystem
              </p>
              <Button variant="link" asChild className="text-lg p-0">
                <Link to="/products">
                  Browse all tools &rarr;
                </Link>
              </Button>
            </div>
            {/* Sample tool cards */}
            <ToolPreviewCard
              title="Weather API Server"
              description="Get real-time weather data with advanced forecasting"
              addedDays={2}
              author="weather-team"
              downloads={156}
              icon="🌤️"
            />
            <ToolPreviewCard
              title="Database Analyzer"
              description="Analyze and optimize your database performance automatically"
              addedDays={5}
              author="db-experts"
              downloads={89}
              icon="📊"
            />
          </div>
        </BlurFade>

        {/* 📚 MCP Guide Section */}
        <BlurFade delay={0.8} duration={1} inView>
          <div className="grid grid-cols-1 w-full md:grid-cols-3 gap-4">
            <div className="space-y-2.5 text-center md:text-left md:space-y-0">
              <h2 className="text-3xl md:text-5xl font-bold leading-10 md:leading-tight tracking-tight">
                MCP Guide
              </h2>
              <p className="text-lg md:text-xl font-light text-foreground">
                Step-by-step guides to master the Model Context Protocol
              </p>
              <Button variant="link" asChild className="text-lg p-0">
                <Link to="/guide">
                  View all guides &rarr;
                </Link>
              </Button>
            </div>
            {/* Sample guide cards */}
            <GuidePreviewCard
              title="Getting Started"
              description="Learn the basics of MCP and set up your first server"
              readTime="5 min read"
              difficulty="Beginner"
              icon="🚀"
            />
            <GuidePreviewCard
              title="Advanced Workflows"
              description="Build complex automation with multiple MCP servers"
              readTime="15 min read"
              difficulty="Advanced"
              icon="⚡"
            />
          </div>
        </BlurFade>
        


        <BlurFade delay={0.25} duration={1} inView>
          <div className="rounded-lg border overflow-hidden -mt-20 shadow-xl group">
            <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden">
              <div className="flex relative z-10 bg-background w-full justify-center items-center flex-col -mt-24">
                <h2 className="md:text-5xl text-3xl font-bold leading-tight tracking-tight ">
                  MCP Guide
                </h2>
                <p className="max-w-2xl md:text-xl font-light text-foreground">
                  How to start a project with MCP
                </p>
                <Button variant="link" asChild className="text-lg pl-0">
                  <Link to="/cofounders" className="pl-0">
                    Start a Project &rarr;
                  </Link>
                </Button>
              </div>
              <RetroGrid />
            </div>
   
          </div>
        </BlurFade>
        {/* <BlurFade delay={0.25} duration={1} inView>
          <div className="md:-mt-44 overflow-hidden ">
            <div className="flex h-[75vh] relative flex-col justify-center items-center text-center md:text-left">
              <h2 className="md:text-5xl text-3xl font-bold leading-tight tracking-tight ">
                MCP 개발 기회
              </h2>
              <p className="max-w-2xl md:text-xl font-light text-foreground">
                MCP 생태계에서 새로운 커리어를 시작하세요
              </p>
              <Button variant="link" asChild className="text-lg z-10 md:pl-0">
                <Link to="/jobs">개발 기회 보기 &rarr;</Link>
              </Button>
              <Ripple className="bg-transparent rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 -mt-32 md:-mt-60 z-10 gap-4">

            </div>
          </div>
        </BlurFade> */}
      </div>
    </>
  );
}
