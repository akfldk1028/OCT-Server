import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useChatCreation } from './chat/useChatCreation';
import {
  Hash,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Bell,
  Search,
  Layers,
  Server,
  Settings,
  Play,
  Type,
  CheckCircle,
  Palette,
  Image,
  Hash as Counter,
  Brain,
  Code,
  Database,
  Wrench,
  Cloud,
  Bot,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDnD } from '../../features/server/hook/DnDContext';
import { ChatList } from './chat/index';

interface ChannelSidebarProps {
  className?: string;
  selectedMenu?: string | null; // 🔥 선택된 메뉴에 따라 내용 변경
  servers?: any[]; // 🔥 서버 데이터
  clients?: any[]; // 🔥 클라이언트 데이터
  categories?: Array<{ id: number; name: string; description: string }>; // 🔥 동적 카테고리 데이터
  onNodeDragStart?: (event: React.DragEvent, nodeType: string) => void; // 🔥 노드 드래그 핸들러
  isLoadingServers?: boolean;  // 🔥 새로 추가: 로딩 상태 props
  isLoadingClients?: boolean;  // 새로 추가
  isLoadingWorkflows?: boolean;  // 새로 추가
}

// 🔥 노드 타입 정의 (Lucide 아이콘 사용)
const nodeTypes = [
  {
    type: 'trigger',
    label: 'START TRIGGER',
    color: 'bg-primary',
    icon: <Play size={20} />,
  },
  {
    type: 'text',
    label: 'Text Node',
    color: 'bg-chart-1',
    icon: <Type size={20} />,
  },
  {
    type: 'result',
    label: 'Result Node',
    color: 'bg-chart-2',
    icon: <CheckCircle size={20} />,
  },
  {
    type: 'color',
    label: 'Color Picker',
    color: 'bg-chart-3',
    icon: <Palette size={20} />,
  },
  {
    type: 'image',
    label: 'Image Node',
    color: 'bg-chart-4',
    icon: <Image size={20} />,
  },
  {
    type: 'counter',
    label: 'Counter Node',
    color: 'bg-chart-5',
    icon: <Counter size={20} />,
  },
];

