import React from 'react';
import { Outlet, useLoaderData } from 'react-router';

export async function loader() {
  // 향후: 서버에서 워크플로우/템플릿 요약 가져오기 가능
  return { ok: true } as const;
}

export default function WorkflowLayout() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _data = useLoaderData() as { ok: boolean } | undefined;
  return (
    <div className="min-h-full">
      <Outlet />
    </div>
  );
}


