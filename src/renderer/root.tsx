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
import { getClients } from './features/server/queries';
import { getUserWorkflows } from './features/server/workflow-queries';

// Export loader for router
export { loader, ErrorBoundary };

export function Root() {
  const loaderData = useLoaderData() as LoaderData | undefined;
  console.log('🔥 [Root] loaderData:', loaderData);
  
  // 🔥 상세 로그 추가 - 각 데이터 확인
  console.log('🔍 [Root] 로드된 데이터 상세:', {
    user: !!loaderData?.user,
    profile: !!loaderData?.profile,
    servers: loaderData?.servers?.length || 0,
    clients: loaderData?.clients?.length || 0,
    workflows: loaderData?.workflows?.length || 0,
    categories: loaderData?.categories?.length || 0,
  });
  
  const { user: initialUser, profile: initialProfile, servers: initialServers = [], clients: initialClients = [], workflows: initialWorkflows = [], categories: initialCategories = [] } = loaderData ?? { user: null, profile: null, servers: [], clients: [], workflows: [], categories: [] };  
  
  // 🔥 초기값 로그 추가
  console.log('🔍 [Root] 초기값 확인:', {
    initialServers: initialServers.length,
    initialClients: initialClients.length,
    initialWorkflows: initialWorkflows.length,
    initialCategories: initialCategories.length,
  });
  
  // 🔥 로그인 상태 동적 관리
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  
  // 🔥 모든 데이터 동적 관리 (강화!)
  const [servers, setServers] = useState(initialServers);
  const [clients, setClients] = useState(initialClients);
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [categories, setCategories] = useState(initialCategories);
  const [isLoadingServers, setIsLoadingServers] = useState(true);  // 초기 true
  const [isLoadingClients, setIsLoadingClients] = useState(true);  // 새로 추가
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);  // 새로 추가

  // 🔥 선택된 메뉴 상태 관리 (Slack 스타일)
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  // 🔥 모든 데이터 새로고침 함수 (서버, 클라이언트, 워크플로우)
  const refreshAllData = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      console.log('🔄 [Root] refreshAllData 건너뜀 - userId 없음');
      return;
    }
    
    try {
      console.log('🔄 [Root] 모든 데이터 새로고침 시작...', { userId: targetUserId });
      
      // 로딩 상태 시작
      setIsLoadingServers(true);
      setIsLoadingClients(true);
      setIsLoadingWorkflows(true);
      
      // 🔥 병렬로 모든 데이터 로드 (root-loader.ts와 동일한 방식)
      const [freshServers, freshClients, freshWorkflows] = await Promise.all([
        getUserInstalledServers(supabase, { profile_id: targetUserId }),
        getClients(supabase, { limit: 100 }),
        getUserWorkflows(supabase, { profile_id: targetUserId, limit: 100 })
      ]);
      
      // 상태 업데이트
      setServers(freshServers || []);
      setClients(freshClients || []);
      setWorkflows(freshWorkflows || []);
      
      console.log('🔄 [Root] 모든 데이터 새로고침 완료:', {
        servers: freshServers?.length || 0,
        clients: freshClients?.length || 0,
        workflows: freshWorkflows?.length || 0
      });
      
    } catch (error) {
      console.error('🔄 [Root] 데이터 새로고침 실패:', error);
    } finally {
      // 로딩 상태 종료
      setIsLoadingServers(false);
      setIsLoadingClients(false);
      setIsLoadingWorkflows(false);
    }
  }, [user?.id]);

  // 🔥 최적화된 재시도 새로고침 함수 (모든 데이터)
  const forceRefreshWithRetry = useCallback(async (eventType: string, userId?: string, maxRetries = 3) => {
    console.log(`🔔 [Root] ${eventType} 이벤트 처리 시작`, { userId: userId || user?.id });
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const targetUserId = userId || user?.id;
        if (!targetUserId) {
          console.log(`🔄 [Root] ${eventType} 건너뜀 - userId 없음 (시도 ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        if (attempt > 0) {
          const delay = Math.min(1000 * attempt, 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // 🔥 모든 데이터 새로고침 (서버, 클라이언트, 워크플로우)
        await refreshAllData(targetUserId);
        
        console.log(`✅ [Root] ${eventType} 완료! (${attempt + 1}번째 시도)`);
        return;
        
      } catch (error) {
        console.error(`🔄 [Root] ${attempt + 1}번째 시도 실패:`, error);
        if (attempt === maxRetries - 1) {
          console.error(`⚠️ [Root] ${maxRetries}번 시도 후 실패`);
        }
      }
    }
  }, [user?.id, refreshAllData]);

  // 🔥 컴포넌트 마운트 시 즉시 동기화 (모든 데이터)
  useEffect(() => {
    if (loaderData) {
      console.log('🔥 [Root] 초기 마운트 - 모든 데이터 즉시 동기화');
      setUser(loaderData.user || null);
      setProfile(loaderData.profile || null); 
      setServers(loaderData.servers || []);
      setClients(loaderData.clients || []);
      setWorkflows(loaderData.workflows || []);
      setCategories(loaderData.categories || []);
      
      // 🔥 데이터가 있으면 즉시 로딩 해제 (새로고침 없이 바로 표시)
      setIsLoadingServers(false);
      setIsLoadingClients(false);
      setIsLoadingWorkflows(false);
      
      console.log('🔥 [Root] 초기 로딩 완료 - UI 업데이트');
    }
  }, []); // 🔥 빈 배열로 마운트 시 한 번만 실행

  // 🔥 loaderData 변경 시 모든 데이터 동기화 (간소화!)
  useEffect(() => {
    if (loaderData) {
      console.log('🔥 [Root] loaderData 변경 감지 - 데이터 업데이트');
      
      // 🔥 유저 정보 동기화
      if (loaderData.user) {
        setUser(loaderData.user);
      } else if (!loaderData.user && user) {
        setUser(null);
      }
      
      // 🔥 프로필 정보 동기화
      if (loaderData.profile) {
        setProfile(loaderData.profile);
      } else if (!loaderData.profile && profile) {
        setProfile(null);
      }
      
      // 🔥 모든 데이터 즉시 설정 (로딩 없이)
      setServers(loaderData.servers || []);
      setClients(loaderData.clients || []);
      setWorkflows(loaderData.workflows || []);
      setCategories(loaderData.categories || []);
      
      // 🔥 로딩 상태 즉시 해제
      setIsLoadingServers(false);
      setIsLoadingClients(false);
      setIsLoadingWorkflows(false);
      
      console.log('🔥 [Root] 데이터 동기화 완료 - 즉시 표시');
    }
  }, [loaderData]);  // 🔥 loaderData만 의존

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
      console.log('🔍 [Root] 사용자 메타데이터 확인:', newUser?.user_metadata); // 🔥 새로 추가
      
      if (newUser) {
        // 사용자 정보 업데이트
        setUser({
          id: newUser.id,
          email: newUser.email
        });
        
        // 프로필 정보 업데이트 (user_metadata에서 가져오기)
        if (newUser.user_metadata) {
          const profileData = {
            id: newUser.id,
            name: newUser.user_metadata.name || newUser.user_metadata.full_name || newUser.email?.split('@')[0] || '사용자',
            username: newUser.user_metadata.username || newUser.email?.split('@')[0] || 'user',
            avatar: newUser.user_metadata.avatar_url || newUser.user_metadata.picture || null, // 🔥 picture도 추가
          };
          
          console.log('🔍 [Root] 설정할 프로필 데이터:', profileData); // 🔥 새로 추가
          setProfile(profileData);
        }
        
        // 🔥 로그인 성공 시 즉시 모든 데이터 재로드 (userId 직접 전달!)
        console.log('🔥 [Root] 로그인 완료 - 모든 데이터 재로드 시작', { userId: newUser.id });
        setIsLoadingServers(true);
        setIsLoadingClients(true);
        setIsLoadingWorkflows(true);

        // 🔥 userId를 직접 전달하여 데이터 새로고침
        refreshAllData(newUser.id);
        setTimeout(() => {
          forceRefreshWithRetry('login', newUser.id);
        }, 500);
      }
      // 로그아웃 처리는 별도 이벤트에서
    });

    // 🔥 로그아웃 리스너 추가
    const removeLogoutListener = window.electronAPI.onLoggedOut(() => {
      console.log('🔥 [Root] 로그아웃 이벤트 받음 - 사용자 정보 초기화');
      
      // 상태 초기화
      setUser(null);
      setProfile(null);
      setServers([]);  // 서버 목록도 초기화 (로그아웃 시 빈 상태로)
      
      console.log('🔥 [Root] 로그아웃 완료 - UI 업데이트됨');
    });

    return () => {
      removeSessionListener();
      removeLogoutListener();
    };
  }, [navigate, refreshAllData, forceRefreshWithRetry]);

  // 🔥 전역 이벤트 리스너 (InstallSidebarNew의 알림 수신)
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('🔔 [Root] 이벤트 리스너 등록, userId:', user.id);
    
    const handleServerInstalled = async (event: any) => {
      console.log('🔔 [Root] 서버 설치 완료 이벤트 수신:', event.detail);
      await forceRefreshWithRetry('install', user?.id, 5);
    };
    
    const handleServerUninstalled = async (event: any) => {
      console.log('🔔 [Root] 서버 제거 완료 이벤트 수신:', event.detail);
      await forceRefreshWithRetry('uninstall', user?.id, 5);
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
            isLoadingServers,
            isLoadingClients,  // 새로 추가
            isLoadingWorkflows  // 새로 추가
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
                installedServers={servers}
              />
              <ChannelSidebar 
                selectedMenu={selectedMenu} 
                servers={servers}
                clients={clients}
                categories={categories}
                isLoadingServers={isLoadingServers}  // 🔥 새로 추가: 로딩 상태 전달
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
                isLoadingServers,  // 🔥 추가
                isLoadingClients,  // 새로 추가
                isLoadingWorkflows  // 새로 추가
              }}
            />
          </main>
        </div>
      </div>
    </DnDProvider>
  );
}
