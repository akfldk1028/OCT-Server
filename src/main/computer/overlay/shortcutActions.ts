// src/main/store/shortcutActions.ts
import { globalShortcut, app, BrowserWindow } from 'electron';
// dispatch 가져오기 제거, 대신 store만 가져오기
import { store } from './create';

// 메인 윈도우 참조를 위한 변수
let mainWindow: BrowserWindow | null = null;

// 단축키 관련 액션 추가
export function addShortcutActions(
  set: (state: any) => void,
  get: () => any
) {
  // 액션 실행 유틸리티 함수 - 로컬에서 store 사용
  const executeAction = (actionName: string, ...args: any[]) => {
    const state = store.getState() as any;
    if (typeof state[actionName] === 'function') {
      return state[actionName](...args);
    }
    console.error(`Action ${actionName} not found in store`);
    return null;
  };

  return {
    // 상태 확장
    shortcuts: [],

    // 액션 확장
    SET_MAIN_WINDOW: (window: BrowserWindow | null) => {
      mainWindow = window;
    },

    REGISTER_SHORTCUTS: () => {
      // 기존 단축키 해제
      globalShortcut.unregisterAll();

      // 스크린샷 단축키
      globalShortcut.register('CommandOrControl+H', async () => {
        if (!mainWindow) return;

        try {
          const hideWindow = () => mainWindow?.hide();
          const showWindow = () => mainWindow?.show();

          const screenshotPath = await executeAction('TAKE_SCREENSHOT', hideWindow, showWindow);
          const preview = await executeAction('GET_IMAGE_PREVIEW', screenshotPath);

          mainWindow.webContents.send('screenshot-taken', {
            path: screenshotPath,
            preview,
          });
        } catch (error: any) {
          console.error('Screenshot shortcut error:', error);
          set({ error: `스크린샷 캡처 오류: ${error.message}` });
        }
      });

      // 가이드 모드 단축키
      globalShortcut.register('CommandOrControl+G', async () => {
        try {
          // 가이드 모드 활성화
          executeAction('TOGGLE_GUIDE_MODE', true);

          // 스크린샷 캡처
          const hideWindow = () => mainWindow?.hide();
          const showWindow = () => mainWindow?.show();

          const screenshotPath = await executeAction('TAKE_SCREENSHOT', hideWindow, showWindow);
          const preview = await executeAction('GET_IMAGE_PREVIEW', screenshotPath);

          // 활성 소프트웨어 감지
          const activeWindow = await executeAction('DETECT_ACTIVE_SOFTWARE');

          // 가이드 생성
          const guideData = await executeAction(
            'GENERATE_GUIDE',
            activeWindow.software,
            '기본 사용법 알려줘',
            preview,
          );

          // 가이드 표시
          await executeAction('SHOW_GUIDE', guideData);
        } catch (error: any) {
          console.error('Guide shortcut error:', error);
          set({ error: `가이드 생성 오류: ${error.message}` });
        }
      });

      // 가이드 모드 토글 단축키
      globalShortcut.register('CommandOrControl+Shift+H', () => {
        executeAction('TOGGLE_GUIDE_MODE');
      });

      // 가이드 정리 단축키
      globalShortcut.register('CommandOrControl+Shift+R', () => {
        executeAction('CLEAR_GUIDE_OVERLAYS');
      });

      // 윈도우 이동 단축키
      globalShortcut.register('CommandOrControl+Left', () => {
        executeAction('MOVE_WINDOW_LEFT');
      });

      globalShortcut.register('CommandOrControl+Right', () => {
        executeAction('MOVE_WINDOW_RIGHT');
      });

      globalShortcut.register('CommandOrControl+Up', () => {
        executeAction('MOVE_WINDOW_UP');
      });

      globalShortcut.register('CommandOrControl+Down', () => {
        executeAction('MOVE_WINDOW_DOWN');
      });

      // 앱 종료 시 단축키 해제
      app.on('will-quit', () => {
        if (app.isReady()) {
          globalShortcut.unregisterAll();
        }
      });
    },

    MOVE_WINDOW_LEFT: () => {
      if (!mainWindow) return;

      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({
        ...bounds,
        x: Math.max(0, bounds.x - 50),
      });
    },

    MOVE_WINDOW_RIGHT: () => {
      if (!mainWindow) return;

      const bounds = mainWindow.getBounds();
      const screenWidth =
        require('electron').screen.getPrimaryDisplay().workAreaSize.width;
      mainWindow.setBounds({
        ...bounds,
        x: Math.min(screenWidth - bounds.width, bounds.x + 50),
      });
    },

    MOVE_WINDOW_UP: () => {
      if (!mainWindow) return;

      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({
        ...bounds,
        y: Math.max(0, bounds.y - 50),
      });
    },

    MOVE_WINDOW_DOWN: () => {
      if (!mainWindow) return;

      const bounds = mainWindow.getBounds();
      const screenHeight =
        require('electron').screen.getPrimaryDisplay().workAreaSize.height;
      mainWindow.setBounds({
        ...bounds,
        y: Math.min(screenHeight - bounds.height, bounds.y + 50),
      });
    },

    TOGGLE_MAIN_WINDOW: () => {
      if (!mainWindow) return;

      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    },
  };
}
