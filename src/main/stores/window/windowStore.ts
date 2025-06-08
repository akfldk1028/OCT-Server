// main/stores/window/windowStore.ts
import { createStore } from 'zustand/vanilla';
import { BrowserWindow, screen, desktopCapturer } from 'electron';
import { v4 as uuidv4 } from 'uuid';

interface WindowInfo {
  id: number;
  title: string;
  bounds: Electron.Rectangle;
  processName?: string;
  thumbnailURL?: string;
}

interface WindowState {
  // 상태
  mainWindow: BrowserWindow | null;
  targetWindow: WindowInfo | null;
  fadeInterval: NodeJS.Timeout | null;
  showTimeout: NodeJS.Timeout | null;
  isAttachedMode: boolean;
  attachPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  windowOpacity: number;
  
  // Window 관리 액션
  setMainWindow: (window: BrowserWindow | null) => void;
  fadeWindow: (show: boolean, immediate?: boolean) => Promise<void>;
  hideWindowBlock: <T>(operation: () => Promise<T> | T) => Promise<T>;
  showWindow: (show: boolean) => Promise<void>;
  
  // 타겟 윈도우 관리
  selectTargetWindow: () => Promise<WindowInfo | null>;
  attachToTargetWindow: (targetWindow: WindowInfo) => Promise<void>;
  detachFromTargetWindow: () => void;
  captureTargetWindow: () => Promise<string>;
  
  // 포지션 관리
  updateAttachPosition: (position: WindowState['attachPosition']) => void;
  autoPositionWindow: () => void;
  
  // 유틸리티
  getAllWindows: () => Promise<WindowInfo[]>;
  findWindowByTitle: (title: string) => Promise<WindowInfo | null>;
  cleanup: () => void;
}

const FADE_STEP = 0.1;
const FADE_INTERVAL = 16;
const SHOW_DELAY = 500;
const ATTACH_MARGIN = 20;

