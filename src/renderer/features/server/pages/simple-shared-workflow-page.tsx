import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { makeSSRClient } from '@/renderer/supa-client';
import { getWorkflowByShareToken } from '../workflow-queries';

export default function SimpleSharedWorkflowPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [shareInfo, setShareInfo] = useState<any>(null);

  useEffect(() => {
    const loadSharedWorkflow = async () => {
      if (!shareToken) {
        setError('공유 토큰이 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 공유 토큰으로 워크플로우 로드 시작:', shareToken);
        
        const { client } = makeSSRClient();
        
        const result = await getWorkflowByShareToken(client, {
          share_token: shareToken
        });
        
        const { workflow, shareInfo: shareData } = result;
        setWorkflowData(workflow);
        setShareInfo(shareData);
        
        console.log('✅ 공유 워크플로우 로드 완료:', {
          workflow: workflow.name,
          nodes: workflow.nodes?.length || 0,
          edges: workflow.edges?.length || 0,
          shareInfo: shareData
        });
        
      } catch (error) {
        console.error('❌ 워크플로우 로드 실패:', error);
        setError(error instanceof Error ? error.message : '워크플로우를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadSharedWorkflow();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">공유 워크플로우를 불러오는 중...</p>
          <p className="text-sm text-muted-foreground">토큰: {shareToken}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold">워크플로우를 불러올 수 없습니다</h2>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      {/* 헤더 */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-md"
            >
              ← 돌아가기
            </button>
            
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold">
                {shareInfo?.share_title || workflowData?.name || '공유된 워크플로우'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">읽기 전용</span>
                <span>노드: {workflowData?.nodes?.length || 0}개</span>
                <span>연결: {workflowData?.edges?.length || 0}개</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  alert('링크 복사 완료!');
                } catch (error) {
                  alert('링크 복사 실패');
                }
              }}
              className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-md"
            >
              🔗 링크 복사
            </button>

            {shareInfo?.can_copy && (
              <button
                onClick={() => alert('복사 기능은 아직 구현 중입니다')}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
              >
                📋 내 계정으로 복사
              </button>
            )}
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-4 text-sm text-muted-foreground">
          {workflowData?.profiles && (
            <span>작성자: {workflowData.profiles.name || workflowData.profiles.username || '익명'}</span>
          )}
          
          {shareInfo?.created_at && (
            <span>공유일: {new Date(shareInfo.created_at).toLocaleDateString('ko-KR')}</span>
          )}
          
          {shareInfo?.download_count !== undefined && (
            <span>조회수: {shareInfo.download_count}</span>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">워크플로우 데이터</h3>
          
          {workflowData?.nodes?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">노드 ({workflowData.nodes.length}개)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {workflowData.nodes.map((node: any, index: number) => (
                  <div key={index} className="p-3 bg-muted rounded-md">
                    <div className="font-medium text-sm">{node.node_type}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      위치: ({node.position_x}, {node.position_y})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {workflowData?.edges?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">연결 ({workflowData.edges.length}개)</h4>
              <div className="space-y-2">
                {workflowData.edges.map((edge: any, index: number) => (
                  <div key={index} className="p-2 bg-muted rounded text-sm">
                    {edge.source_node_id} → {edge.target_node_id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {shareInfo && (
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="font-medium mb-2">공유 정보</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>공유 유형: {shareInfo.share_type}</div>
                <div>보기 권한: {shareInfo.can_view ? '✅' : '❌'}</div>
                <div>복사 권한: {shareInfo.can_copy ? '✅' : '❌'}</div>
                <div>편집 권한: {shareInfo.can_edit ? '✅' : '❌'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 