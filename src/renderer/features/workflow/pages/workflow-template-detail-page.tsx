import React from 'react';
import { useParams } from 'react-router';

export async function loader() {
  return null;
}

export default function WorkflowTemplateDetailPage() {
  const params = useParams();
  const { id } = params as { id?: string };
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">템플릿 상세</h1>
      <p className="text-muted-foreground">템플릿 ID: {id || 'unknown'}</p>
    </div>
  );
}