export const windowStore = createStore<WindowState>((set, get) => ({
  // 초기 상태
  mainWindow: null,
  targetWindow: null,
  fadeInterval: null,
  showTimeout: null,
  isAttachedMode: false,
  attachPosition: 'top-right',
  windowOpacity: 1,

  // 메인 윈도우 설정
  setMainWindow: (window) => {
    set({ mainWindow: window });
  },

  // 페이드 효과 실행
  fadeWindow: async (show, immediate = false) => {
    const { mainWindow, fadeInterval, showTimeout } = get();
    
    return new Promise((resolve) => {
      if (!mainWindow) {
        resolve();
        return;
      }

      // 기존 인터벌 정리
      if (fadeInterval) {
        clearInterval(fadeInterval);
      }

      // 숨기기 처리
      if (!show) {
        if (showTimeout) {
          clearTimeout(showTimeout);
          set({ showTimeout: null });
        }
        executeFade(show, resolve);
        return;
      }

      // 보이기 처리
      if (showTimeout) {
        clearTimeout(showTimeout);
      }

      const executeFade = (show: boolean, resolve: () => void) => {
        if (!get().mainWindow) {
          resolve();
          return;
        }

        if (show) {
          get().mainWindow!.setOpacity(0);
          get().mainWindow!.showInactive();
        }

        let opacity = show ? 0 : 1;

        const interval = setInterval(() => {
          const { mainWindow } = get();
          if (!mainWindow) {
            clearInterval(interval);
            resolve();
            return;
          }

          opacity = show ? opacity + FADE_STEP : opacity - FADE_STEP;
          opacity = Math.min(Math.max(opacity, 0), 1);
          mainWindow.setOpacity(opacity);
          set({ windowOpacity: opacity });

          if ((show && opacity >= 1) || (!show && opacity <= 0)) {
            clearInterval(interval);
            if (!show) mainWindow.hide();
            set({ fadeInterval: null });
            resolve();
          }
        }, FADE_INTERVAL);

        set({ fadeInterval: interval });
      };

      if (immediate) {
        executeFade(show, resolve);
      } else {
        const timeout = setTimeout(() => {
          executeFade(show, resolve);
        }, SHOW_DELAY);
        set({ showTimeout: timeout });
      }
    });
  },

  // 작업 중 윈도우 숨기기
  hideWindowBlock: async (operation) => {
    try {
      await get().fadeWindow(false);
      const result = await Promise.resolve(operation());
      return result;
    } finally {
      await get().fadeWindow(true);
    }
  },

  // 윈도우 표시
  showWindow: async (show) => {
    await get().fadeWindow(show);
  },

  // 타겟 윈도우 선택 (창 선택 UI)
  selectTargetWindow: async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 150, height: 150 }
    });

    // 메인 윈도우가 있으면 렌더러에서 선택 UI 표시
    const { mainWindow } = get();
    if (mainWindow) {
      return new Promise((resolve) => {
        // 윈도우 목록을 렌더러로 전송
        const windows = sources.map(source => ({
          id: parseInt(source.id.split(':')[1]),
          title: source.name,
          thumbnailURL: source.thumbnail.toDataURL(),
          bounds: { x: 0, y: 0, width: 0, height: 0 } // 나중에 채울 예정
        }));

        mainWindow.webContents.send('show-window-selector', windows);

        // 선택 결과 대기
        const handleSelection = (_: any, windowId: number) => {
          const selected = windows.find(w => w.id === windowId);
          resolve(selected || null);
        };

        mainWindow.webContents.once('window-selected', handleSelection);
      });
    }

    return null;
  },

  // 타겟 윈도우에 부착
  attachToTargetWindow: async (targetWindow) => {
    const { mainWindow, attachPosition } = get();
    if (!mainWindow) return;

    set({ targetWindow, isAttachedMode: true });

    // 타겟 윈도우의 실제 bounds 가져오기
    const allWindows = BrowserWindow.getAllWindows();
    const target = allWindows.find(w => w.id === targetWindow.id);
    
    if (target) {
      const bounds = target.getBounds();
      targetWindow.bounds = bounds;
    }

    // 메인 윈도우 위치 계산 및 설정
    const mainBounds = mainWindow.getBounds();
    let x = 0, y = 0;

    switch (attachPosition) {
      case 'top-right':
        x = targetWindow.bounds.x + targetWindow.bounds.width - mainBounds.width - ATTACH_MARGIN;
        y = targetWindow.bounds.y + ATTACH_MARGIN;
        break;
      case 'top-left':
        x = targetWindow.bounds.x + ATTACH_MARGIN;
        y = targetWindow.bounds.y + ATTACH_MARGIN;
        break;
      case 'bottom-right':
        x = targetWindow.bounds.x + targetWindow.bounds.width - mainBounds.width - ATTACH_MARGIN;
        y = targetWindow.bounds.y + targetWindow.bounds.height - mainBounds.height - ATTACH_MARGIN;
        break;
      case 'bottom-left':
        x = targetWindow.bounds.x + ATTACH_MARGIN;
        y = targetWindow.bounds.y + targetWindow.bounds.height - mainBounds.height - ATTACH_MARGIN;
        break;
    }

    mainWindow.setBounds({ x, y });
    mainWindow.setAlwaysOnTop(true);

    // 타겟 윈도우 이동 감지 (선택사항)
    if (target) {
      target.on('moved', () => {
        get().autoPositionWindow();
      });
    }
  },

  // 타겟 윈도우에서 분리
  detachFromTargetWindow: () => {
    const { mainWindow } = get();
    if (!mainWindow) return;

    set({ 
      targetWindow: null, 
      isAttachedMode: false 
    });

    mainWindow.setAlwaysOnTop(false);
  },

  // 타겟 윈도우만 캡처
  captureTargetWindow: async () => {
    const { targetWindow } = get();
    if (!targetWindow) {
      throw new Error('No target window selected');
    }

    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { 
        width: targetWindow.bounds.width, 
        height: targetWindow.bounds.height 
      }
    });

    const source = sources.find(s => 
      parseInt(s.id.split(':')[1]) === targetWindow.id
    );

    if (!source) {
      throw new Error('Target window not found');
    }

    // Base64로 변환
    const screenshot = source.thumbnail.toPNG().toString('base64');
    
    // 스크린샷 저장 경로 (옵션)
    const screenshotPath = `target-window-${uuidv4()}.png`;
    
    return screenshot;
  },

  // 부착 위치 업데이트
  updateAttachPosition: (position) => {
    set({ attachPosition: position });
    get().autoPositionWindow();
  },

  // 자동 위치 조정
  autoPositionWindow: () => {
    const { mainWindow, targetWindow, isAttachedMode } = get();
    if (!mainWindow || !targetWindow || !isAttachedMode) return;

    get().attachToTargetWindow(targetWindow);
  },

  // 모든 윈도우 가져오기
  getAllWindows: async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 150, height: 150 }
    });

    return sources.map(source => ({
      id: parseInt(source.id.split(':')[1]),
      title: source.name,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      thumbnailURL: source.thumbnail.toDataURL()
    }));
  },

  // 제목으로 윈도우 찾기
  findWindowByTitle: async (title) => {
    const windows = await get().getAllWindows();
    return windows.find(w => 
      w.title.toLowerCase().includes(title.toLowerCase())
    ) || null;
  },

  // 정리
  cleanup: () => {
    const { fadeInterval, showTimeout } = get();
    
    if (fadeInterval) {
      clearInterval(fadeInterval);
    }
    
    if (showTimeout) {
      clearTimeout(showTimeout);
    }
    
    set({
      fadeInterval: null,
      showTimeout: null,
      mainWindow: null,
      targetWindow: null
    });
  }
}));