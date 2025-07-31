import { useState, useCallback } from 'react';
import { useDispatch } from '@/hooks/useStore';
import type { Tag } from '../TagInput';

interface ChatMessageOptions {
  sessionId: string | undefined;
  overlayMode: 'chat' | 'overlay';
  selectedTags: Tag[];
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  setSelectedTags: (tags: Tag[]) => void;
  setInput: (input: string) => void;
  scrollToBottom: () => void;
  setClientsStatus: (status: any) => void;
}

export function useChatMessage(options: ChatMessageOptions) {
  const {
    sessionId,
    overlayMode,
    selectedTags,
    isStreaming,
    setIsStreaming,
    setSelectedTags,
    setInput,
    scrollToBottom,
    setClientsStatus
  } = options;
  
  const dispatch = useDispatch();

  // 🔥 스마트 협업 메시지 전송 (AI 주도 협업 버전) - 오버레이 기능 복구!
  const sendCooperativeMessage = useCallback(async (content: string, forceOverlay: boolean = false) => {
    if (!sessionId) return;

    try {
      setClientsStatus({ 
        ai: 'thinking', 
        overlay: forceOverlay ? 'analyzing' : 'idle' 
      });
      console.log('🤖👁️ [useChatMessage] AI 주도 협업 메시지 처리 시작:', { content, forceOverlay });

      // 🔥 오버레이 모드가 활성화된 경우 chatStore.sendOverlayMessage 사용!
      if (forceOverlay) {
        console.log('👁️ [sendCooperativeMessage] 오버레이 모드 - chatStore.sendOverlayMessage 호출');
        
        try {
          setClientsStatus((prev: any) => ({ ...prev, overlay: 'analyzing' }));
          
          // 🎯 chatStore.sendOverlayMessage 사용 (오버레이 기능 통합!)
          await dispatch({
            type: 'chat.sendOverlayMessage',
            payload: {
              sessionId,
              content: content,
              selectedTags,
              triggerOverlay: true // 🔥 오버레이 트리거 활성화!
            }
          });
          
          console.log('✅ [sendCooperativeMessage] 오버레이 메시지 완료!');
          setClientsStatus((prev: any) => ({ ...prev, overlay: 'idle' }));
          
        } catch (overlayError) {
          console.error('❌ [sendCooperativeMessage] 오버레이 메시지 실패:', overlayError);
          setClientsStatus((prev: any) => ({ ...prev, overlay: 'idle' }));
          
          // 폴백: 일반 메시지로 전송
          await dispatch({
            type: 'chat.sendStreamingMessage',
            payload: {
              sessionId,
              content: content,
              selectedTags,
            }
          });
        }
      } else {
        // 🤖 일반 AI 메시지 (오버레이 없음)
        console.log('🤖 [sendCooperativeMessage] 일반 AI 메시지 전송');
        
        try {
          await dispatch({
            type: 'chat.sendStreamingMessage',
            payload: {
              sessionId,
              content: content,
              selectedTags,
            }
          });
          
          console.log('✅ [useChatMessage] AI 메시지 전송 완료!');
          
        } catch (error) {
          console.error('❌ [sendCooperativeMessage] AI 메시지 전송 실패:', error);
          
          // 🔧 fallback: 기본 메시지 전송
          await dispatch({
            type: 'chat.sendMessage',
            payload: {
              sessionId,
              content: content,
            }
          });
        }
      }

    } catch (error) {
      console.error('❌ [sendCooperativeMessage] 전체 처리 실패:', error);
    } finally {
      setClientsStatus({ ai: 'idle', overlay: 'idle' });
    }
  }, [sessionId, selectedTags, dispatch, setClientsStatus]);

  // 🔥 협업 메시지 전송 시스템 (AI + Overlay 협업)
  const sendMessage = useCallback(async (messageContent?: string, tags?: Tag[]) => {
    const contentToSend = typeof messageContent === 'string' ? messageContent : '';
    console.log('📤 [useChatMessage] 협업 sendMessage 호출');
    console.log('📝 Content:', contentToSend);
    console.log('🏷️ Tags:', tags || selectedTags);
    console.log('🤖👁️ Mode:', overlayMode);

    if (!contentToSend.trim() || !sessionId || isStreaming) {
      console.log('⛔ Message sending blocked:', {
        'input empty': !contentToSend.trim(),
        'no sessionId': !sessionId,
        isStreaming,
      });
      return;
    }

    setIsStreaming(true);

    try {
      // 🔥 새로운 협업 메시지 시스템 사용
      await sendCooperativeMessage(contentToSend, overlayMode === 'overlay');
      
      console.log('✅ [useChatMessage] 협업 메시지 전송 완료');
      
      // 메시지 전송 후 정리
      setSelectedTags([]);
      setInput('');
      
      // 📜 스크롤 (더 강력하게!)
      console.log('📜 [sendMessage] 메시지 전송 완료 - 스크롤 강제 실행!');
      
      // 즉시 스크롤
      scrollToBottom();
      
      // 추가 스크롤 시도들
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(() => scrollToBottom(), 100);
        setTimeout(() => scrollToBottom(), 200);
        setTimeout(() => scrollToBottom(), 500);
      });
    } catch (error) {
      console.error('❌ [useChatMessage] 협업 메시지 전송 실패:', error);
      
      // 폴백: 기본 메시지 전송
      dispatch({
        type: 'chat.sendMessage',
        payload: {
          sessionId,
          content: `❌ 협업 메시지 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    } finally {
      setIsStreaming(false);
      console.log('🏁 [useChatMessage] 협업 메시지 처리 완료');
    }
  }, [
    sessionId, 
    selectedTags, 
    overlayMode, 
    isStreaming, 
    sendCooperativeMessage, 
    setIsStreaming, 
    setSelectedTags, 
    setInput, 
    scrollToBottom, 
    dispatch
  ]);

  // 모델 변경
  const changeModel = useCallback((model: string) => {
    if (!sessionId) return;
    console.log('🤖 Changing model to:', model);
    dispatch({
      type: 'chat.updateConfig',
      payload: {
        sessionId,
        config: { model },
      },
    });
  }, [sessionId, dispatch]);

  return {
    sendMessage,
    sendCooperativeMessage,
    changeModel
  };
} 