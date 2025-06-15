// Root.tsx
import {
  Outlet,
  useLocation,
  useNavigation,
  isRouteErrorResponse,
  useLoaderData,
  LoaderFunctionArgs,
  useNavigate
} from 'react-router';
import { Settings } from 'luxon';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from './lib/utils';
import useTheme from '@/lib/useTheme';
import Sidebar from './common/components/Sidebar-M';
import { makeSSRClient, supabase } from './supa-client';
import { getUserById } from './features/users/queries';
import {  IS_ELECTRON, IS_WEB } from './utils/environment';
import Navigation from './common/components/navigation';
import {ensureOverlayApi} from './utils/api'
import {ShortcutHandlerMap, shortcutManager, SHORTCUTS} from '@/common/shortcut_action/shortcut'; // 경로는 실제 위치에 맞게 조정
import { useDispatch, useStore } from '@/hooks/useStore';
import ChannelSidebar from './common/components/ChannelSidebar';
import CustomTitleBar from './common/components/CustomTitleBar';
import { DnDProvider } from './features/server/hook/DnDContext';
import { getClients } from './features/server/queries';
import { getUserInstalledServers } from './features/products/queries';
import { getMcpConfigsByServerId } from './features/products/queries';

// loader 함수 정의
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (user && user.id) {
    const [profile] = await Promise.all([getUserById(supabase as any, {id: user.id})]);
    
    // 🔥 서버/클라이언트 데이터도 가져오기 (server-layout.tsx에서 이동)
    try {

      // 클라이언트 데이터 가져오기
      const clients = await getClients(supabase as any, { limit: 100 });
      
      // 설치된 서버 데이터 가져오기
      const installedServers = await getUserInstalledServers(supabase as any, {
        profile_id: user.id,
      });
      
      // 각 서버의 설정들 병렬로 가져오기
      const servers = await Promise.all(
        installedServers.map(async (server) => {
          try {
            const configs = await getMcpConfigsByServerId(supabase as any, {
              original_server_id: server.original_server_id
            });
            
            return {
              ...server,
              mcp_configs: configs
            };
          } catch (configError) {
            console.warn(`⚠️ [root loader] 서버 ${server.original_server_id} 설정 로드 실패:`, configError);
            return {
              ...server,
              mcp_configs: []
            };
          }
        })
      );
      
      console.log('✅ [root loader] 서버+클라이언트 데이터 로드 완료:', {
        servers: servers.length,
        clients: clients.length
      });
      
      return { user, profile, servers, clients };
      
    } catch (error) {
      console.error('❌ [root loader] 서버/클라이언트 데이터 로드 실패:', error);
      return { user, profile, servers: [], clients: [] };
    }
  }
  
  return { user: null, profile: null, servers: [], clients: [] };
};

// 로더 데이터 타입 정의
type LoaderData = {
  user: { id: string; email: string } | null;
  profile: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
  servers: any[];
  clients: any[];
};

// 이 타입은 Route.LoaderArgs를 대체합니다

