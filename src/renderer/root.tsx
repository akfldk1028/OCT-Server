// Root.tsx
import {
  Outlet,
  useLocation,
  useNavigation,
  useLoaderData,
  useNavigate
} from 'react-router';
import { Settings } from 'luxon';
import { useEffect, useState } from 'react';
import { cn } from './lib/utils';
import Sidebar from './common/components/Sidebar-M';
import { IS_ELECTRON, IS_WEB } from './utils/environment';
import Navigation from './common/components/navigation';
import { ensureOverlayApi } from './utils/api';
import { ShortcutHandlerMap, shortcutManager } from '@/common/shortcut_action/shortcut';
import { useDispatch } from '@/hooks/useStore';
import ChannelSidebar from './common/components/ChannelSidebar';
import CustomTitleBar from './common/components/CustomTitleBar';
import { DnDProvider } from './features/server/hook/DnDContext';

// 🔥 분리된 파일들에서 import
import { loader, LoaderData } from './loaders/root-loader';
import { ErrorBoundary } from './common/components/ErrorBoundary';

// Export loader for router
export { loader, ErrorBoundary };

export function Root() {
  const loaderData = useLoaderData() as LoaderData | undefined;
  const { user: initialUser, profile: initialProfile, servers = [], clients = [], workflows = [] } = loaderData ?? { user: null, profile: null, servers: [], clients: [], workflows: [] };  
  
  // 🔥 로그인 상태 동적 관리
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const isLoading = navigation.state === 'loading';
  const isLoggedIn = !!user;
  const dispatch = useDispatch();
  
  // 🔥 Auth 세션 업데이트 리스너 (일렉트론 환경에서만)
  useEffect(() => {
    if (!IS_ELECTRON || typeof window === 'undefined' || !window.electronAPI) return;

    console.log('🔥 [Root] Auth 이벤트 리스너 등록');
    
    // 세션 업데이트 리스너
    const removeSessionListener = window.electronAPI.onAuthSessionUpdated(({ user: newUser, session }) => {
      console.log('🔥 [Root] Auth 세션 업데이트 받음:', newUser?.email);
      
      if (newUser) {
        // 사용자 정보 업데이트
        setUser({
          id: newUser.id,
          email: newUser.email
        });
        
        // 프로필 정보 업데이트 (user_metadata에서 가져오기)
        setProfile({
          id: newUser.id,
          name: newUser.user_metadata?.name || newUser.user_metadata?.full_name || '사용자',
          username: newUser.user_metadata?.preferred_username || newUser.user_metadata?.user_name || 'user',
          avatar: newUser.user_metadata?.avatar_url || null
        });
        
        console.log('🔥 [Root] 프로필 정보 업데이트 완료:', {
          name: newUser.user_metadata?.name,
          avatar: newUser.user_metadata?.avatar_url
        });
        
        // 🔥 로그인 성공 시 즉시 데이터 다시 로드
        console.log('🔥 [Root] 로그인 완료 - 즉시 데이터 다시 로드');
        setTimeout(() => {
          // React Router의 revalidate 대신 현재 페이지로 navigate (데이터 다시 로드 트리거)
          navigate('/', { replace: true });
        }, 200); // 0.2초 후 재로드 (UI 깜빡임 최소화)
      }
    });

    // 🔥 로그아웃 리스너 추가
    const removeLogoutListener = window.electronAPI.onLoggedOut(() => {
      console.log('🔥 [Root] 로그아웃 이벤트 받음 - 사용자 정보 초기화');
      
      // 상태 초기화
      setUser(null);
      setProfile(null);
      
      console.log('🔥 [Root] 로그아웃 완료 - UI 업데이트됨');
    });

    return () => {
      removeSessionListener();
      removeLogoutListener();
    };
  }, [navigate]);
  
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

  // Luxon 설정
  Settings.defaultLocale = 'ko';
  Settings.defaultZone = 'utc';

  // 🔥 단축키 및 오버레이 API 설정 (일렉트론에서만)
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
  }, [navigate]);

  // 🔥 스토어 초기화
  useEffect(() => {
    dispatch({
      type: 'open_router.initialize',
      payload: {
        endpoint: 'http://127.0.0.1:8787',
      }
    });
    
    // MCP 기본 서버들 등록
    dispatch({
      type: 'mcp_registry.initializeDefaultServers',
    });
  }, [dispatch]);

  console.log(isLoggedIn);

  // 🌐 웹 환경 렌더링
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
            workflows,
          }}
        />
      </div>
    );
  }

  // 🖥️ 일렉트론 환경 렌더링
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
        
        {/* 🌲 타이틀바 높이만큼 여백 추가 */}
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
                collapsed={true}
                onMenuSelect={setSelectedMenu}
              />
              <ChannelSidebar 
                selectedMenu={selectedMenu} 
                servers={servers}
                clients={clients}
              />
            </>
          )}
          
          {/* 메인 콘텐츠 */}
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
                workflows,
              }}
            />
          </main>
        </div>
      </div>
    </DnDProvider>
  );
}
