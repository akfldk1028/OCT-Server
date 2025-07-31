import { useState, useEffect } from 'react';

interface ClientsStatus {
  ai: 'idle' | 'thinking' | 'responding';
  overlay: 'idle' | 'analyzing' | 'generating';
}

export function useCooperativeClients(sessionId: string | undefined) {
  const [aiClientId, setAiClientId] = useState<string | null>(null);
  const [overlayClientId, setOverlayClientId] = useState<string | null>(null);
  const [clientsStatus, setClientsStatus] = useState<ClientsStatus>({
    ai: 'idle',
    overlay: 'idle'
  });

  // 🤖👁️ 협업 클라이언트 초기화 (조용하게, 토글만 준비)
  useEffect(() => {
    if (!sessionId) return;
    
    // 🔥 토글 상태만 준비하고 실제 실행은 채팅 시에만
    let mounted = true;
    
    const prepareCooperativeMode = () => {
      if (!mounted) return;
      
      try {
        // 🔥 가상 ID만 생성 (실제 동작은 메시지 전송 시)
        const tempAiId = `ai-${sessionId}-${Date.now()}`;
        const tempOverlayId = `overlay-${sessionId}-${Date.now()}`;
        
        setAiClientId(tempAiId);
        setOverlayClientId(tempOverlayId);
        
        console.log('🤝 [useCooperativeClients] 협업 모드 준비 완료 (아직 비활성)');
        
      } catch (error) {
        console.error('❌ [useCooperativeClients] 협업 모드 준비 실패:', error);
      }
    };

    // 조용하게 준비만
    const timeoutId = setTimeout(prepareCooperativeMode, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionId]);

  return {
    aiClientId,
    overlayClientId,
    clientsStatus,
    setClientsStatus
  };
} 