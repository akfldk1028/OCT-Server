// Root.tsx
import {
  Outlet,
  useLocation,
  useNavigation,
  isRouteErrorResponse,
  useLoaderData,
  LoaderFunctionArgs
} from 'react-router';
import { Settings } from 'luxon';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from './lib/utils';
import useTheme from '@/lib/useTheme';
import Sidebar from './common/components/Sidebar-M';
import { makeSSRClient } from './supa-client';
import { getUserById, countNotifications } from './features/users/queries';

// loader 함수 정의
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { client } = makeSSRClient(request);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user && user.id) {
    const [profile, count] = await Promise.all([getUserById(client, {id: user.id}), countNotifications(client, {userId: user.id})]);
    return { user, profile, notificationsCount: count };
  }
  return { user: null, profile: null, notificationsCount: 0 };
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
  notificationsCount: number;
};

// 이 타입은 Route.LoaderArgs를 대체합니다

export function Root() {
  Settings.defaultLocale = 'ko';
  Settings.defaultZone = 'utc';
  const [theme, setTheme] = useTheme();

  // loader에서 반환된 데이터 가져오기
  const rawLoaderData = useLoaderData();

  // 안전한 기본값을 가진 loaderData 객체 생성
  const loaderData = {
    user: null,
    profile: null,
    notificationsCount: 0,
    
    ...(rawLoaderData as object || {})
  };
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';
  const isLoggedIn = !!loaderData.user;

  return (
    <div className="flex h-screen overflow-hidden">
      {!pathname.includes('/auth') && (
        <Sidebar
          isLoggedIn={isLoggedIn}
          username={loaderData.profile?.username || ""}
          avatar={loaderData.profile?.avatar || null}
          name={loaderData.profile?.name || ""}
          hasNotifications={!!loaderData.notificationsCount}
          hasMessages={false}
        />
      )}
      <main
        className={cn('flex-1 overflow-y-auto h-full', {
          'py-10 md:py-20 px-5 md:px-10': !pathname.includes('/auth/'),
          'transition-opacity animate-pulse': isLoading,
        })}
      >
        <Outlet
          context={{
            isLoggedIn,
            name: loaderData.profile?.name || "",
            userId: loaderData.user?.id || "",
            username: loaderData.profile?.username || "",
            avatar: loaderData.profile?.avatar || null,
            email: loaderData.user?.email || "",
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
