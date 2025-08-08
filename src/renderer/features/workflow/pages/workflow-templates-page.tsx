import React from 'react';
import { useSearchParams } from 'react-router';

export async function loader() {
  return null;
}

export default function WorkflowTemplatesPage() {
  const [params] = useSearchParams();
  const sorting = params.get('sorting') || 'all';

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">워크플로우 템플릿</h1>
      <p className="text-muted-foreground">현재 보기: {sorting}</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="border rounded-lg p-4 bg-card">
            <div className="font-semibold">템플릿 {i}</div>
            <div className="text-sm text-muted-foreground mt-1">샘플 설명입니다.</div>
          </div>
        ))}
      </div>
    </div>
  );
}


