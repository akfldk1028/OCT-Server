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
import { useEffect } from 'react';
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
import Mousetrap from 'mousetrap';

function matchShortcut(event, shortcut) {
  // 예시: 'Control+Shift+G' → ctrlKey, shiftKey, key === 'g'
  const keys = shortcut.key.toLowerCase().split('+');
  const key = keys[keys.length - 1];
  const requiredCtrl = keys.includes('control') || keys.includes('commandorcontrol');
  const requiredShift = keys.includes('shift');
  const requiredAlt = keys.includes('alt');
  const requiredMeta = keys.includes('meta');

  // modifier가 필요하면 true, 필요 없으면 false
  if (requiredCtrl && !event.ctrlKey && !event.metaKey) return false;
  if (!requiredCtrl && (event.ctrlKey || event.metaKey)) return false;
  if (requiredShift && !event.shiftKey) return false;
  if (!requiredShift && event.shiftKey) return false;
  if (requiredAlt && !event.altKey) return false;
  if (!requiredAlt && event.altKey) return false;
  if (requiredMeta && !event.metaKey) return false;
  if (!requiredMeta && event.metaKey) return false;

  return event.key.toLowerCase() === key;
}
// loader 함수 정의
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && user.id) {
    const [profile] = await Promise.all([getUserById(supabase as any, {id: user.id})]);
    return { user, profile };
  }
  return { user: null, profile: null };
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
};

// 이 타입은 Route.LoaderArgs를 대체합니다

export function Root() {
  const loaderData = useLoaderData() as LoaderData | undefined;

  const { user, profile} = loaderData ?? { user: null, profile: null };  const { pathname } = useLocation();
  const navigation = useNavigation();
  const navigate = useNavigate(); // 훅은 컴포넌트 최상단에서 호출

  const isLoading = navigation.state === 'loading';
  const isLoggedIn = !!user;

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
          }}
        />
      </div>
    );
  }

  // Electron 환경 (기존)
  return (
    <div className="flex h-screen overflow-hidden">
      {!pathname.includes('/auth') && (
        <Sidebar
          isLoggedIn={isLoggedIn}
          username={profile?.username || ""}
          avatar={profile?.avatar || null}
          name={profile?.name || ""}
          hasNotifications={false}
          hasMessages={false}
          collapsed={pathname.includes('/jobs/node') || pathname === '/overlay'} // 추가!
          />
      )}
      <main
        className={cn(
          'flex-1 h-full',
          {
            'overflow-y-auto py-20 md:py-40 px-5 md:px-20': (!pathname.includes('/auth/') && !pathname.includes('/server/node-page') && !(typeof window !== 'undefined' && (window as any).IS_ELECTRON && pathname === '/')),
            'overflow-hidden  py-0 md:py-0 px-0 md:px-0': pathname.includes('/jobs/node'),
            'overflow-hidden  py-10 md:py-10 px-5 md:px-10': pathname.includes('/jobs/inspector'),
            'overflow-y-auto py-10 md:py-20 px-5 md:px-20': IS_ELECTRON && pathname === '/',

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
          }}
        />
      </main>
    </div>
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