export default function ChannelSidebar({ 
  className, 
  selectedMenu, 
  servers = [], 
  clients = [], 
  categories = [], 
  onNodeDragStart, 
  isLoadingServers = false,
  isLoadingClients = false,  // 🔥 기본값 추가
  isLoadingWorkflows = false  // 🔥 기본값 추가
}: ChannelSidebarProps) {
  console.log('🚀 [ChannelSidebar] 렌더링됨!', {
    서버개수: servers.length,
    선택된메뉴: selectedMenu,
    서버데이터: servers,
    servers타입: typeof servers,
    servers배열여부: Array.isArray(servers),
    isLoadingServers: isLoadingServers, // 🔥 새로 추가: 로딩 상태 확인 
    clients개수: clients.length,
    categories개수: categories.length,
    onNodeDragStart: onNodeDragStart,
    className: className,
    selectedMenu: selectedMenu,
    servers: servers,
    clients: clients,
  });
  
  const [sectionsExpanded, setSectionsExpanded] = useState<Record<string, boolean>>({
    '0': true,
    '1': true,
    'nodeEditor': true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNodeTab, setActiveNodeTab] = useState<'toolbox' | 'client' | 'server'>('toolbox');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true); // 🔥 초기 로딩 상태
  const navigate = useNavigate();
  const { createNewChat } = useChatCreation();

  // 🔥 DnD 훅 사용
  const [_, setType] = useDnD();

  // 🔥 서버 설치/제거 이벤트 리스너 추가
  useEffect(() => {
    const handleServerInstalled = (event: any) => {
      console.log('🔔 [ChannelSidebar] 서버 설치 이벤트 수신:', event.detail);
      setRefreshTrigger(prev => prev + 1);
      // 추가로 약간의 딜레이 후 한 번 더 트리거 (DB 동기화 대기)
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 2000);
    };

    const handleServerUninstalled = (event: any) => {
      console.log('🔔 [ChannelSidebar] 서버 제거 이벤트 수신:', event.detail);
      setRefreshTrigger(prev => prev + 1);
      // 추가로 약간의 딜레이 후 한 번 더 트리거 (DB 동기화 대기)
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 2000);
    };

    // 이벤트 리스너 등록
    window.addEventListener('mcp-server-installed', handleServerInstalled);
    window.addEventListener('mcp-server-uninstalled', handleServerUninstalled);

    console.log('🔔 [ChannelSidebar] 서버 이벤트 리스너 등록 완료');

    // 정리 함수
    return () => {
      window.removeEventListener('mcp-server-installed', handleServerInstalled);
      window.removeEventListener('mcp-server-uninstalled', handleServerUninstalled);
      console.log('🔔 [ChannelSidebar] 서버 이벤트 리스너 제거 완료');
    };
  }, []);

  // 🔥 초기 로딩 상태 관리
  useEffect(() => {
    // 서버 데이터가 로드되면 로딩 해제
    if (servers.length > 0 || refreshTrigger > 0) {
      setInitialLoading(false);
    }
    // 2초 후에는 무조건 로딩 해제 (실제로 서버가 없는 경우)
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [servers.length, refreshTrigger]);

  // 🔥 강화된 디버깅 로그 (refreshTrigger 포함)
  console.log('🔍 [ChannelSidebar] 데이터 확인:', {
    serversLength: servers.length,
    clientsLength: clients.length,
    selectedMenu,
    activeNodeTab,
    refreshTrigger, // 🔥 새로고침 트리거 상태 추가
    servers: servers.slice(0, 2), // 처음 2개만 로그
    clients: clients.slice(0, 2), // 처음 2개만 로그
    timestamp: new Date().toISOString()
  });
  
  // 🔥 서버 탭이 활성화된 경우 상세 로그
  if (activeNodeTab === 'server' && selectedMenu === 'Server') {
    console.log('🔍 [ChannelSidebar] Server 탭 활성화:', {
      serversData: servers,
      serversCount: servers.length,
      refreshTrigger, // 🔥 새로고침 트리거 상태 추가
      firstServer: servers[0] || null
    });
  }

  // 🔥 카테고리별 아이콘 매핑
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('ai') || name.includes('ml') || name.includes('artificial')) return Brain;
    if (name.includes('web') || name.includes('frontend') || name.includes('react')) return Code;
    if (name.includes('api') || name.includes('data') || name.includes('storage')) return Database;
    if (name.includes('integration') || name.includes('tool') || name.includes('utility')) return Wrench;
    if (name.includes('cloud') || name.includes('aws') || name.includes('azure')) return Cloud;
    if (name.includes('bot') || name.includes('chat') || name.includes('automation')) return Bot;
    return Sparkles; // 기본 아이콘
  };

  // 🔥 카테고리별 색상 매핑
  const getCategoryColor = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('ai') || name.includes('ml')) return 'bg-gradient-to-r from-purple-500 to-pink-500';
    if (name.includes('web') || name.includes('frontend')) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    if (name.includes('api') || name.includes('data')) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    if (name.includes('integration') || name.includes('tool')) return 'bg-gradient-to-r from-orange-500 to-red-500';
    if (name.includes('cloud')) return 'bg-gradient-to-r from-sky-500 to-indigo-500';
    if (name.includes('bot') || name.includes('communication') || name.includes('automation'))return 'bg-gradient-to-r from-violet-500 to-purple-500';
    return 'bg-gradient-to-r from-gray-500 to-slate-500'; // 기본 색상
  };

  // 🎨 워크플로우 아이콘 매핑
  const getWorkflowIcon = (workflowName: string) => {
    const name = workflowName.toLowerCase();
    if (name.includes('all')) return Layers;
    if (name.includes('claude')) return Brain;
    if (name.includes('local')) return Server;
    if (name.includes('template')) return Code;
    if (name.includes('popular')) return Sparkles;
    if (name.includes('new')) return Plus;
    return Play; // 기본 아이콘
  };

  // 🎨 워크플로우 색상 매핑
  const getWorkflowColor = (workflowName: string) => {
    const name = workflowName.toLowerCase();
    if (name.includes('all')) return 'bg-gradient-to-r from-slate-500 to-gray-600';
    if (name.includes('claude')) return 'bg-gradient-to-r from-orange-500 to-amber-500';
    if (name.includes('local')) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    if (name.includes('template')) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (name.includes('popular')) return 'bg-gradient-to-r from-pink-500 to-rose-500';
    if (name.includes('new')) return 'bg-gradient-to-r from-violet-500 to-purple-500';
    return 'bg-gradient-to-r from-cyan-500 to-blue-500'; // 기본 색상
  };

  // 🔥 서버 드래그 핸들러 (원본 ServerTab과 완전히 동일)
  const handleServerDrag = (event: React.DragEvent, server: any) => {
    // 드래그 시작 전에 모든 데이터 초기화
    event.dataTransfer.clearData();

    // SERVER_ID 형식으로 데이터 설정 (ServerTab과 동일)
    event.dataTransfer.setData('text/plain', `SERVER_ID:${server.id}`);

    // 전역 변수에 서버 데이터 저장 (ServerTab과 동일)
    (window as any).__lastDraggedServerId = String(server.id);
    (window as any).__lastDraggedServer = server;

    // 기본 드래그 효과 설정
    event.dataTransfer.effectAllowed = 'copyMove';

    console.log('[ChannelSidebar] 서버 드래그 시작:', server.mcp_servers?.name || server.id);
  };

  // 🔥 공통 드래그 핸들러 (원본 Sidebar와 완전히 동일)
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', nodeType);
    console.log('[ChannelSidebar] 드래그 시작:', nodeType);
  };
