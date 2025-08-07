import { isRouteErrorResponse } from 'react-router';
import { Button } from '@/components/ui/button';

export function ErrorBoundary({ error }: { error: unknown }) {
  console.error('🔥 [ErrorBoundary] 에러 발생:', error);
  
  if (isRouteErrorResponse(error)) {
    console.error('🔥 [ErrorBoundary] Route Error Response:', {
      status: error.status,
      statusText: error.statusText,
      data: error.data
    });
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">
          {error.status} {error.statusText}
        </h1>
        <p className="text-muted-foreground mb-6">{error.data}</p>
        <Button onClick={() => window.location.reload()}>
          페이지 새로고침
        </Button>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">에러가 발생했습니다</h1>
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <Button onClick={() => window.location.reload()}>
          페이지 새로고침
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">알 수 없는 에러</h1>
      <p className="text-muted-foreground mb-6">
        예상치 못한 에러가 발생했습니다.
      </p>
      <Button onClick={() => window.location.reload()}>
        페이지 새로고침
      </Button>
    </div>
  );
} 