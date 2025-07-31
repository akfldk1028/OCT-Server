// main/stores/integration/overlayWindowIntegration.ts
// 🎯 심플한 Window-Specific Overlay 통합

import { overlayStore } from '../overlay/overlayStore';
import { windowStore } from '../window/windowStore';
import { chatStore } from '../chat/chatStore';

/**
 * 🎯 Window-Specific Overlay 시스템 - 심플 버전
 * Electron 공식 API만 사용하는 크로스 플랫폼 구현
 */
export const integrateOverlayWithWindow = () => {
  
  // 🔥 기존 overlay의 스크린샷 함수를 Window-Specific으로 교체
  const originalTakeScreenshot = overlayStore.getState().TAKE_SCREENSHOT;
  
  overlayStore.setState({
    // 🎯 Window-Specific 스크린샷
    TAKE_SCREENSHOT: async (hideWindow, showWindow) => {
      const { targetWindowInfo, isAttachedMode } = windowStore.getState();
      
      console.log('📸 [Window-Specific Screenshot] 시작:', { isAttachedMode, hasTarget: !!targetWindowInfo });
      
      // 🎯 창이 선택되어 있지 않으면 창 선택
      if (!targetWindowInfo) {
        console.log('⚠️ [Window-Specific] 선택된 창 없음 - 전체 화면 캡처');
        return originalTakeScreenshot(hideWindow, showWindow);
      }
      
      // 🎯 선택된 창만 캡처
      try {
        console.log('📸 [Window-Specific] 타겟 창 캡처 중...');
        
        const screenshot = await windowStore.getState().captureTargetWindow();
        
        // Base64를 임시 파일로 저장
        const fs = require('fs');
        const path = require('path');
        const { app } = require('electron');
        
        const tempDir = app.getPath('temp');
        const screenshotPath = path.join(tempDir, `window-capture-${Date.now()}.png`);
        
        // Base64를 파일로 저장
        const base64Data = screenshot.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(screenshotPath, base64Data, 'base64');
        
        console.log('✅ [Window-Specific] 창 캡처 완료:', screenshotPath);
        return screenshotPath;
        
      } catch (error) {
        console.error('❌ [Window-Specific] 창 캡처 실패:', error);
        // 실패시 전체 화면 캡처로 폴백
        return originalTakeScreenshot(hideWindow, showWindow);
      }
    },

    // 🎯 프로세스 가이드 - Window-Specific 모드
    PROCESS_GUIDE: async (payload) => {
      const { software, question } = payload;
      
      console.log('🎯 [Window-Specific Guide] 시작:', { software, question });
      
      // 타겟 창 정보 가져오기
      let targetWindowInfo = windowStore.getState().targetWindowInfo;
      
      if (!targetWindowInfo) {
        console.log('⚠️ [Window-Specific Guide] 선택된 창 없음 - 일반 모드로 진행');
        return overlayStore.getState().PROCESS_GUIDE(payload);
      }
      
      // 창이 여전히 존재하는지 확인
      const availableWindows = await windowStore.getState().refreshAvailableWindows();
      const stillExists = availableWindows.find(w => w.id === targetWindowInfo?.id);
      
      if (!stillExists) {
        console.log('⚠️ [Window-Specific Guide] 기존 창이 사라짐');
        windowStore.getState().detachFromTargetWindow();
        return overlayStore.getState().PROCESS_GUIDE(payload);
      }
      
      // 소프트웨어 자동 감지
      const detectedSoftware = identifySoftwareFromTitle(targetWindowInfo.name);
      console.log('🔍 [Window-Specific Guide] 소프트웨어 감지:', detectedSoftware);
      
      // Window-Specific 가이드 실행
      const enhancedPayload = {
        software: detectedSoftware || software,
        question: `[${targetWindowInfo.name}에서] ${question}`,
        targetWindow: {
          name: targetWindowInfo.name,
          id: targetWindowInfo.id
        }
      };
      
      try {
        const result = await overlayStore.getState().PROCESS_GUIDE(enhancedPayload);
        console.log('✅ [Window-Specific Guide] 가이드 완료');
        return result;
      } catch (error) {
        console.error('❌ [Window-Specific Guide] 실행 실패:', error);
        throw error;
      }
    },

    // 🔥 창 선택 모드 토글
    TOGGLE_WINDOW_MODE: async (enabled: boolean) => {
      if (enabled) {
        console.log('🎯 [Window-Specific] 창 선택 모드 활성화');
        
        // 화면 접근 권한 확인
        const hasAccess = await windowStore.getState().getScreenAccess();
        if (!hasAccess) {
          console.warn('⚠️ [Window-Specific] 화면 접근 권한 필요');
          windowStore.getState().openScreenSecurity();
          return { success: false, reason: 'permission_required' };
        }
        
        // 창 목록 새로고침
        const windows = await windowStore.getState().refreshAvailableWindows();
        
        if (windows.length === 0) {
          console.warn('⚠️ [Window-Specific] 사용 가능한 창 없음');
          return { success: false, reason: 'no_windows' };
        }
        
        // 첫 번째 창을 기본 선택 (UI에서 변경 가능)
        const selectedWindow = await windowStore.getState().selectWindowById(windows[0].id);
        
        if (selectedWindow) {
          await windowStore.getState().attachToTargetWindow(selectedWindow);
          console.log('✅ [Window-Specific] 모드 활성화 완료:', selectedWindow.name);
          return { success: true, window: selectedWindow };
        }
        
        return { success: false, reason: 'cancelled' };
      } else {
        console.log('🔄 [Window-Specific] 창 선택 모드 비활성화');
        windowStore.getState().detachFromTargetWindow();
        return { success: true };
      }
    },

    // 🔥 창 목록 가져오기
    GET_AVAILABLE_WINDOWS: async () => {
      try {
        console.log('🔍 [GET_AVAILABLE_WINDOWS] 창 목록 조회...');
        const windows = await windowStore.getState().refreshAvailableWindows();
        console.log(`✅ [GET_AVAILABLE_WINDOWS] ${windows.length}개 창 발견`);
        return windows;
      } catch (error) {
        console.error('❌ [GET_AVAILABLE_WINDOWS] 실패:', error);
        return [];
      }
    },

    // 🔥 특정 창 선택
    SELECT_WINDOW_BY_ID: async (windowId: string) => {
      try {
        console.log('🎯 [SELECT_WINDOW_BY_ID] 창 선택:', windowId);
        
        const selectedWindow = await windowStore.getState().selectWindowById(windowId);
        
        if (selectedWindow) {
          await windowStore.getState().attachToTargetWindow(selectedWindow);
          console.log('✅ [SELECT_WINDOW_BY_ID] 창 선택 완료:', selectedWindow.name);
          return { success: true, window: selectedWindow };
        } else {
          console.warn('⚠️ [SELECT_WINDOW_BY_ID] 창을 찾을 수 없음:', windowId);
          return { success: false, reason: 'not_found' };
        }
      } catch (error) {
        console.error('❌ [SELECT_WINDOW_BY_ID] 실패:', error);
        return { success: false, reason: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  });
};

/**
 * 🔍 창 제목으로 소프트웨어 식별
 */
function identifySoftwareFromTitle(title: string): string {
  const titleLower = title.toLowerCase();
  
  const softwareMap: Record<string, string[]> = {
    'vscode': ['visual studio code', 'vscode', 'code'],
    'chrome': ['google chrome', 'chrome'],
    'edge': ['microsoft edge', 'edge'],
    'firefox': ['firefox', 'mozilla'],
    'photoshop': ['adobe photoshop', 'photoshop'],
    'figma': ['figma'],
    'slack': ['slack'],
    'discord': ['discord'],
    'terminal': ['terminal', 'powershell', 'cmd', 'command prompt'],
    'notepad': ['notepad', '메모장'],
    'excel': ['microsoft excel', 'excel'],
    'word': ['microsoft word', 'word'],
    'powerpoint': ['microsoft powerpoint', 'powerpoint'],
    'outlook': ['microsoft outlook', 'outlook'],
    'teams': ['microsoft teams', 'teams'],
    'zoom': ['zoom'],
    'notion': ['notion'],
    'obsidian': ['obsidian'],
    'steam': ['steam'],
    'game': ['game', '게임'],
  };
  
  for (const [software, keywords] of Object.entries(softwareMap)) {
    if (keywords.some(keyword => titleLower.includes(keyword))) {
      return software;
    }
  }
  
  return 'unknown';
}

/**
 * 🎯 Chat에서 Window-Specific 모드 트리거
 */
export const setupWindowSelectionTrigger = () => {
  const originalSendMessage = chatStore.getState().sendStreamingMessage;
  
  chatStore.setState({
    sendStreamingMessage: async (payload) => {
      const { content } = payload;
      
      // 창 선택 키워드 감지
      const windowKeywords = [
        '이 창에서', '이 프로그램에서', '여기서', '현재 창',
        '이 앱에서', '이 소프트웨어에서', '이 화면에서',
        '이 윈도우에서', '현재 윈도우에서', '지금 보고 있는',
        '창을 선택해서', '특정 창에서'
      ];
      
      const needsWindowSelection = windowKeywords.some(keyword => 
        content.includes(keyword)
      );
      
      if (needsWindowSelection) {
        console.log('🎯 [WindowTrigger] 창 선택 모드 감지됨');
        
        // 화면 접근 권한 확인
        const hasAccess = await windowStore.getState().getScreenAccess();
        if (!hasAccess) {
          console.warn('⚠️ [WindowTrigger] 화면 접근 권한 필요');
          
          payload.content = `❌ **화면 접근 권한이 필요합니다**\n\n` +
            `창별 오버레이 기능을 사용하려면 화면 기록 권한이 필요합니다.\n` +
            `${process.platform === 'darwin' ? 'macOS 시스템 환경설정에서 권한을 설정해주세요.' : ''}`;
          payload.isOverlayMode = false;
          
          windowStore.getState().openScreenSecurity();
          
          return originalSendMessage(payload);
        }
        
        // 창 선택 모드 활성화
        const result = await overlayStore.getState().TOGGLE_WINDOW_MODE?.(true);
        
        if (result?.success && result.window) {
          console.log('✅ [WindowTrigger] 창 선택 완료:', result.window.name);
          
          // 메시지에 창 컨텍스트 추가
          payload.content = `[🎯 ${result.window.name}에서] ${content}`;
          payload.isOverlayMode = true;
        } else {
          console.log('⚠️ [WindowTrigger] 창 선택 실패');
          
          if (result?.reason === 'permission_required') {
            payload.content = `❌ **화면 접근 권한이 필요합니다**\n\n${content}`;
          } else if (result?.reason === 'no_windows') {
            payload.content = `⚠️ **사용 가능한 창이 없습니다**\n\n일반 모드로 진행합니다: ${content}`;
          }
          payload.isOverlayMode = false;
        }
      }
      
      return originalSendMessage(payload);
    }
  });
};

/**
 * 🚀 전체 Window-Specific Overlay 시스템 초기화
 */
export const initializeWindowSpecificOverlay = () => {
  console.log('🚀 [Window-Specific Overlay] 시스템 초기화...');
  
  try {
    integrateOverlayWithWindow();
    setupWindowSelectionTrigger();
    
    console.log('✅ [Window-Specific Overlay] 초기화 완료!');
    
    return {
      success: true,
      pattern: 'Simple Electron API based',
      features: [
        '✅ 순수 Electron API 사용 (desktopCapturer, screen)',
        '✅ 크로스 플랫폼 지원 (Windows, macOS, Linux)',
        '✅ PowerShell 등 외부 의존성 없음',
        '✅ 창별 정확한 캡처',
        '✅ 자동 소프트웨어 감지',
        '✅ 채팅에서 창 선택 키워드 감지',
        '✅ 심플하고 안정적인 구현'
      ]
    };
    
  } catch (error) {
    console.error('❌ [Window-Specific Overlay] 초기화 실패:', error);
    throw error;
  }
};