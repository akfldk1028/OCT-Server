// Root.tsx
import {
  Outlet,
  useLocation,
  useNavigation,
  isRouteErrorResponse,
} from 'react-router';
import { Settings } from 'luxon';
import Navigation from './common/components/navigation';
import { cn } from './lib/utils';
import { useEffect } from 'react';

export function Root() {
  Settings.defaultLocale = 'ko';
  Settings.defaultZone = 'utc';

  const location = useLocation();
  const navigation = useNavigation();
  const { pathname } = location;       // ← location에서 pathname 추출

  useEffect(() => {
    console.log('🛰️ useLocation →', location);
    console.log('🛰️ useNavigation.state →', navigation.state);
  }, [location, navigation.state]);

  const loaderData = { /* … */ };
  const isLoading = navigation.state === 'loading';
  const isLoggedIn = loaderData.user !== null;

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
          username={loaderData.profile?.username}
          avatar={loaderData.profile?.avatar}
          name={loaderData.profile?.name}
          hasNotifications={loaderData.notificationsCount > 0}
          hasMessages={false}
        />
      )}
      <Outlet
        context={{
          isLoggedIn,
          name: loaderData.profile?.name,
          userId: loaderData.user?.id,
          username: loaderData.profile?.username,
          avatar: loaderData.profile?.avatar,
          email: loaderData.user?.email,
        }}
      />
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
    // 아예 이 체크를 생략
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
