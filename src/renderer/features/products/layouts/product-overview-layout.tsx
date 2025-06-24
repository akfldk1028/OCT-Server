import React, { useState } from 'react';
import { StarIcon, GitFork, ExternalLink, Shield, Package, Code2, AlertCircle } from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useOutletContext,
  useNavigate,
} from "react-router";
import { Button, buttonVariants } from "../../../common/components/ui/button";
import { cn } from "../../../lib/utils";
import { InstallSidebarNew } from "../components/InstallSidebarNew";
import { InitialAvatar } from "../../../common/components/ui/initial-avatar";
import { MCPServerDetailView } from "../types/MCPServerDetailTypes";
import { Badge } from "../../../common/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../common/components/ui/tooltip";

// name에서 이니셜 추출 함수
const generateInitials = (name: string | null): string => {
  if (!name) return '??';
  
  const trimmedName = name.trim();
  
  // 영어/공백으로 구분된 단어들의 경우
  if (trimmedName.includes(' ')) {
    const words = trimmedName.split(' ').filter(word => word.length > 0);
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
  }
  
  // 하이픈이나 언더스코어로 구분된 경우
  if (trimmedName.includes('-') || trimmedName.includes('_')) {
    const separator = trimmedName.includes('-') ? '-' : '_';
    const parts = trimmedName.split(separator).filter(part => part.length > 0);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
  }
  
  // 단일 단어이거나 한국어 등의 경우 첫 2글자
  return trimmedName.substring(0, 2).toUpperCase();
};

// 랜덤 색깔 생성 함수
const generateColor = (name: string | null): string => {
  if (!name) return '#6B7280';
  
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

// 서버 타입에 따른 아이콘과 색상
const getServerTypeInfo = (serverType: string | null) => {
  const type = serverType?.toLowerCase() || '';
  if (type.includes('tool')) return { icon: Code2, color: 'text-blue-600', bg: 'bg-blue-50' };
  if (type.includes('resource')) return { icon: Package, color: 'text-green-600', bg: 'bg-green-50' };
  if (type.includes('integration')) return { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' };
  return { icon: Package, color: 'text-gray-600', bg: 'bg-gray-50' };
};

export default function ProductOverviewLayout() {
  const { product, isLoggedIn } = useOutletContext<{
    product: MCPServerDetailView;
    isLoggedIn: boolean;
  }>();
  
  console.log('🎭 [ProductOverviewLayout] product', product);

  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  console.log('🎭 [ProductOverviewLayout] product install_methods:', product.install_methods);

  // 이니셜과 색깔 생성
  const initials = product.fallback_avatar_initials || generateInitials(product.name);
  const avatarColor = product.fallback_avatar_color || generateColor(product.name);
  
  // 서버 타입 정보
  const serverTypeInfo = getServerTypeInfo(product.server_type);
  const ServerIcon = serverTypeInfo.icon;

  // 안전성 검증 상태
  const isSafetyVerified = product.enhanced_info?.is_safety_verified || false;
  
  // 카테고리와 태그를 배열로 안전하게 처리
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const tags = Array.isArray(product.tags) ? product.tags : [];
  
  // 도구 개수
  const toolCount = product.tool_count || 0;
  
  // detected_tools를 배열로 안전하게 처리
  const detectedTools = Array.isArray(product.detected_tools) ? product.detected_tools : [];

  // 설치하기 버튼 클릭 핸들러
  const handleInstallClick = () => {
    if (!isLoggedIn) {
      navigate('/auth/login');
      return;
    }
    setIsSidebarOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* 헤더 섹션 */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* 아바타 및 기본 정보 */}
          <div className="flex flex-col sm:flex-row gap-6 flex-1">
            <div className="flex justify-center sm:justify-start">
              <div className="size-32 lg:size-40 rounded-2xl overflow-hidden shadow-xl flex items-center justify-center ring-4 ring-background">
                <InitialAvatar
                  initials={initials}
                  colorString={avatarColor}
                  size={160}
                />
              </div>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold">
                  {product.name || 'Product Name'}
                </h1>
                {isSafetyVerified && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1 text-green-600">
                        <Shield className="size-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>안전성 검증 완료</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              {/* 서버 타입 및 카테고리 */}
              <div className="flex flex-wrap items-center gap-2 mb-4 justify-center sm:justify-start">
                <Badge variant="secondary" className={cn(serverTypeInfo.bg, serverTypeInfo.color, "gap-1")}>
                  <ServerIcon className="size-3" />
                  {product.server_type || 'Unknown'}
                </Badge>
                              {categories.map((category: any, idx: number) => (
                <Badge key={idx} variant="outline">{String(category)}</Badge>
              ))}
              </div>

              {/* 설명 */}
              {product.description && (
                <p className="text-muted-foreground mb-4 max-w-2xl">
                  {product.description}
                </p>
              )}
              
              {/* 통계 정보 */}
              <div className="flex flex-wrap gap-4 text-sm justify-center sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <StarIcon className="size-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{product.stars?.toLocaleString() || 0}</span>
                  <span className="text-muted-foreground">stars</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GitFork className="size-4 text-gray-600" />
                  <span className="font-medium">{product.forks?.toLocaleString() || 0}</span>
                  <span className="text-muted-foreground">forks</span>
                </div>
                {toolCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Code2 className="size-4 text-blue-600" />
                    <span className="font-medium">{toolCount}</span>
                    <span className="text-muted-foreground">도구</span>
                  </div>
                )}
                {product.license && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {product.license}
                    </Badge>
                  </div>
                )}
              </div>

              {/* 태그 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tags.map((tag: any, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-52 h-12 font-semibold"
              onClick={handleInstallClick}
            >
              <Package className="size-4 mr-2" />
              설치하기
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full sm:w-52 h-12"
            >
              <Link to={product.github_url || '#'} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4 mr-2" />
                GitHub 저장소
              </Link>
            </Button>

            {product.primary_url && product.primary_url !== product.github_url && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-52 h-12"
              >
                <Link to={product.primary_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4 mr-2" />
                  공식 웹사이트
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="border-b">
          <nav className="flex gap-6">
            <NavLink
              end
              className={({ isActive }) =>
                cn(
                  "pb-3 px-1 border-b-2 font-medium text-sm transition-colors",
                  isActive 
                    ? "border-primary text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )
              }
              to={`/products/${product.id}/overview`}
            >
              개요
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                cn(
                  "pb-3 px-1 border-b-2 font-medium text-sm transition-colors",
                  isActive 
                    ? "border-primary text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )
              }
              to={`/products/${product.id}/overview/details`}
            >
              상세 정보
            </NavLink>
            {product.detected_tools && detectedTools.length > 0 && (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "pb-3 px-1 border-b-2 font-medium text-sm transition-colors",
                    isActive 
                      ? "border-primary text-foreground" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )
                }
                to={`/products/${product.id}/overview/tools`}
              >
                도구 ({detectedTools.length})
              </NavLink>
            )}
          </nav>
        </div>

        {/* 콘텐츠 영역 */}
        <div>
          <Outlet
            context={{
              product: product,
              isLoggedIn: isLoggedIn
            }}
          />
        </div>

        {/* 설치 사이드바 */}
        {isSidebarOpen && (
          <InstallSidebarNew
            product={product as any}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}