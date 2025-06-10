// main/stores/window/windowStore.ts - Win32 API 연동 ShareX 스타일 창 선택
import { createStore } from 'zustand/vanilla';
import { BrowserWindow, desktopCapturer, systemPreferences, screen, ipcMain, shell, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getWindowAtPoint as detectWindowAtPoint, getAllWindows } from '../../windowApi';

interface WindowInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  className?: string;
  hwnd?: number;
  isVisible?: boolean;
  processId?: number;
  thumbnailURL?: string;
  appIcon?: string;
  display_id?: string;
}

interface WindowState {
  isAttachedMode: boolean;
  attachPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  windowOpacity: number;
  targetWindowInfo: WindowInfo | null;
  availableWindows: WindowInfo[];
  selectedDisplayId: number | null;
  isWindowSelectionMode: boolean;
  
  setMainWindow: (window: BrowserWindow | null) => void;
  getScreenAccess: () => Promise<boolean>;
  openScreenSecurity: () => void;
  refreshAvailableWindows: () => Promise<WindowInfo[]>;
  selectWindowById: (windowId: string) => Promise<WindowInfo | null>;
  startWindowSelectionMode: () => Promise<WindowInfo | null>;
  stopWindowSelectionMode: () => void;
  attachToTargetWindow: (targetWindow: WindowInfo) => Promise<void>;
  detachFromTargetWindow: () => void;
  captureTargetWindow: () => Promise<string>;
  updateAttachPosition: (position: WindowState['attachPosition']) => void;
  cleanup: () => void;
}

let mainWindowRef: BrowserWindow | null = null;
let trackingInterval: NodeJS.Timeout | null = null;
let selectionWindow: BrowserWindow | null = null;
let borderWindows: BrowserWindow[] = [];

// 🔥 Win32 API 사용 가능 여부 확인
const isWin32Available = process.platform === 'win32';

