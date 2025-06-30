// Root.tsx
import {
  Outlet,
  useLocation,
  useNavigation,
  useLoaderData,
  useNavigate
} from 'react-router';
import { Settings } from 'luxon';
import { useEffect, useState, useCallback } from 'react';
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

// 🔥 새로고침에 필요한 모듈 static import
import { supabase } from './supa-client';
import { getUserInstalledServers } from './features/products/queries';

// Export loader for router
export { loader, ErrorBoundary };

export function Root() {
  const loaderData = useLoaderData() as LoaderData | undefined;
  const { user: initialUser, profile: initialProfile, servers: initialServers = [], clients = [], workflows = [], categories = [] } = loaderData ?? { user: null, profile: null, servers: [], clients: [], workflows: [], categories: [] };  
  
  // 🔥 로그인 상태 동적 관리
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  
  // 🔥 서버 목록 동적 관리
  const [servers, setServers] = useState(initialServers);
  
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

  // 🔥 서버 새로고침 함수 (최적화된 버전)
  const refreshServers = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const installedServers = await getUserInstalledServers(supabase, {
        profile_id: user.id,
      });
      
      // 🔥 얕은 비교로 변경 감지 최적화
      const currentIds = servers.map((s: any) => s.id).sort().join(',');
      const newIds = (installedServers || []).map((s: any) => s.id).sort().join(',');
      
      if (currentIds !== newIds) {
        setServers([...(installedServers || [])]);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [Root] 서버 목록 업데이트:', installedServers?.length || 0, '개');
        }
      }
      
    } catch (error) {
      console.error('❌ [Root] 서버 새로고침 실패:', error);
    }
  }, [user?.id, servers]); // servers는 비교를 위해 필요

  // 🔥 최적화된 재시도 새로고침 함수
  const forceRefreshWithRetry = useCallback(async (eventType: string, maxRetries = 3) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔔 [Root] ${eventType} 이벤트 처리 시작`);
    }
    
    const originalServerCount = servers.length;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (!user?.id) return;
        
        // 첫 번째 시도가 아니면 대기
        if (attempt > 0) {
          const delay = Math.min(1000 * attempt, 3000); // 1초, 2초, 3초
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const freshServers = await getUserInstalledServers(supabase, {
          profile_id: user.id,
        });
        
        const currentCount = freshServers?.length || 0;
        const hasChanged = 
          (eventType === 'install' && currentCount > originalServerCount) ||
          (eventType === 'uninstall' && currentCount < originalServerCount);
        
        if (hasChanged) {
          setServers([...(freshServers || [])]);
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [Root] ${eventType} 완료! (${attempt + 1}번째 시도)`);
          }
          return;
        }
        
        if (process.env.NODE_ENV === 'development' && attempt < maxRetries - 1) {
          console.log(`🔄 [Root] ${attempt + 1}번째 시도 실패, 재시도 중...`);
        }
        
      } catch (error) {
        console.error(`❌ [Root] ${attempt + 1}번째 시도 오류:`, error);
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ [Root] ${maxRetries}번 시도 후 실패`);
    }
  }, [user?.id, servers.length]); // servers.length만 dependency로 사용하여 최적화

  // 🔥 전역 이벤트 리스너 (InstallSidebarNew의 알림 수신)
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('🔔 [Root] 이벤트 리스너 등록, userId:', user.id);
    
    const handleServerInstalled = async (event: any) => {
      console.log('🔔 [Root] 서버 설치 완료 이벤트 수신:', event.detail);
      await forceRefreshWithRetry('install', 5);
    };
    
    const handleServerUninstalled = async (event: any) => {
      console.log('🔔 [Root] 서버 제거 완료 이벤트 수신:', event.detail);
      await forceRefreshWithRetry('uninstall', 5);
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('mcp-server-installed', handleServerInstalled);
    window.addEventListener('mcp-server-uninstalled', handleServerUninstalled);
    
    return () => {
      window.removeEventListener('mcp-server-installed', handleServerInstalled);
      window.removeEventListener('mcp-server-uninstalled', handleServerUninstalled);
    };
  }, [user?.id, forceRefreshWithRetry]);

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
    } else if (pathname.startsWith('/env')) {
      setSelectedMenu('Env');
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
            categories,
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
            title="Contextor"
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
                categories={categories}
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
                'py-10 md:py-10 px-5 md:px-10': pathname.includes('/products/categories'),
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
                categories,
              }}
            />
          </main>
        </div>
      </div>
    </DnDProvider>
  );
}
