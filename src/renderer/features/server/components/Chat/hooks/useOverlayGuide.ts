import { useCallback } from 'react';
import { useDispatch } from '@/hooks/useStore';
import type { Tag } from '../TagInput';

export function useOverlayGuide(sessionId: string | undefined) {
  const dispatch = useDispatch();

  // 🔥 Overlay 가이드 트리거 (chatStore.sendOverlayMessage 직접 호출)
  const triggerOverlayGuide = useCallback(async (question?: string) => {
    const finalQuestion = question || '이 화면에서 할 수 있는 작업들을 알려주세요';
    console.log('👁️ [useOverlayGuide] Overlay 가이드 트리거:', finalQuestion);
    
    if (!sessionId) {
      console.error('❌ [triggerOverlayGuide] sessionId 없음');
      return;
    }
    
    try {
      // 🎯 chatStore.sendOverlayMessage 직접 호출하여 오버레이 실행
      await dispatch({
        type: 'chat.sendOverlayMessage',
        payload: {
          sessionId,
          content: finalQuestion,
          selectedTags: [],
          triggerOverlay: true // 🔥 오버레이 트리거 활성화!
        }
      });
      console.log('✅ [useOverlayGuide] Overlay 가이드 트리거 완료');
    } catch (error) {
      console.error('❌ [useOverlayGuide] Overlay 가이드 실패:', error);
    }
  }, [sessionId, dispatch]);

  return {
    triggerOverlayGuide
  };
} 