// 카테고리별 // 인기 워크플로우// 
  // 🔥 선택된 메뉴에 따른 타이틀과 내용 변경 (실제 라우팅 연동)
  const getMenuContent = () => {
    switch (selectedMenu) {
      case 'Products':
        return {
          title: 'Products',
          sections: [
            // { 
              // name: 'Leaderboards', 
              // items: [
                // { name: 'All Leaderboards', path: '/products/leaderboards' },
                // { name: 'Daily Rankings', path: '/products/leaderboards?period=daily' },
                // { name: 'Weekly Rankings', path: '/products/leaderboards?period=weekly' },
                // { name: 'Monthly Rankings', path: '/products/leaderboards?period=monthly' }
              // ]
            // },
            { 
              name: 'Categories', 
              items: [
                { name: 'All Categories', path: '/products/categories' },
                // 🔥 동적 카테고리 생성 - 최대 8개까지만 표시
                ...categories.slice(0, 8).map(category => ({
                  name: category.name.charAt(0).toUpperCase() + category.name.slice(1).toLowerCase(),
                  path: `/products/categories?category=${encodeURIComponent(category.name)}`
                }))
              ]
            },
            { 
              name: 'Manage', 
              items: [
                // { name: 'Search Products', path: '/products/search' },
                // { name: 'Submit Product', path: '/products/submit' },
                // { name: 'Promote Product', path: '/products/promote' }
              ]
            },
          ]
        };
      case 'Server':
        return {
          title: 'Server Management',
          sections: [
            { 
              name: 'Tools', 
              items: [
                // { name: 'Inspector', path: '/jobs/inspector' },
                { name: 'Node Manager', path: '/jobs/node' },
                // { name: 'Performance Monitor', path: '/jobs/performance' }
              ]
            },
            // 🔥 노드 편집기 섹션 추가
            { 
              name: 'Node Editor', 
              type: 'nodeEditor',
              items: [] // 특별 처리
            },
            //Template 추가해야함
          ]
        };
      // case 'Chat':
      //   return {
      //     title: 'Chat & AI',
      //     sections: [
      //       { 
      //         name: 'Conversations', 
      //         type: 'chatList',
      //         items: [] // ChatList 컴포넌트로 특별 처리
      //       },
      //       { 
      //         name: 'Quick Actions', 
      //         items: [
      //           { name: 'New Chat', action: 'createNewChat' },
      //           { name: 'Chat History', path: '/chat/history' },
      //           { name: 'Clear All Chats', action: 'clearAllChats' }
      //         ]
      //       },
      //       { 
      //         name: 'AI Settings', 
      //         items: [
      //           { name: 'AI Models', path: '/chat/models' },
      //           { name: 'Chat Settings', path: '/chat/settings' },
      //           { name: 'API Configuration', path: '/chat/api' }
      //         ]
      //       },
      //     ]
      //   };
      case 'Community':
        return {
          title: 'Workflows',
          sections: [
            { 
              name: 'My Workflows', 
              items: [
                { name: 'All Workflows', path: '/workflows' },
                { name: 'Claude Workflows', path: '/workflows?sorting=claude' },
                { name: 'Local Workflows', path: '/workflows?sorting=local' }
              ]
            },
            { 
              name: 'Workflow Templates', 
              items: [
                { name: 'All Templates', path: '/workflows/templates' },
                { name: 'Popular Templates', path: '/workflows/templates?sorting=popular' },
                { name: 'New Templates', path: '/workflows/templates?sorting=newest' }
              ]
            },
          ]
        };
      case 'Env':
        return {
          title: 'Env',
          sections: [
            { 
              name: 'Env', 
              items: [
                { name: 'All Envs', path: '/env' },
                // { name: 'Create Env', path: '/env/create' },
                // { name: 'My Envs', path: '/env/my' }
              ]
            }
          ]
        };
      default:
        return {
          title: 'Contextor',
          sections: [
            { 
              name: 'Channel', 
              items: [
                { name: 'general', path: '/channels/general' },
                { name: 'random', path: '/channels/random' },
                { name: 'dev-team', path: '/channels/dev-team' },
                { name: 'design', path: '/channels/design' }
              ]
            },
            { 
              name: 'Direct Message', 
              items: [
                { name: 'DongHyeon KIM', path: '/dm/1' },
                { name: 'Bandi97', path: '/dm/2' },
                { name: 'kanjooyoung', path: '/dm/3' },
                { name: 'pjh7083', path: '/dm/4' }
              ]
            },
          ]
        };
    }
  };

  const menuContent = getMenuContent();

  // 🔥 아이템 클릭 핸들러 (실제 라우팅 및 액션 처리)
  const handleItemClick = (item: any) => {
    if (item.path) {
      // 라우팅
      navigate(item.path);
    } else if (item.action) {
      // 액션 실행
      switch (item.action) {
        case 'createNewChat':
          createNewChat();
          break;
        case 'clearAllChats':
          // TODO: 모든 채팅 삭제 로직 구현
          console.log('모든 채팅 삭제');
          break;
        default:
          console.log(`액션 실행: ${item.action}`);
      }
    }
  };

  // 🔥 노드 편집기 렌더링
  const renderNodeEditor = () => (
    <div className="space-y-3">
      {/* 노드 탭 버튼들 */}
      <div className="flex gap-1 border-b pb-2">
        <button
          onClick={() => setActiveNodeTab('toolbox')}
          className={cn(
            'flex-1 px-2 py-1 text-xs rounded-md transition-colors',
            activeNodeTab === 'toolbox' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-sidebar-accent'
          )}
        >
          <Layers className="w-3 h-3 mx-auto mb-1" />
          Toolbox
        </button>
        <button
          onClick={() => setActiveNodeTab('client')}
          className={cn(
            'flex-1 px-2 py-1 text-xs rounded-md transition-colors',
            activeNodeTab === 'client' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-sidebar-accent'
          )}
        >
          <Settings className="w-3 h-3 mx-auto mb-1" />
          Client
        </button>
        <button
          onClick={() => setActiveNodeTab('server')}
          className={cn(
            'flex-1 px-2 py-1 text-xs rounded-md transition-colors',
            activeNodeTab === 'server' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-sidebar-accent'
          )}
        >
          <Server className="w-3 h-3 mx-auto mb-1" />
          Server
        </button>
      </div>

      {/* 노드 목록 */}
      {activeNodeTab === 'toolbox' && (
        <div className="grid grid-cols-2 gap-2">
          {nodeTypes.map((node) => (
            <div
              key={node.type}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg shadow-sm transition-all duration-200 select-none cursor-grab p-3 hover:shadow-md active:scale-95',
                node.color
              )}
              onDragStart={(event) => handleDragStart(event, node.type)}
              draggable
              title={node.label}
            >
              <div className="text-white mb-1">
                {node.icon}
              </div>
              <span className="text-xs text-white font-medium text-center truncate w-full">
                {node.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeNodeTab === 'client' && (
        <div className="space-y-2">
          {isLoadingClients ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              <div className="w-6 h-6 mx-auto mb-2 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
              클라이언트 목록 로딩 중...
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              사용 가능한 클라이언트가 없습니다.
            </div>
          ) : (
            clients.map((client, index) => (
              <div
                key={`client-${client.client_id || index}`}
                className="group relative flex items-center gap-3 p-3 bg-transparent rounded-xl cursor-grab hover:bg-white/10 hover:scale-105 transition-all duration-200"
                draggable
                onDragStart={(event) => handleDragStart(event, client.name)}
                title={client.description}
              >
                {/* 🎨 클라이언트 아이콘 */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                    <img
                      src={client.icon}
                      alt={client.name}
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    {/* Fallback 이니셜 */}
                    <div 
                      className="absolute inset-0 hidden rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ 
                        backgroundColor: `hsl(${Math.abs(client.name?.charCodeAt(0) || 0) * 137.5 % 360}, 65%, 55%)`
                      }}
                    >
                      {(client.name || 'CL').split(' ').map((word: string) => word.charAt(0)).join('').slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                </div>
                
                {/* 🎨 클라이언트 정보 */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate mb-1">
                    {client.name}
                  </h4>
                  <p className="text-xs text-white/60 truncate">
                    {client.tagline || client.description || 'MCP Clients'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeNodeTab === 'server' && (
        <div className="space-y-2">
          {isLoadingServers ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              <div className="w-6 h-6 mx-auto mb-2 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
              서버 목록 로딩 중...
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              <Server className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              설치된 서버가 없습니다.<br />
              제품 페이지에서 서버를 설치해 보세요.
            </div>
          ) : (
            servers.map((server) => (
              <div
                key={server.id}
                className="flex items-center gap-2 p-2 bg-sidebar-accent/50 rounded-lg cursor-grab hover:bg-sidebar-accent transition-colors"
                draggable
                onDragStart={(event) => handleServerDrag(event, server)}
                title={server.mcp_servers?.description || '서버 설명 없음'}
              >
                {/* 🔥 실제 서버 아이콘/이미지 표시 */}
                {server.mcp_servers?.local_image_path ? (
                  <img
                    src={server.mcp_servers.local_image_path}
                    alt={server.mcp_servers.name || 'Server'}
                    className="w-6 h-6 rounded object-cover"
                    onError={(e) => {
                      // 이미지 로드 실패시 fallback
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                {/* 🔥 Fallback avatar */}
                <div 
                  className={`w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs ${
                    server.mcp_servers?.local_image_path ? 'hidden' : ''
                  }`}
                  style={{ 
                    backgroundColor: server.mcp_servers?.fallback_avatar_color || '#6366f1' 
                  }}
                >
                  {server.mcp_servers?.fallback_avatar_initials || server.mcp_servers?.name?.slice(0, 2).toUpperCase() || <Server className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {server.mcp_servers?.name || `서버 ${server.original_server_id}`}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {server.install_status === 'success' ? '설치됨' : server.install_status || 'Unknown'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  // 🔥 채팅 리스트 렌더링
  const renderChatList = () => (
    <div className="space-y-2">
      <div className="px-2">
        <ChatList />
      </div>
    </div>
  );

  // 🔥 Chat 메뉴 선택 시 깔끔한 스타일 렌더링
  if (selectedMenu === 'Chat') {
    return (
      <aside className={cn('flex flex-col h-full bg-sidebar-background border-r border-sidebar-border w-64', className)}>
        {/* 🔥 깔끔한 헤더 */}
        <div className="p-4 border-b border-sidebar-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-sidebar-foreground">Chat</h2>
            <Button 
              onClick={() => createNewChat()}
              size="sm" 
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Plus className="w-3 h-3 mr-1" />
              새 채팅
            </Button>
          </div>
        </div>

        {/* 🔥 ChatList - 깔끔한 스타일 */}
        <div className="flex-1 overflow-hidden">
          <ChatList />
        </div>

        {/* 🔥 간단한 푸터 */}
        <div className="p-3 border-t border-sidebar-border/50">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"
              onClick={() => navigate('/chat/models')}
            >
              <Settings className="w-3 h-3 mr-1" />
              설정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"
              onClick={() => navigate('/chat/history')}
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              히스토리
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn('flex flex-col h-full bg-sidebar-background border-r border-sidebar-border w-64', className)}>
      {/* 헤더 */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-sidebar-foreground">{menuContent.title}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${menuContent.title} 검색...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-sidebar-accent/50 border-sidebar-border text-sm"
          />
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-2">
          {/* 🔥 동적 섹션 렌더링 */}
          {menuContent.sections.map((section, sectionIndex) => (
            <div key={section.name} className="mb-4">
              <button
                onClick={() => {
                  const sectionKey = (section as any).type === 'nodeEditor' ? 'nodeEditor' : String(sectionIndex);
                  setSectionsExpanded(prev => ({
                    ...prev,
                    [sectionKey]: !prev[sectionKey]
                  }));
                }}
                className="flex items-center justify-between w-full p-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-md"
              >
                <div className="flex items-center gap-2">
                  {(() => {
                    const sectionKey = (section as any).type === 'nodeEditor' ? 'nodeEditor' : String(sectionIndex);
                    const isExpanded = sectionsExpanded[sectionKey];
                    return isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    );
                  })()}
                  <span>{section.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Plus className="h-3 w-3" />
                </Button>
              </button>
              
              {/* 🔥 노드 편집기 특별 렌더링 */}
              {(section as any).type === 'nodeEditor' && sectionsExpanded['nodeEditor'] && (
                <div className="ml-2 mt-2">
                  {renderNodeEditor()}
                </div>
              )}
              
              {/* 🔥 채팅 리스트 특별 렌더링 */}
              {(section as any).type === 'chatList' && sectionsExpanded[String(sectionIndex)] && (
                <div className="ml-2 mt-2">
                  {renderChatList()}
                </div>
              )}
              
              {/* 🔥 일반 섹션 렌더링 */}
              {(section as any).type !== 'nodeEditor' && (section as any).type !== 'chatList' && sectionsExpanded[String(sectionIndex)] && (
                <div className="ml-2 mt-1 space-y-1">
                  {section.items.map((item: any, itemIndex: number) => {
                    if (item.isLoading) {
                      return (
                        <div key={itemIndex} className="flex items-center justify-between gap-2 px-2 py-1 text-sm rounded text-muted-foreground w-full text-left">
                          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2"></div>
                          {item.name}
                        </div>
                      );
                    }
                    // 🔥 Categories 섹션인 경우 특별 렌더링
                    if (selectedMenu === 'Products' && section.name === 'Categories' && item.name !== 'All Categories') {
                      const IconComponent = getCategoryIcon(item.name);
                      const colorClass = getCategoryColor(item.name);
                      
                      return (
                        <button
                          key={itemIndex}
                          onClick={() => handleItemClick(item)}
                          className="w-full p-2 rounded-lg hover:scale-105 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            {/* 🔥 그라데이션 아이콘 배경 */}
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg",
                              colorClass
                            )}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            
                            {/* 🔥 카테고리 정보 */}
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium text-sidebar-foreground group-hover:text-foreground transition-colors">
                                {item.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                MCP Servers
                              </div>
                            </div>
                            
                            {/* 🔥 화살표 */}
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </button>
                      );
                    }

                    // 🔥 Workflow 섹션인 경우 특별 렌더링 (Categories 스타일과 동일)
                    if (selectedMenu === 'Community' && (section.name === 'My Workflows' || section.name === 'Workflow Templates')) {
                      const IconComponent = getWorkflowIcon(item.name);
                      const colorClass = getWorkflowColor(item.name);
                      
                      return (
                        <button
                          key={itemIndex}
                          onClick={() => handleItemClick(item)}
                          className="w-full p-2 rounded-lg hover:scale-105 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            {/* 🔥 그라데이션 아이콘 배경 */}
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg",
                              colorClass
                            )}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            
                            {/* 🔥 워크플로우 정보 */}
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium text-white group-hover:text-white/90 transition-colors">
                                {item.name}
                              </div>
                              <div className="text-xs text-white/30">
                                Workflows
                              </div>
                            </div>
                            
                            {/* 🔥 화살표 */}
                            <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors" />
                          </div>
                        </button>
                      );
                    }
                    
                    // 🔥 기본 렌더링 (All Categories 포함)
                    return (
                      <button
                        key={itemIndex}
                        onClick={() => handleItemClick(item)}
                        className="flex items-center justify-between gap-2 px-2 py-1 text-sm rounded hover:bg-sidebar-accent text-sidebar-foreground group w-full text-left transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {selectedMenu === 'Community' || (!selectedMenu && section.name === 'Channel') ? (
                            <Hash className="h-4 w-4 text-muted-foreground" />
                          ) : selectedMenu === 'Server' ? (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          ) : selectedMenu === 'Products' && item.name === 'All Categories' ? (
                            <Layers className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.action && (
                          <span className="text-xs text-muted-foreground">⚡</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* 🔥 커스텀 스크롤바 스타일 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
          }
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(16, 185, 129, 0.3);
            border-radius: 3px;
            transition: background 0.2s ease;
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(16, 185, 129, 0.5);
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb:active {
            background: rgba(16, 185, 129, 0.7);
          }
          
          /* Dark mode support */
          .dark .custom-scrollbar {
            scrollbar-color: rgba(16, 185, 129, 0.4) transparent;
          }
          
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(16, 185, 129, 0.4);
          }
          
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(16, 185, 129, 0.6);
          }
          
          /* 🔥 Alternative: Hidden scrollbar style */
          .hidden-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .hidden-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
    </aside>
  );
} 