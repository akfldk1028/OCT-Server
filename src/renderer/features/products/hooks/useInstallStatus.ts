import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supa-client';
import { checkUserServerInstallStatus } from '../queries';

interface UseInstallStatusProps {
  userId: string;
  productId: number;
}

export function useInstallStatus({ userId, productId }: UseInstallStatusProps) {
  const [dbInstallStatus, setDbInstallStatus] = useState<any[]>([]);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [dbCheckRetryCount, setDbCheckRetryCount] = useState(0);

  // 🔥 간단하고 효율적인 설치 상태 확인
  const checkInstallStatus = useCallback(async (forceRefresh = false) => {
    if (!userId || !productId) return;

    console.log(`🔍 [checkInstallStatus] 상태 확인${forceRefresh ? ' (강제)' : ''}:`, { userId, productId });

    setIsCheckingDb(true);
    setDbCheckRetryCount(prev => prev + 1);

    try {
      // 🔥 강제 새로고침 시 약간의 지연
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const data = await checkUserServerInstallStatus(supabase, {
        profile_id: userId,
        original_server_id: productId,
      });

      console.log('✅ [checkInstallStatus] 완료:', data?.length || 0, '개 기록');
      setDbInstallStatus(data || []);
      setDbCheckRetryCount(0);
      
    } catch (error) {
      console.error('❌ [checkInstallStatus] 실패:', error);
      setDbInstallStatus([]);
    } finally {
      setIsCheckingDb(false);
    }
  }, [userId, productId]);

  // 🔥 강제 새로고침
  const refreshInstallStatus = useCallback(async () => {
    await checkInstallStatus(true);
  }, [checkInstallStatus]);

  // 🔥 초기 로드
  useEffect(() => {
    if (userId && productId) {
      checkInstallStatus(false);
    }
  }, [userId, productId, checkInstallStatus]);

  // 🔥 간단한 계산
  const isActuallyInstalled = dbInstallStatus.length > 0;
  const actualInstallMethods = dbInstallStatus.map(status => status.mcp_install_methods).filter(Boolean);

  return {
    dbInstallStatus,
    isCheckingDb,
    dbCheckRetryCount,
    isActuallyInstalled,
    actualInstallMethods,
    refreshInstallStatus
  };
} 