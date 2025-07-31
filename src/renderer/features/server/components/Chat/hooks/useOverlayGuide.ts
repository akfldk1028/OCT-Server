import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from '@/hooks/useStore';

interface OverlayGuideState {
  isGuideMode: boolean;
  isGenerating: boolean;
  currentStep: number;
  totalSteps: number;
  error: string | null;
}

export function useOverlayGuide(sessionId: string | undefined) {
  const dispatch = useDispatch();
  const [state, setState] = useState<OverlayGuideState>({
    isGuideMode: false,
    isGenerating: false,
    currentStep: 0,
    totalSteps: 0,
    error: null,
  });

  // 🎯 오버레이 가이드 트리거 - 심플 버전
  const triggerOverlayGuide = useCallback(async (question: string) => {
    if (!sessionId) {
      console.warn('⚠️ [useOverlayGuide] sessionId가 없습니다');
      return;
    }

    try {
      console.log('🎯 [useOverlayGuide] 오버레이 가이드 트리거:', question);

      // 1. 현재 선택된 창 확인
      const currentTargetWindow = (window as any).combinedStore?.getState()?.window?.targetWindowInfo;
      
      if (!currentTargetWindow) {
        console.log('⚠️ [useOverlayGuide] 선택된 창 없음');
        
        await dispatch({
          type: 'chat.addMessage',
          payload: {
            sessionId,
            message: {
              id: `overlay-no-window-${Date.now()}`,
              content: `❗ **창을 먼저 선택해주세요**\n\n` +
                `오버레이 가이드를 사용하려면 먼저 채팅 헤더에서 창을 선택해주세요.\n\n` +
                `1. 📱 채팅 헤더의 "창 선택" 버튼 클릭\n` +
                `2. 🎯 대상 창 선택\n` +
                `3. 💬 다시 질문하기`,
              role: 'system',
              timestamp: new Date().toISOString(),
              metadata: {
                type: 'window-selection-required'
              }
            }
          }
        });
        return;
      }

      console.log('✅ [useOverlayGuide] 선택된 창 사용:', currentTargetWindow.name);

      // 2. 오버레이 모드로 메시지 전송
      console.log('🎯 [useOverlayGuide] 오버레이 모드 메시지 전송...');
      
      // 창 선택 완료 메시지
      await dispatch({
        type: 'chat.addMessage',
        payload: {
          sessionId,
          message: {
            id: `overlay-ready-${Date.now()}`,
            content: `🎯 **${currentTargetWindow.name}에서 분석 시작!**\n\nAI가 해당 창을 분석하여 도움을 드리겠습니다.`,
            role: 'system',
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'window-analysis-start',
              windowName: currentTargetWindow.name,
              windowId: currentTargetWindow.id
            }
          }
        }
      });

      // 오버레이 모드로 메시지 전송
      await dispatch({
        type: 'chat.sendOverlayMessage',
        payload: {
          sessionId,
          content: `[🎯 ${currentTargetWindow.name}에서] ${question}`,
          selectedTags: [],
          triggerOverlay: true
        }
      });

    } catch (error) {
      console.error('❌ [useOverlayGuide] 오버레이 가이드 실행 실패:', error);
      
      // 에러 메시지 추가
      await dispatch({
        type: 'chat.addMessage',
        payload: {
          sessionId,
          message: {
            id: `overlay-error-${Date.now()}`,
            content: `❌ **오버레이 가이드 실행 중 오류 발생**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n일반 모드로 진행합니다.`,
            role: 'system',
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'overlay-error',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        }
      });

      // 폴백: 일반 메시지로 전송
      await dispatch({
        type: 'chat.sendStreamingMessage',
        payload: {
          sessionId,
          content: question,
          selectedTags: [],
          isOverlayMode: false
        }
      });
    }
  }, [sessionId, dispatch]);

  // 🔥 창 분리 (오버레이 모드 종료)
  const detachFromWindow = useCallback(async () => {
    try {
      console.log('🔄 [useOverlayGuide] 창에서 분리 중...');
      
      // combinedStore를 통해 직접 호출
      const windowStore = (window as any).combinedStore?.getState()?.window;
      if (windowStore?.detachFromTargetWindow) {
        windowStore.detachFromTargetWindow();
      }
      
      if (sessionId) {
        await dispatch({
          type: 'chat.addMessage',
          payload: {
            sessionId,
            message: {
              id: `overlay-detached-${Date.now()}`,
              content: `🔄 **오버레이 모드 종료**\n\n일반 채팅 모드로 돌아갑니다.`,
              role: 'system',
              timestamp: new Date().toISOString(),
              metadata: {
                type: 'window-detached'
              }
            }
          }
        });
      }
      
      console.log('✅ [useOverlayGuide] 창 분리 완료');
      
    } catch (error) {
      console.error('❌ [useOverlayGuide] 창 분리 실패:', error);
    }
  }, [sessionId, dispatch]);

  // 🔍 사용 가능한 창 목록 조회
  const getAvailableWindows = useCallback(async () => {
    try {
      const windowStore = (window as any).combinedStore?.getState()?.window;
      
      if (windowStore?.refreshAvailableWindows) {
        const windows = await windowStore.refreshAvailableWindows();
        console.log('🔍 [useOverlayGuide] 사용 가능한 창:', windows.length, '개');
        return windows;
      }
      
      console.warn('⚠️ [useOverlayGuide] windowStore를 찾을 수 없음');
      return [];
    } catch (error) {
      console.error('❌ [useOverlayGuide] 창 목록 조회 실패:', error);
      return [];
    }
  }, []);

  // 🎯 특정 창 선택 (ID 기반)
  const selectWindowById = useCallback(async (windowId: string) => {
    if (!sessionId) return { success: false, reason: 'no-session' };

    try {
      console.log('🎯 [useOverlayGuide] 특정 창 선택:', windowId);
      
      const windowStore = (window as any).combinedStore?.getState()?.window;
      
      if (!windowStore?.selectWindowById || !windowStore?.attachToTargetWindow) {
        console.warn('⚠️ [useOverlayGuide] windowStore 메서드를 찾을 수 없음');
        return { success: false, reason: 'store-not-available' };
      }
      
      // 창 선택
      const selectedWindow = await windowStore.selectWindowById(windowId);
      
      if (selectedWindow) {
        // 창에 부착
        await windowStore.attachToTargetWindow(selectedWindow);
        
        await dispatch({
          type: 'chat.addMessage',
          payload: {
            sessionId,
            message: {
              id: `window-selected-${Date.now()}`,
              content: `🎯 **${selectedWindow.name}이 선택되었습니다!**`,
              role: 'system',
              timestamp: new Date().toISOString(),
              metadata: {
                type: 'window-selected',
                windowName: selectedWindow.name,
                windowId: selectedWindow.id
              }
            }
          }
        });
        
        return { success: true, window: selectedWindow };
      } else {
        return { success: false, reason: 'window-not-found' };
      }
      
    } catch (error) {
      console.error('❌ [useOverlayGuide] 특정 창 선택 실패:', error);
      return { success: false, reason: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [sessionId, dispatch]);

  // 🔥 오버레이 가이드 트리거 (Window-Specific 캡처 통합)
  const triggerOverlayGuideIntegrated = useCallback(async (question: string) => {
    try {
      console.log('🎯 [useOverlayGuide] 가이드 트리거:', question);
      
      setState(prev => ({ 
        ...prev, 
        isGenerating: true, 
        error: null,
        isGuideMode: true
      }));

      // 🔥 combinedStore 접근 방식 수정 (올바른 IPC 사용)
      if (typeof window !== 'undefined' && window.electron && window.electron.ipcRenderer) {
        // IPC를 통해 메인 프로세스의 스토어에 접근
        const result = await window.electron.ipcRenderer.invoke('overlay-process-guide', {
          software: 'unknown', // 자동 감지됨
          question: question
        });
        
        if (result.success) {
          console.log('✅ [useOverlayGuide] 가이드 처리 완료');
          setState(prev => ({ 
            ...prev, 
            isGenerating: false,
            currentStep: 1,
            totalSteps: result.totalSteps || 1
          }));
        } else {
          throw new Error(result.error || '가이드 생성 실패');
        }
      } else {
        throw new Error('Electron IPC를 사용할 수 없습니다');
      }
      
    } catch (error: any) {
      console.error('❌ [useOverlayGuide] 가이드 트리거 실패:', error);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: error.message 
      }));
    }
  }, []);

  // 🔥 창 선택 모드 시작
  const startWindowSelectionIntegrated = useCallback(async () => {
    try {
      console.log('🖱️ [useOverlayGuide] 창 선택 모드 시작');
      
      if (typeof window !== 'undefined' && window.electron && window.electron.ipcRenderer) {
        // IPC를 통해 창 선택 모드 시작
        const selectedWindow = await window.electron.ipcRenderer.invoke('window-start-selection-mode');
        
        if (selectedWindow) {
          console.log('✅ [useOverlayGuide] 창 선택 완료:', selectedWindow.name);
          
          // 선택된 창에 부착
          await window.electron.ipcRenderer.invoke('window-attach-to-target', selectedWindow);
          
          return selectedWindow;
        } else {
          console.log('❌ [useOverlayGuide] 창 선택 취소됨');
          return null;
        }
      } else {
        throw new Error('Electron IPC를 사용할 수 없습니다');
      }
      
    } catch (error: any) {
      console.error('❌ [useOverlayGuide] 창 선택 실패:', error);
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }
  }, []);

  // 🔥 가이드 모드 종료
  const exitGuideModeIntegrated = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isGuideMode: false,
      currentStep: 0,
      totalSteps: 0,
      error: null
    }));
  }, []);

  // 🔥 다음 단계로 이동
  const nextStepIntegrated = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.totalSteps)
    }));
  }, []);

  // 🔥 이전 단계로 이동
  const prevStepIntegrated = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1)
    }));
  }, []);

  // 🔥 에러 클리어
  const clearErrorIntegrated = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // 상태
    isGuideMode: state.isGuideMode,
    isGenerating: state.isGenerating,
    currentStep: state.currentStep,
    totalSteps: state.totalSteps,
    error: state.error,
    
    // 액션
    triggerOverlayGuide,
    detachFromWindow,
    getAvailableWindows,
    selectWindowById,
    triggerOverlayGuideIntegrated,
    startWindowSelectionIntegrated,
    exitGuideModeIntegrated,
    nextStepIntegrated,
    prevStepIntegrated,
    clearErrorIntegrated,
  };
} 