export function Root() {
  const loaderData = useLoaderData() as LoaderData | undefined;

  const { user, profile, servers = [], clients = [] } = loaderData ?? { user: null, profile: null, servers: [], clients: [] };  const { pathname } = useLocation();
  const navigation = useNavigation();
  const navigate = useNavigate(); // 훅은 컴포넌트 최상단에서 호출

  const isLoading = navigation.state === 'loading';
  const isLoggedIn = !!user;

  const dispatch = useDispatch();
  const store = useStore();
  
  // 🔥 선택된 메뉴 상태 관리 (Slack 스타일)
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  // 🔥 URL 기반으로 selectedMenu 자동 설정
  useEffect(() => {
    if (pathname.startsWith('/chat')) {
      setSelectedMenu('Chat');
    } else if (pathname.startsWith('/jobs')) {
      setSelectedMenu('Server');
    } else if (pathname.startsWith('/products')) {
      setSelectedMenu('Products');
    } else if (pathname.startsWith('/overlay') || pathname.startsWith('/community')) {
      setSelectedMenu('Community');
    } else if (pathname.startsWith('/teams')) {
      setSelectedMenu('Tools');
    }
  }, [pathname]);

  Settings.defaultLocale = 'ko';
  Settings.defaultZone = 'utc';


  useEffect(() => {
    if (!IS_ELECTRON) return;

    const overlayApi = ensureOverlayApi();

    // 단축키 핸들러 정의
    const handlers: ShortcutHandlerMap = {
      'setGuideWindow': () => {
        overlayApi.sendMessage('set-guide-window');
        navigate('/overlay');
      },
      'resetWindow': () => {
        overlayApi.sendMessage('reset-window');
      }

    };

    // 핸들러 등록 및 초기화
    shortcutManager.registerHandlers(handlers);
    shortcutManager.initialize();

    // 컴포넌트 언마운트 시 정리
    return () => {
      shortcutManager.cleanup();
    };
  }, [navigate]); // navigate가 의존성 배열에 포함되어야 함



  // App.tsx 또는 MainLayout.tsx
  useEffect(() => {
    dispatch({
      type: 'open_router.initialize',
      payload: {
        endpoint: 'http://127.0.0.1:8787',
      }
    });
        // 2. MCP 기본 서버들 등록
    dispatch({
          type: 'mcp_registry.initializeDefaultServers',
    });

  }, []);

  console.log(isLoggedIn);
  if (IS_WEB) {
    return (
      <div
        className={cn({
          'py-20 md:py-40 px-5 md:px-20': !pathname.includes('/auth/'),
          'transition-opacity animate-pulse': isLoading,
        })}
      >
        {pathname.includes('/auth') ? null : (
          <Navigation
            isLoggedIn={isLoggedIn}
            username={profile?.username}
            avatar={profile?.avatar}
            name={profile?.name}
            hasNotifications={false}
            hasMessages={false}
          />
        )}
        <Outlet
          context={{
            isLoggedIn,
            name: profile?.name,
            userId: user?.id,
            username: profile?.username,
            avatar: profile?.avatar,
            email: user?.email,
            servers,
            clients,
          }}
        />
      </div>
    );
  }

  // Electron 환경 (기존)
  return (
    <DnDProvider>
      <div className="relative flex flex-col h-screen overflow-hidden">
      {/* 🌲 커스텀 타이틀바 - Electron에서만 표시 */}
      {!pathname.includes('/auth') && (
        <CustomTitleBar 
          title="OCT Server"
          showMenuButton={true}
        />
      )}
      
      {/* 🌲 타이틀바 높이(32px)만큼 여백 추가 */}
      <div className={cn(
        "flex flex-1 overflow-hidden",
        {
          "pt-8": !pathname.includes('/auth'), // 32px (h-8) 여백 추가
        }
      )}>
        {!pathname.includes('/auth') && (
          <>
            <Sidebar
              isLoggedIn={isLoggedIn}
              username={profile?.username || ""}
              avatar={profile?.avatar || null}
              name={profile?.name || ""}
              hasNotifications={false}
              hasMessages={false}
              collapsed={true} // 🔥 Slack 스타일: 항상 아이콘만 표시
              onMenuSelect={setSelectedMenu} // 🔥 메뉴 선택 핸들러
              />
            {/* 🔥 ChannelSidebar 항상 표시 - Slack 스타일 */}
            <ChannelSidebar 
              selectedMenu={selectedMenu}
              servers={servers}
              clients={clients}
              onNodeDragStart={(event, nodeType) => {
                // 🔥 노드 드래그 시작 - React Flow로 전달
                event.dataTransfer.setData('application/node-type', nodeType);
                event.dataTransfer.effectAllowed = 'move';
              }}
            />
          </>
        )}
        <main
          className={cn(
            'flex-1 h-full',
            {
              'overflow-y-auto py-20 md:py-40 px-5 md:px-20': (!pathname.startsWith('/chat') && !pathname.includes('/auth/') && !pathname.includes('/server/node-page') && !(typeof window !== 'undefined' && (window as any).IS_ELECTRON && pathname === '/')),
              'overflow-hidden py-0 md:py-0 px-0 md:px-0': pathname.includes('/jobs/node'),
              'overflow-hidden py-10 md:py-10 px-5 md:px-10': pathname.includes('/jobs/inspector'),
              'overflow-y-auto py-10 md:py-20 px-5 md:px-20': IS_ELECTRON && pathname === '/',
              'overflow-hidden py-0 px-0 md:py-0 h-full bg-background': pathname.includes('/chat/'),
              'transition-opacity animate-pulse': isLoading,
            }
          )}
        >
          <Outlet
            context={{
              isLoggedIn,
              name: profile?.name || "",
              userId: user?.id || "",
              username: profile?.username || "",
              avatar: profile?.avatar || null,
              email: user?.email || "",
              servers,
              clients,
            }}
          />
        </main>
      </div>
    </div>
    </DnDProvider>
  );
}

// 에러 바운더리 컴포넌트
export function ErrorBoundary({ error }: { error: unknown }) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
