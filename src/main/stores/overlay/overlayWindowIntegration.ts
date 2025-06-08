// main/stores/integration/overlayWindowIntegration.ts

import { overlayStore } from '../overlay/overlayStore';
import { windowStore } from '../window/windowStore';
import { chatStore } from '../chat/chatStore';

/**
 * Overlay 가이드 모드를 Window 선택 모드와 통합
 */
export const integrateOverlayWithWindow = () => {
  
  // overlayStore의 TAKE_SCREENSHOT 함수를 오버라이드
  const originalTakeScreenshot = overlayStore.getState().TAKE_SCREENSHOT;
  
  overlayStore.setState({
    // 스크린샷 촬영 함수 개선
    TAKE_SCREENSHOT: async (hideWindow, showWindow) => {
      const { isAttachedMode, targetWindow } = windowStore.getState();
      
      // 1. Attached Mode인 경우 타겟 윈도우만 캡처
      if (isAttachedMode && targetWindow) {
        try {
          const screenshot = await windowStore.getState().captureTargetWindow();
          // Base64를 파일로 저장하고 경로 반환하는 로직 추가 필요
          return `data:image/png;base64,${screenshot}`;
        } catch (error) {
          console.error('타겟 윈도우 캡처 실패:', error);
          // 실패시 전체 화면 캡처로 폴백
        }
      }
      
      // 2. 일반 모드는 기존 방식 사용
      return originalTakeScreenshot(hideWindow, showWindow);
    },

    // 프로세스 가이드 함수 개선
    PROCESS_GUIDE: async (payload) => {
      const { software, question } = payload;
      
      // 1. 창 선택 모드 활성화
      const targetWindow = await windowStore.getState().selectTargetWindow();
      
      if (targetWindow) {
        // 2. 선택된 창에 부착
        await windowStore.getState().attachToTargetWindow(targetWindow);
        
        // 3. 소프트웨어 자동 감지 (창 제목 기반)
        const detectedSoftware = identifySoftwareFromTitle(targetWindow.title);
        
        // 4. 기존 프로세스 가이드 실행
        const result = await overlayStore.getState().PROCESS_GUIDE({
          software: detectedSoftware || software,
          question
        });
        
        return result;
      }
      
      // 창 선택 취소시 일반 모드로 진행
      return overlayStore.getState().PROCESS_GUIDE(payload);
    }
  });
};

/**
 * 창 제목으로 소프트웨어 식별
 */
function identifySoftwareFromTitle(title: string): string {
  const titleLower = title.toLowerCase();
  
  const softwareMap: Record<string, string[]> = {
    'vscode': ['visual studio code', 'vscode', 'code'],
    'chrome': ['google chrome', 'chrome'],
    'photoshop': ['adobe photoshop', 'photoshop'],
    'figma': ['figma'],
    'slack': ['slack'],
    'discord': ['discord'],
    'notion': ['notion'],
    'excel': ['microsoft excel', 'excel'],
    'word': ['microsoft word', 'word'],
    'powerpoint': ['microsoft powerpoint', 'powerpoint'],
    'terminal': ['terminal', 'powershell', 'cmd', 'command prompt'],
  };
  
  for (const [software, keywords] of Object.entries(softwareMap)) {
    if (keywords.some(keyword => titleLower.includes(keyword))) {
      return software;
    }
  }
  
  return 'unknown';
}

/**
 * Chat 메시지에서 창 선택 모드 트리거
 */
export const setupWindowSelectionTrigger = () => {
  // 채팅에서 특정 명령어 감지
  const originalSendMessage = chatStore.getState().sendStreamingMessage;
  
  chatStore.setState({
    sendStreamingMessage: async (payload) => {
      const { content } = payload;
      
      // "이 창에서", "이 프로그램에서" 등의 키워드 감지
      if (content.includes('이 창에서') || 
          content.includes('이 프로그램에서') ||
          content.includes('여기서')) {
        
        // 창 선택 모드 활성화
        const targetWindow = await windowStore.getState().selectTargetWindow();
        
        if (targetWindow) {
          await windowStore.getState().attachToTargetWindow(targetWindow);
          
          // 메시지에 컨텍스트 추가
          payload.content = `[${targetWindow.title}에서] ${content}`;
        }
      }
      
      return originalSendMessage(payload);
    }
  });
};

/**
 * 윈도우 위치 동기화 설정
 */
export const setupWindowPositionSync = () => {
  // 메인 윈도우가 이동할 때 타겟 윈도우와의 상대 위치 유지
  const { mainWindow } = windowStore.getState();
  
  if (mainWindow) {
    mainWindow.on('moved', () => {
      const { isAttachedMode } = windowStore.getState();
      if (!isAttachedMode) return;
      
      // 상대 위치 재계산
      windowStore.getState().autoPositionWindow();
    });
  }
};