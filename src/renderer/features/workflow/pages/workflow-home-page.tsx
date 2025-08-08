import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';

export async function loader() {
  return null;
}

export default function WorkflowHomePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sorting = params.get('sorting');

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">워크플로우</h1>
      <p className="text-muted-foreground mb-6">
        기본 워크플로우 리스트 페이지입니다{sorting ? ` (정렬: ${sorting})` : ''}.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => navigate('/workflows/templates')}>
          템플릿 보기
        </Button>
        <Button variant="outline" onClick={() => navigate('/workflows/templates?sorting=popular')}>
          인기 템플릿
        </Button>
        <Button variant="outline" onClick={() => navigate('/workflows/templates?sorting=newest')}>
          최신 템플릿
        </Button>
      </div>
    </div>
  );
}


