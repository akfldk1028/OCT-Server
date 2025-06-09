// window.ts - 윈도우 관리 및 페이드 효과 기능
import { app, BrowserWindow, ipcMain, shell, screen } from 'electron';
import path from 'path';
import { resolveHtmlPath } from './util';
import MenuBuilder from './menu';

// 페이드 효과 관련 변수 및 상수
let mainWindow: BrowserWindow | null = null;
let fadeInterval: NodeJS.Timeout | null = null;
let showTimeout: NodeJS.Timeout | null = null;

const FADE_STEP = 0.1;
const FADE_INTERVAL = 16;
const SHOW_DELAY = 500;

/**
 * 페이드 효과 실행 함수
 */
function executeFade(show: boolean, resolve: () => void) {
  if (!mainWindow) {
    resolve();
    return;
  }

  if (show) {
    mainWindow.setOpacity(0);
    mainWindow.showInactive();
  }

  let opacity = show ? 0 : 1;

  fadeInterval = setInterval(() => {
    if (!mainWindow) {
      if (fadeInterval) clearInterval(fadeInterval);
      resolve();
      return;
    }

    opacity = show ? opacity + FADE_STEP : opacity - FADE_STEP;
    opacity = Math.min(Math.max(opacity, 0), 1);
    mainWindow.setOpacity(opacity);

    if ((show && opacity >= 1) || (!show && opacity <= 0)) {
      if (fadeInterval) clearInterval(fadeInterval);
      if (!show) mainWindow.hide();
      resolve();
    }
  }, FADE_INTERVAL);
}

/**
 * 윈도우 페이드 인/아웃 효과 함수
 */
export function fadeWindow(show: boolean, immediate = false): Promise<void> {
  return new Promise((resolve) => {
    if (!mainWindow) {
      resolve();
      return;
    }

    if (fadeInterval) {
      clearInterval(fadeInterval);
    }

    if (!show) {
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
      executeFade(show, resolve);
      return;
    }

    if (showTimeout) {
      clearTimeout(showTimeout);
    }

    if (immediate) {
      executeFade(show, resolve);
    } else {
      showTimeout = setTimeout(() => {
        executeFade(show, resolve);
      }, SHOW_DELAY);
    }
  });
}

/**
 * 작업 실행 중 윈도우를 숨겼다가 작업 완료 후 다시 표시하는 함수
 */
export async function hideWindowBlock<T>(
  operation: () => Promise<T> | T,
): Promise<T> {
  try {
    await fadeWindow(false);
    const result = await Promise.resolve(operation());
    return result;
  } finally {
    await fadeWindow(true);
  }
}

/**
 * 윈도우 표시 상태 변경 함수
 */
export async function showWindow(show: boolean) {
  if (mainWindow) {
    await fadeWindow(show);
  }
}

/**
 * 메인 윈도우 생성 함수
 */
export async function createMainWindow(
  getAssetPath: (...paths: string[]) => string,
  options: {
    width?: number;
    height?: number;
    preloadPath?: string;
    transparent?: boolean;
    frame?: boolean;
    alwaysOnTop?: boolean;
  } = {}
): Promise<BrowserWindow> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  // width: screenWidth || 1024,
  // height: screenHeight || 728,
  // 기본 옵션과 사용자 지정 옵션 병합
  const windowOptions = {
    width: options.width || 1024,
    height: options.height || 728,
    transparent: false,  // 투명 설정을 false로 변경
    frame: true,        // 프레임 없는 설정 유지
    alwaysOnTop: false,
    preloadPath: options.preloadPath || (app.isPackaged
      ? path.join(__dirname, 'preload.js')
      : path.join(__dirname, '../../.erb/dll/preload.js')),
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: windowOptions.width,
    height: windowOptions.height,
    icon: getAssetPath('icon.png'),
    transparent: windowOptions.transparent,
    frame: windowOptions.frame,
    alwaysOnTop: windowOptions.alwaysOnTop,
    webPreferences: {
      preload: windowOptions.preloadPath,
      devTools: true, // ✅ 개발자 도구 활성화 (F12 사용 가능)
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      // 페이드 인 효과로 창 표시
      fadeWindow(true, true);
    }
  });

  mainWindow.on('closed', () => {
    if (fadeInterval) {
      clearInterval(fadeInterval);
    }
    if (showTimeout) {
      clearTimeout(showTimeout);
    }
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // IPC 핸들러 설정
  setupIPCHandlers();

  return mainWindow;
}

/**
 * IPC 핸들러 설정
 */
function setupIPCHandlers() {
  ipcMain.handle('minimize-window', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('close-window', async () => {
    if (mainWindow) {
      await fadeWindow(false);
      mainWindow.close();
    }
  });

  ipcMain.handle('show-window', async (_, show: boolean) => {
    await fadeWindow(show);
    return { success: true };
  });
}

/**
 * 메인 윈도우 인스턴스 반환
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * 윈도우 업데이트 함수
 */
export function updateMainWindow(window: BrowserWindow | null) {
  mainWindow = window;
}

/**
 * 정리 함수 - 모든 타이머 제거
 */
export function cleanup() {
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  
  if (showTimeout) {
    clearTimeout(showTimeout);
    showTimeout = null;
  }
}