export const windowStore = createStore<WindowState>((set, get) => ({
  isAttachedMode: false,
  attachPosition: 'top-right',
  windowOpacity: 1,
  targetWindowInfo: null,
  availableWindows: [],
  selectedDisplayId: null,
  isWindowSelectionMode: false,

  setMainWindow: (window: BrowserWindow | null) => {
    mainWindowRef = window;
    console.log('🔥 [windowStore] mainWindow 설정됨');
  },

  getScreenAccess: async (): Promise<boolean> => {
    if (process.platform !== 'darwin') {
      return true;
    }
    
    try {
      const status = systemPreferences.getMediaAccessStatus('screen');
      return status === 'granted';
    } catch (error) {
      console.error('❌ [getScreenAccess] 실패:', error);
      return false;
    }
  },

  openScreenSecurity: (): void => {
    if (process.platform === 'darwin') {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
  },

  refreshAvailableWindows: async (): Promise<WindowInfo[]> => {
    try {
      // 🔥 Win32 API로 정확한 창 정보 가져오기
      const win32Windows = await getAllWindows();
      
      set({ availableWindows: win32Windows });
      return win32Windows;
    } catch (error) {
      console.error('❌ [refreshAvailableWindows] 실패:', error);
      return [];
    }
  },

  selectWindowById: async (windowId: string): Promise<WindowInfo | null> => {
    try {
      const windows = await getAllWindows();
      const selectedWindow = windows.find(w => w.id === windowId);
      
      if (selectedWindow) {
        set({ targetWindowInfo: selectedWindow });
        return selectedWindow;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [selectWindowById] 실패:', error);
      return null;
    }
  },

  // 🔥 Win32 API를 사용한 정확한 ShareX 스타일 창 선택
  startWindowSelectionMode: async (): Promise<WindowInfo | null> => {
    return new Promise<WindowInfo | null>(async (resolve, reject) => {
      try {
        console.log('🎯 [startWindowSelectionMode] ShareX 스타일 창 선택 모드 시작 (Win32 API)');
        
        if (!mainWindowRef) {
          throw new Error('Main window not available');
        }

        // 1. 메인 창 최소화
        mainWindowRef.minimize();
        await new Promise(r => setTimeout(r, 200));
        
        set({ isWindowSelectionMode: true });

        // 2. 🔥 ShareX 스타일 전체 화면 오버레이 (반투명 빨간 배경 + 창 정보)
        const display = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = display.size;
        
        // 단일 오버레이 창으로 변경
        const overlayWindow = new BrowserWindow({
          x: 0,
          y: 0,
          width: screenWidth,
          height: screenHeight,
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          movable: false,
          focusable: false,
          show: false,
          hasShadow: false,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
          }
        });
        
        borderWindows = [overlayWindow];

        // 3. 투명한 전체 화면 오버레이
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        
        selectionWindow = new BrowserWindow({
          x: 0,
          y: 0,
          width: width,
          height: height,
          transparent: true,
          frame: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          movable: false,
          focusable: true,
          hasShadow: false,
          backgroundColor: '#00000000',
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
          }
        });

        // 4. ShareX 스타일 오버레이 HTML
        const tempHtmlPath = path.join(app.getPath('temp'), 'window-selection-win32.html');
        const overlayHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      cursor: crosshair;
      width: 100vw;
      height: 100vh;
      user-select: none;
      font-family: 'Segoe UI', Arial, sans-serif;
      pointer-events: none; /* 🔥 오버레이 자체는 마우스 이벤트 무시 */
    }
    
    .info {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      font-size: 16px;
      z-index: 10000;
      pointer-events: auto; /* 🔥 UI 요소만 이벤트 허용 */
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      border: 2px solid rgba(255, 0, 0, 0.5);
    }
    
    #current-window {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff0000;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: bold;
      display: none;
      pointer-events: auto; /* 🔥 UI 요소만 이벤트 허용 */
      box-shadow: 0 4px 16px rgba(255, 0, 0, 0.4);
      max-width: 400px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    #window-details {
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 12px;
      font-family: 'Consolas', monospace;
      z-index: 10000;
      pointer-events: auto; /* 🔥 UI 요소만 이벤트 허용 */
      border: 1px solid rgba(0, 255, 0, 0.3);
      display: none;
    }
    
    .shortcuts {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: auto; /* 🔥 UI 요소만 이벤트 허용 */
    }
    
    .key {
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="info">
    🎯 <strong>창 선택 모드</strong> - 마우스를 창 위에 올리고 클릭하세요
  </div>
  
  <div id="current-window"></div>
  
  <div id="window-details"></div>
  
  <div class="shortcuts">
    <div><span class="key">클릭</span> 창 선택</div>
    <div><span class="key">ESC</span> 취소</div>
  </div>
  
  <script>
    const { ipcRenderer } = require('electron');
    let currentWindow = null;
    
    const windowDiv = document.getElementById('current-window');
    const detailsDiv = document.getElementById('window-details');
    
    // 창 정보 업데이트
    ipcRenderer.on('window-under-mouse', (event, windowInfo) => {
      if (windowInfo) {
        currentWindow = windowInfo;
        windowDiv.textContent = windowInfo.name;
        windowDiv.style.display = 'block';
        
        // 상세 정보 표시
        detailsDiv.innerHTML = \`
          <div>창: \${windowInfo.name}</div>
          <div>위치: (\${windowInfo.x}, \${windowInfo.y})</div>
          <div>크기: \${windowInfo.width} × \${windowInfo.height}</div>
          \${windowInfo.className ? '<div>클래스: ' + windowInfo.className + '</div>' : ''}
        \`;
        detailsDiv.style.display = 'block';
      } else {
        currentWindow = null;
        windowDiv.style.display = 'none';
        detailsDiv.style.display = 'none';
      }
    });
    
    // 🔥 전역 클릭 이벤트 (오버레이를 통과해서 감지)
    document.addEventListener('click', (e) => {
      if (currentWindow) {
        ipcRenderer.send('window-selected', currentWindow);
      }
    });
    
    // ESC로 취소
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ipcRenderer.send('window-selection-cancelled');
      }
    });
  </script>
</body>
</html>`;

        await fs.promises.writeFile(tempHtmlPath, overlayHTML, 'utf8');
        
        // 🔥 오버레이가 마우스 이벤트를 통과시키도록 설정
        selectionWindow.setIgnoreMouseEvents(true, { forward: true });
        await selectionWindow.loadFile(tempHtmlPath);
        selectionWindow.show();

        // 5. 창 목록 가져오기
        const availableWindows = await get().refreshAvailableWindows();
        let currentHighlightedWindow: any = null;

        // 6. 🔥 ShareX 스타일 오버레이 표시 (반투명 배경 + 창 정보)
        const showRedBorder = (x: number, y: number, width: number, height: number, windowName: string = '') => {
          const overlayWindow = borderWindows[0];
          if (!overlayWindow) return;
          
          try {
            console.log(`🔵 ShareX 스타일 오버레이 표시: "${windowName}" (${x}, ${y}) ${width}x${height}`);
            
            // 안전한 좌표 처리
            const safeX = Math.max(0, x);
            const safeY = Math.max(0, y);
            const safeWidth = Math.max(50, width);
            const safeHeight = Math.max(50, height);
            
            // 툴팁을 선택된 창의 중앙에 표시 (화면 밖으로 나가지 않도록 조정)
            const tooltipWidth = 350;
            const tooltipHeight = 100;
            let tooltipX = safeX + (safeWidth - tooltipWidth) / 2; // 창의 가로 중앙
            let tooltipY = safeY + (safeHeight - tooltipHeight) / 2; // 창의 세로 중앙
            
            // 화면 경계 체크 및 조정
            if (tooltipX < 10) tooltipX = 10;
            if (tooltipX + tooltipWidth > screenWidth - 10) tooltipX = screenWidth - tooltipWidth - 10;
            if (tooltipY < 10) tooltipY = 10;
            if (tooltipY + tooltipHeight > screenHeight - 10) tooltipY = screenHeight - tooltipHeight - 10;
            
            // ShareX 스타일 HTML 생성
            const overlayHTML = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  html, body {
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
                    background: transparent;
                    position: relative;
                    cursor: crosshair;
                  }
                  
                  .window-selection {
                    position: absolute;
                    left: ${safeX}px;
                    top: ${safeY}px;
                    width: ${safeWidth}px;
                    height: ${safeHeight}px;
                    background: transparent;
                    border: 3px solid #007bff;
                    border-radius: 6px;
                    box-shadow: 
                      0 0 0 1px rgba(255, 255, 255, 0.8),
                      0 0 25px rgba(0, 123, 255, 0.5);
                    z-index: 10;
                    animation: borderGlow 2s ease-in-out infinite;
                  }
                  
                  @keyframes borderGlow {
                    0%, 100% { 
                      border-color: #007bff;
                      box-shadow: 
                        0 0 0 1px rgba(255, 255, 255, 0.8),
                        0 0 25px rgba(0, 123, 255, 0.5);
                    }
                    50% { 
                      border-color: #0056b3;
                      box-shadow: 
                        0 0 0 2px rgba(255, 255, 255, 1),
                        0 0 35px rgba(0, 123, 255, 0.7);
                    }
                  }
                  
                  .window-info {
                    position: absolute;
                    top: ${tooltipY}px;
                    left: ${tooltipX}px;
                    background: linear-gradient(145deg, rgba(0, 123, 255, 0.95), rgba(0, 86, 179, 0.95));
                    color: white;
                    padding: 18px 24px;
                    border-radius: 16px;
                    font-size: 14px;
                    font-weight: 600;
                    white-space: nowrap;
                    z-index: 20;
                    box-shadow: 
                      0 12px 40px rgba(0, 123, 255, 0.4),
                      0 0 0 2px rgba(255, 255, 255, 0.3),
                      inset 0 2px 0 rgba(255, 255, 255, 0.2),
                      0 0 30px rgba(0, 123, 255, 0.6);
                    backdrop-filter: blur(20px);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    min-width: 320px;
                    text-align: center;
                    animation: slideDown 0.3s ease-out, pulse 2s ease-in-out infinite;
                  }
                  
                  @keyframes slideDown {
                    from {
                      opacity: 0;
                      transform: translateY(-10px);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0);
                    }
                  }
                  
                  @keyframes pulse {
                    0%, 100% {
                      box-shadow: 
                        0 12px 40px rgba(0, 123, 255, 0.4),
                        0 0 0 2px rgba(255, 255, 255, 0.3),
                        inset 0 2px 0 rgba(255, 255, 255, 0.2),
                        0 0 30px rgba(0, 123, 255, 0.6);
                    }
                    50% {
                      box-shadow: 
                        0 16px 50px rgba(0, 123, 255, 0.6),
                        0 0 0 3px rgba(255, 255, 255, 0.5),
                        inset 0 3px 0 rgba(255, 255, 255, 0.3),
                        0 0 50px rgba(0, 123, 255, 0.8);
                    }
                  }
                  
                  .window-name {
                    display: block;
                    color: #ffffff;
                    font-weight: 700;
                    font-size: 18px;
                    margin-bottom: 10px;
                    max-width: 280px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
                    letter-spacing: 0.5px;
                  }
                  
                  .size-info {
                    color: #ffff00;
                    font-weight: 700;
                    font-size: 16px;
                    margin-bottom: 6px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                    letter-spacing: 0.3px;
                  }
                  
                  .position-info {
                    color: #ffffff;
                    font-weight: 600;
                    font-size: 14px;
                    opacity: 0.95;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                    letter-spacing: 0.2px;
                  }
                </style>
              </head>
              <body>
                <div class="window-selection"></div>
                <div class="window-info">
                  <div class="window-name">${windowName || '창 선택'}</div>
                  <div class="size-info">${safeWidth} × ${safeHeight} 픽셀</div>
                  <div class="position-info">위치: (${safeX}, ${safeY})</div>
                </div>
              </body>
              </html>
            `;
            
            overlayWindow.loadURL(`data:text/html,${encodeURIComponent(overlayHTML)}`);
            overlayWindow.setIgnoreMouseEvents(true);
            overlayWindow.show();
            
            console.log(`🔵 ShareX 스타일 오버레이 표시 완료: "${windowName}" (${safeX}, ${safeY}) ${safeWidth}x${safeHeight}`);
            
          } catch (error) {
            console.error('❌ showRedBorder 에러:', error);
          }
        };

        const hideRedBorder = () => {
          borderWindows.forEach(win => win.hide());
        };

        // 7. 🔥 Win32 API를 사용한 정확한 마우스 추적 (libwin32/koffi 호환)
        let mouseTrackingInterval: NodeJS.Timeout | null = null;
        let isTracking = false;
        
        const trackMouse = async () => {
          if (isTracking) return;
          isTracking = true;
          
          try {
            const point = screen.getCursorScreenPoint();
            
            // 🔥 libwin32/koffi 기반 Win32 API로 정확한 창 정보 가져오기
            const windowInfo = await detectWindowAtPoint(point.x, point.y);
            
            if (windowInfo && (!currentHighlightedWindow || windowInfo.id !== currentHighlightedWindow.id)) {
              currentHighlightedWindow = windowInfo;
              
              console.log(`🎯 창 감지: "${windowInfo.name}" at (${windowInfo.x}, ${windowInfo.y}) ${windowInfo.width}x${windowInfo.height}`);
              
              // libwin32/koffi에서 가져온 정확한 좌표로 ShareX 스타일 오버레이 표시
              showRedBorder(windowInfo.x, windowInfo.y, windowInfo.width, windowInfo.height, windowInfo.name);
              
              // 창 정보 전송
              selectionWindow?.webContents.send('window-under-mouse', windowInfo);
              
            } else if (!windowInfo && currentHighlightedWindow) {
              currentHighlightedWindow = null;
              hideRedBorder();
              selectionWindow?.webContents.send('window-under-mouse', null);
            }
          } catch (error) {
            console.error('❌ trackMouse 에러 (libwin32/koffi):', error);
            // 에러 발생 시 폴백: 기본 Electron API 사용
            try {
              const point = screen.getCursorScreenPoint();
              console.log(`🔄 폴백 모드: 마우스 위치 (${point.x}, ${point.y})`);
              // 폴백에서는 창 감지 없이 마우스 위치만 표시
              if (currentHighlightedWindow) {
                currentHighlightedWindow = null;
                hideRedBorder();
                selectionWindow?.webContents.send('window-under-mouse', null);
              }
            } catch (fallbackError) {
              console.error('❌ 폴백 모드도 실패:', fallbackError);
            }
          } finally {
            isTracking = false;
          }
        };

        // 마우스 추적 시작 (30ms 간격으로 빠르게)
        mouseTrackingInterval = setInterval(trackMouse, 30);

        // 8. IPC 핸들러 설정
        const handleWindowSelected = async (_event: any, windowInfo: any) => {
          console.log('✅ 창 선택됨:', windowInfo.name);
          
          cleanup();
          
          // desktopCapturer에서 해당 창 정보 가져오기
          const sources = await desktopCapturer.getSources({
            types: ['window'],
            fetchWindowIcons: true,
            thumbnailSize: { width: 192, height: 108 }
          });
          
          // 창 이름으로 매칭
          const matchedSource = sources.find(s => s.name === windowInfo.name);
          
          let selectedWindow: WindowInfo;
          
          if (matchedSource) {
            selectedWindow = {
              id: matchedSource.id,
              name: matchedSource.name,
              x: windowInfo.x,
              y: windowInfo.y,
              width: windowInfo.width,
              height: windowInfo.height,
              thumbnailURL: matchedSource.thumbnail.toDataURL(),
              appIcon: matchedSource.appIcon?.toDataURL(),
              display_id: matchedSource.display_id
            };
          } else {
            // 매칭되지 않으면 기본 정보 사용
            selectedWindow = {
              id: windowInfo.id,
              name: windowInfo.name,
              x: windowInfo.x,
              y: windowInfo.y,
              width: windowInfo.width,
              height: windowInfo.height,
              thumbnailURL: ''
            };
          }
          
          set({ 
            targetWindowInfo: selectedWindow,
            isWindowSelectionMode: false 
          });
          
          if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            mainWindowRef.restore();
          }
          
          fs.promises.unlink(tempHtmlPath).catch(() => {});
          
          resolve(selectedWindow);
        };

        const handleCancelled = () => {
          console.log('❌ 사용자가 취소함');
          cleanup();
          
          if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            mainWindowRef.restore();
          }
          
          fs.promises.unlink(tempHtmlPath).catch(() => {});
          
          resolve(null);
        };

        const cleanup = () => {
          if (mouseTrackingInterval) {
            clearInterval(mouseTrackingInterval);
            mouseTrackingInterval = null;
          }
          
          hideRedBorder();
          
          borderWindows.forEach(win => {
            if (!win.isDestroyed()) {
              win.close();
            }
          });
          borderWindows = [];
          
          if (selectionWindow && !selectionWindow.isDestroyed()) {
            selectionWindow.close();
          }
          selectionWindow = null;
          
          set({ isWindowSelectionMode: false });
          
          ipcMain.removeListener('window-selected', handleWindowSelected);
          ipcMain.removeListener('window-selection-cancelled', handleCancelled);
        };

        // IPC 리스너 등록
        ipcMain.once('window-selected', handleWindowSelected);
        ipcMain.once('window-selection-cancelled', handleCancelled);

        // 창이 닫히면 정리
        selectionWindow.on('closed', () => {
          cleanup();
          if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            mainWindowRef.restore();
          }
          resolve(null);
        });

      } catch (error) {
        console.error('❌ [startWindowSelectionMode] 실패:', error);
        
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.restore();
        }
        set({ isWindowSelectionMode: false });
        
        reject(error);
      }
    });
  },

  stopWindowSelectionMode: (): void => {
    set({ isWindowSelectionMode: false });
    
    borderWindows.forEach(win => {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });
    borderWindows = [];
    
    if (selectionWindow && !selectionWindow.isDestroyed()) {
      selectionWindow.close();
    }
    selectionWindow = null;
    
    console.log('🔄 창 선택 모드 종료');
  },

  attachToTargetWindow: async (targetWindow: WindowInfo): Promise<void> => {
    if (!mainWindowRef) {
      console.warn('⚠️ mainWindow 없음');
      return;
    }

    try {
      console.log('📌 [attachToTargetWindow] 부착 시작:', targetWindow.name);
      
      set({ 
        targetWindowInfo: targetWindow, 
        isAttachedMode: true 
      });

      mainWindowRef.setAlwaysOnTop(true);
      
      const { attachPosition } = get();
      const mainBounds = mainWindowRef.getBounds();
      const MARGIN = 20;
      
      // 타겟 창의 정확한 위치 사용 (Win32 API에서 가져온 경우)
      if (targetWindow.x !== undefined && targetWindow.y !== undefined) {
        let targetX = targetWindow.x;
        let targetY = targetWindow.y;
        
        switch (attachPosition) {
          case 'top-right':
            targetX = targetWindow.x + targetWindow.width - mainBounds.width - MARGIN;
            targetY = targetWindow.y + MARGIN;
            break;
          case 'top-left':
            targetX = targetWindow.x + MARGIN;
            targetY = targetWindow.y + MARGIN;
            break;
          case 'bottom-right':
            targetX = targetWindow.x + targetWindow.width - mainBounds.width - MARGIN;
            targetY = targetWindow.y + targetWindow.height - mainBounds.height - MARGIN;
            break;
          case 'bottom-left':
            targetX = targetWindow.x + MARGIN;
            targetY = targetWindow.y + targetWindow.height - mainBounds.height - MARGIN;
            break;
        }
        
        mainWindowRef.setBounds({ 
          x: targetX, 
          y: targetY, 
          width: mainBounds.width, 
          height: mainBounds.height 
        });
      } else {
        // 폴백: 화면 기준으로 배치
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        
        let targetX = screenWidth - mainBounds.width - MARGIN;
        let targetY = MARGIN;
        
        switch (attachPosition) {
          case 'top-left':
            targetX = MARGIN;
            targetY = MARGIN;
            break;
          case 'bottom-right':
            targetX = screenWidth - mainBounds.width - MARGIN;
            targetY = screenHeight - mainBounds.height - MARGIN;
            break;
          case 'bottom-left':
            targetX = MARGIN;
            targetY = screenHeight - mainBounds.height - MARGIN;
            break;
        }
        
        mainWindowRef.setBounds({ 
          x: targetX, 
          y: targetY, 
          width: mainBounds.width, 
          height: mainBounds.height 
        });
      }
      
      // 주기적으로 최상위 유지
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
      
      trackingInterval = setInterval(() => {
        if (!mainWindowRef || !get().isAttachedMode) {
          if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
          }
          return;
        }
        
        if (!mainWindowRef.isAlwaysOnTop()) {
          mainWindowRef.setAlwaysOnTop(true);
        }
      }, 1000);
      
      console.log('✅ [attachToTargetWindow] 부착 완료');
      
    } catch (error) {
      console.error('❌ [attachToTargetWindow] 실패:', error);
    }
  },

  detachFromTargetWindow: (): void => {
    try {
      if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
      }

      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.setAlwaysOnTop(false);
      }
      
      set({ 
        targetWindowInfo: null, 
        isAttachedMode: false 
      });
      
      console.log('🔄 [detachFromTargetWindow] 분리 완료');
    } catch (error) {
      console.error('❌ [detachFromTargetWindow] 실패:', error);
    }
  },

  captureTargetWindow: async (): Promise<string> => {
    const { targetWindowInfo } = get();
    if (!targetWindowInfo) {
      throw new Error('타겟 윈도우가 선택되지 않았습니다');
    }

    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      const targetSource = sources.find(s => s.id === targetWindowInfo.id || s.name === targetWindowInfo.name);

      if (!targetSource) {
        throw new Error('타겟 윈도우를 찾을 수 없습니다');
      }

      const screenshot = targetSource.thumbnail.toPNG().toString('base64');
      return screenshot;
      
    } catch (error) {
      console.error('❌ [captureTargetWindow] 실패:', error);
      throw error;
    }
  },

  updateAttachPosition: (position: WindowState['attachPosition']): void => {
    set({ attachPosition: position });
    
    const { isAttachedMode, targetWindowInfo } = get();
    if (isAttachedMode && targetWindowInfo) {
      get().attachToTargetWindow(targetWindowInfo);
    }
  },

  cleanup: (): void => {
    try {
      get().stopWindowSelectionMode();
      
      if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
      }
      
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.setAlwaysOnTop(false);
      }
      mainWindowRef = null;
      
      set({
        isAttachedMode: false,
        targetWindowInfo: null,
        availableWindows: [],
        selectedDisplayId: null,
        windowOpacity: 1,
        isWindowSelectionMode: false
      });
      
      console.log('✅ [windowStore] 정리 완료');
      
    } catch (error) {
      console.error('❌ [windowStore] 정리 중 오류:', error);
    }
  }
}));
