



// // main/stores/window/windowStore.ts - ShareX 스타일 실시간 창 하이라이트
// import { createStore } from 'zustand/vanilla';
// import { BrowserWindow, desktopCapturer, systemPreferences, screen, ipcMain, shell, app } from 'electron';
// import * as path from 'path';
// import * as fs from 'fs';
// import { getWindowAtPoint as detectWindowAtPoint } from '../../windowApi'; // 🔥 로컬 함수 import

// interface WindowInfo {
//   id: string;
//   name: string;
//   thumbnailURL: string;
//   appIcon?: string;
//   display_id?: string;
//   bounds?: {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//   };
// }

// interface WindowState {
//   isAttachedMode: boolean;
//   attachPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
//   windowOpacity: number;
//   targetWindowInfo: WindowInfo | null;
//   availableWindows: WindowInfo[];
//   selectedDisplayId: number | null;
//   isWindowSelectionMode: boolean;
  
//   setMainWindow: (window: BrowserWindow | null) => void;
//   getScreenAccess: () => Promise<boolean>;
//   openScreenSecurity: () => void;
//   refreshAvailableWindows: () => Promise<WindowInfo[]>;
//   selectWindowById: (windowId: string) => Promise<WindowInfo | null>;
//   startWindowSelectionMode: () => Promise<WindowInfo | null>;
//   stopWindowSelectionMode: () => void;
//   attachToTargetWindow: (targetWindow: WindowInfo) => Promise<void>;
//   detachFromTargetWindow: () => void;
//   captureTargetWindow: () => Promise<string>;
//   updateAttachPosition: (position: WindowState['attachPosition']) => void;
//   cleanup: () => void;
// }

// let mainWindowRef: BrowserWindow | null = null;
// let trackingInterval: NodeJS.Timeout | null = null;
// let selectionWindow: BrowserWindow | null = null;
// let borderWindows: BrowserWindow[] = [];

// // 🔥 Windows API를 사용한 정확한 창 감지 함수
// interface WinApiWindowInfo {
//   id: string;
//   name: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// }

// // 🔥 로컬 함수를 사용한 창 감지 (메인 프로세스용)
// async function getWindowAtPoint(x: number, y: number): Promise<WinApiWindowInfo | null> {
//   console.log(`🔍 [windowStore] getWindowAtPoint 호출: (${x}, ${y})`);
  
//   try {
//     // windowApi.ts의 로컬 함수 사용
//     const result = detectWindowAtPoint(x, y);
//     console.log(`✅ [windowStore] 창 감지 결과:`, result);
//     return result;
//   } catch (error) {
//     console.error('❌ [windowStore] getWindowAtPoint 에러:', error);
//     return null;
//   }
// }

// export const windowStore = createStore<WindowState>((set, get) => ({
//   isAttachedMode: false,
//   attachPosition: 'top-right',
//   windowOpacity: 1,
//   targetWindowInfo: null,
//   availableWindows: [],
//   selectedDisplayId: null,
//   isWindowSelectionMode: false,

//   setMainWindow: (window: BrowserWindow | null) => {
//     mainWindowRef = window;
//     console.log('🔥 [windowStore] mainWindow 설정됨');
//   },

//   getScreenAccess: async (): Promise<boolean> => {
//     if (process.platform !== 'darwin') {
//       return true;
//     }
    
//     try {
//       const status = systemPreferences.getMediaAccessStatus('screen');
//       return status === 'granted';
//     } catch (error) {
//       console.error('❌ [getScreenAccess] 실패:', error);
//       return false;
//     }
//   },

//   openScreenSecurity: (): void => {
//     if (process.platform === 'darwin') {
//       shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
//     }
//   },

//   refreshAvailableWindows: async (): Promise<WindowInfo[]> => {
//     try {
//       const sources = await desktopCapturer.getSources({
//         types: ['window'],
//         fetchWindowIcons: true,
//         thumbnailSize: { width: 192, height: 108 }
//       });

//       const validWindows: WindowInfo[] = sources
//         .filter(source => 
//           !source.name.includes('Electron') && 
//           !source.name.includes('DevTools') &&
//           !source.name.includes('Window Selection') &&
//           source.name.trim() !== '' &&
//           source.name !== 'Desktop' &&
//           !source.name.includes('Screen')
//         )
//         .map(source => ({
//           id: source.id,
//           name: source.name,
//           thumbnailURL: source.thumbnail.toDataURL(),
//           appIcon: source.appIcon?.toDataURL(),
//           display_id: source.display_id
//         }));

//       set({ availableWindows: validWindows });
//       return validWindows;
//     } catch (error) {
//       console.error('❌ [refreshAvailableWindows] 실패:', error);
//       return [];
//     }
//   },

//   selectWindowById: async (windowId: string): Promise<WindowInfo | null> => {
//     try {
//       const sources = await desktopCapturer.getSources({
//         types: ['window'],
//         fetchWindowIcons: true,
//         thumbnailSize: { width: 192, height: 108 }
//       });

//       const source = sources.find(s => s.id === windowId);
//       if (source) {
//         const selectedWindow: WindowInfo = {
//           id: source.id,
//           name: source.name,
//           thumbnailURL: source.thumbnail.toDataURL(),
//           appIcon: source.appIcon?.toDataURL(),
//           display_id: source.display_id
//         };
        
//         set({ targetWindowInfo: selectedWindow });
//         return selectedWindow;
//       }
      
//       return null;
//     } catch (error) {
//       console.error('❌ [selectWindowById] 실패:', error);
//       return null;
//     }
//   },

//   // 🔥 ShareX 스타일 창 선택 모드 - 실시간 호버 + 빨간 테두리
//   startWindowSelectionMode: async (): Promise<WindowInfo | null> => {
//     return new Promise<WindowInfo | null>(async (resolve, reject) => {
//       try {
//         console.log('🎯 [startWindowSelectionMode] ShareX 스타일 창 선택 모드 시작');
        
//         if (!mainWindowRef) {
//           throw new Error('Main window not available');
//         }

//         // 1. 메인 창 최소화
//         mainWindowRef.minimize();
//         await new Promise(r => setTimeout(r, 200));
        
//         set({ isWindowSelectionMode: true });

//         // 2. 🔥 ShareX 스타일 빨간 테두리를 위한 4개의 창 생성 (상, 하, 좌, 우)
//         const createBorderWindow = (): BrowserWindow => {
//           const win = new BrowserWindow({
//             x: 0,
//             y: 0,
//             width: 0,
//             height: 0,
//             frame: false,
//             transparent: false,
//             alwaysOnTop: true,
//             skipTaskbar: true,
//             resizable: false,
//             movable: false,
//             focusable: false,
//             show: false,
//             backgroundColor: '#ff0000', // 빨간색 배경
//             hasShadow: false,
//             webPreferences: {
//               nodeIntegration: false,
//               contextIsolation: true
//             }
//           });
          
//           // 🔥 얇고 연한 빨간색 테두리 HTML (ShareX 스타일)
//           const redHTML = `
//             <!DOCTYPE html>
//             <html>
//             <head>
//               <style>
//                 * { margin: 0; padding: 0; }
//                 html, body {
//                   width: 100%;
//                   height: 100%;
//                   background: rgba(255, 100, 100, 0.8) !important;
//                   overflow: hidden;
//                   animation: subtlePulse 2s ease-in-out infinite alternate;
//                 }
                
//                 @keyframes subtlePulse {
//                   0% { 
//                     background: rgba(255, 100, 100, 0.7) !important; 
//                     opacity: 0.8;
//                   }
//                   100% { 
//                     background: rgba(255, 120, 120, 0.9) !important; 
//                     opacity: 1.0;
//                   }
//                 }
                
//                 /* 부드러운 그라데이션 효과 */
//                 body::before {
//                   content: '';
//                   position: absolute;
//                   top: 0;
//                   left: 0;
//                   right: 0;
//                   bottom: 0;
//                   background: linear-gradient(45deg, 
//                     rgba(255, 80, 80, 0.6) 0%, 
//                     rgba(255, 120, 120, 0.8) 50%, 
//                     rgba(255, 80, 80, 0.6) 100%);
//                   animation: gentleShift 3s ease-in-out infinite;
//                 }
                
//                 @keyframes gentleShift {
//                   0%, 100% { opacity: 0.7; }
//                   50% { opacity: 0.9; }
//                 }
//               </style>
//             </head>
//             <body></body>
//             </html>
//           `;
          
//           win.loadURL(`data:text/html,${encodeURIComponent(redHTML)}`);
//           win.setIgnoreMouseEvents(true); // 마우스 이벤트 무시
          
//           console.log('🔴 ShareX 스타일 borderWindow 생성됨');
//           return win;
//         };
        
//         // 4개의 테두리 창 생성
//         borderWindows = [];
//         for (let i = 0; i < 4; i++) {
//           borderWindows.push(createBorderWindow());
//         }

//         // 3. 투명한 전체 화면 오버레이 (마우스 추적용)
//         const primaryDisplay = screen.getPrimaryDisplay();
//         const { width, height } = primaryDisplay.size;
        
//         selectionWindow = new BrowserWindow({
//           x: 0,
//           y: 0,
//           width: width,
//           height: height,
//           transparent: true,
//           frame: false,
//           alwaysOnTop: true,
//           skipTaskbar: true,
//           resizable: false,
//           movable: false,
//           focusable: true,
//           hasShadow: false,
//           backgroundColor: '#00000000',
//           webPreferences: {
//             nodeIntegration: true,
//             contextIsolation: false,
//             webSecurity: false
//           }
//         });

//         // 4. 🔥 ShareX 스타일 개선된 오버레이 HTML
//         const tempHtmlPath = path.join(app.getPath('temp'), 'window-selection-hover.html');
//         const overlayHTML = `<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="UTF-8">
//   <style>
//     body {
//       margin: 0;
//       padding: 0;
//       background: transparent;
//       cursor: crosshair;
//       width: 100vw;
//       height: 100vh;
//       user-select: none;
//       font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//     }
    
//     /* 상단 안내 메시지 */
//     .info {
//       position: fixed;
//       top: 20px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(30, 30, 30, 0.95));
//       color: white;
//       padding: 20px 40px;
//       border-radius: 12px;
//       font-size: 18px;
//       font-weight: 500;
//       z-index: 10000;
//       pointer-events: none;
//       box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
//       border: 2px solid rgba(255, 255, 255, 0.1);
//       backdrop-filter: blur(10px);
//       animation: fadeInDown 0.5s ease-out;
//     }
    
//     /* 현재 창 정보 표시 */
//     #current-window {
//       position: fixed;
//       bottom: 30px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: linear-gradient(135deg, #ff3333, #ff0000);
//       color: white;
//       padding: 15px 30px;
//       border-radius: 10px;
//       font-size: 16px;
//       font-weight: bold;
//       display: none;
//       pointer-events: none;
//       box-shadow: 0 6px 24px rgba(255, 0, 0, 0.4);
//       border: 2px solid rgba(255, 255, 255, 0.2);
//       animation: slideInUp 0.3s ease-out;
//       max-width: 400px;
//       text-align: center;
//       white-space: nowrap;
//       overflow: hidden;
//       text-overflow: ellipsis;
//     }
    
//     /* 마우스 좌표 표시 */
//     #mouse-coords {
//       position: fixed;
//       top: 20px;
//       right: 20px;
//       background: rgba(0, 0, 0, 0.8);
//       color: #00ff00;
//       padding: 10px 15px;
//       border-radius: 6px;
//       font-size: 12px;
//       font-family: 'Courier New', monospace;
//       z-index: 10000;
//       pointer-events: none;
//       border: 1px solid rgba(0, 255, 0, 0.3);
//     }
    
//     /* 키보드 단축키 안내 */
//     .shortcuts {
//       position: fixed;
//       bottom: 20px;
//       right: 20px;
//       background: rgba(0, 0, 0, 0.8);
//       color: white;
//       padding: 15px;
//       border-radius: 8px;
//       font-size: 12px;
//       z-index: 10000;
//       pointer-events: none;
//       border: 1px solid rgba(255, 255, 255, 0.2);
//     }
    
//     .shortcuts div {
//       margin: 3px 0;
//     }
    
//     .key {
//       background: rgba(255, 255, 255, 0.2);
//       padding: 2px 6px;
//       border-radius: 3px;
//       font-weight: bold;
//     }
    
//     /* 애니메이션 */
//     @keyframes fadeInDown {
//       from {
//         opacity: 0;
//         transform: translateX(-50%) translateY(-20px);
//       }
//       to {
//         opacity: 1;
//         transform: translateX(-50%) translateY(0);
//       }
//     }
    
//     @keyframes slideInUp {
//       from {
//         opacity: 0;
//         transform: translateX(-50%) translateY(20px);
//       }
//       to {
//         opacity: 1;
//         transform: translateX(-50%) translateY(0);
//       }
//     }
    
//     /* 펄스 효과 */
//     .pulse {
//       animation: pulse 1.5s ease-in-out infinite;
//     }
    
//     @keyframes pulse {
//       0%, 100% { transform: translateX(-50%) scale(1); }
//       50% { transform: translateX(-50%) scale(1.05); }
//     }
//   </style>
// </head>
// <body>
//   <div class="info">
//     🎯 <strong>ShareX 스타일 창 선택</strong><br>
//     마우스를 창 위에 올려서 빨간 테두리 확인 후 클릭하세요
//   </div>
  
//   <div id="current-window"></div>
  
//   <div id="mouse-coords">
//     마우스: (0, 0)
//   </div>
  
//   <div class="shortcuts">
//     <div><span class="key">클릭</span> 창 선택</div>
//     <div><span class="key">ESC</span> 취소</div>
//     <div><span class="key">마우스 이동</span> 창 감지</div>
//   </div>
  
//   <script>
//     const { ipcRenderer } = require('electron');
//     let currentWindow = null;
//     let mouseTracking = null;
    
//     // DOM 요소들
//     const windowDiv = document.getElementById('current-window');
//     const coordsDiv = document.getElementById('mouse-coords');
//     const infoDiv = document.querySelector('.info');
    
//     // 마우스 추적 시작 (성능 최적화: 30ms 간격)
//     function startMouseTracking() {
//       mouseTracking = setInterval(() => {
//         // 실제 마우스 좌표는 메인 프로세스에서 가져옴
//         // 여기서는 화면 좌표 표시용
//         updateMouseCoords();
//       }, 30);
//     }
    
//     // 마우스 좌표 업데이트
//     function updateMouseCoords() {
//       // 브라우저 내 좌표 (참고용)
//       document.addEventListener('mousemove', (e) => {
//         coordsDiv.textContent = \`마우스: (\${e.clientX}, \${e.clientY})\`;
//       });
//     }
    
//     // 현재 창 정보 업데이트
//     ipcRenderer.on('window-under-mouse', (event, windowInfo) => {
//       if (windowInfo) {
//         currentWindow = windowInfo;
//         windowDiv.textContent = \`🎯 \${windowInfo.name}\`;
//         windowDiv.style.display = 'block';
//         windowDiv.classList.add('pulse');
        
//         // 정보 메시지 업데이트
//         infoDiv.innerHTML = \`
//           🎯 <strong>창 감지됨!</strong><br>
//           "\${windowInfo.name}" 클릭하여 선택하세요
//         \`;
//       } else {
//         currentWindow = null;
//         windowDiv.style.display = 'none';
//         windowDiv.classList.remove('pulse');
        
//         // 기본 메시지로 복원
//         infoDiv.innerHTML = \`
//           🎯 <strong>ShareX 스타일 창 선택</strong><br>
//           마우스를 창 위에 올려서 빨간 테두리 확인 후 클릭하세요
//         \`;
//       }
//     });
    
//     // 클릭으로 선택
//     document.addEventListener('click', (e) => {
//       if (currentWindow) {
//         clearInterval(mouseTracking);
        
//         // 성공 메시지 표시
//         infoDiv.innerHTML = \`✅ <strong>창 선택됨!</strong><br>"\${currentWindow.name}"\`;
//         infoDiv.style.background = 'linear-gradient(135deg, rgba(0, 150, 0, 0.95), rgba(0, 100, 0, 0.95))';
        
//         setTimeout(() => {
//           ipcRenderer.send('window-selected', currentWindow);
//         }, 500);
//       }
//     });
    
//     // ESC로 취소
//     document.addEventListener('keydown', (e) => {
//       if (e.key === 'Escape') {
//         clearInterval(mouseTracking);
        
//         // 취소 메시지 표시
//         infoDiv.innerHTML = \`❌ <strong>취소됨</strong><br>창 선택이 취소되었습니다\`;
//         infoDiv.style.background = 'linear-gradient(135deg, rgba(150, 0, 0, 0.95), rgba(100, 0, 0, 0.95))';
        
//         setTimeout(() => {
//           ipcRenderer.send('window-selection-cancelled');
//         }, 500);
//       }
//     });
    
//     // 마우스 추적 시작
//     startMouseTracking();
    
//     // 초기 좌표 업데이트
//     updateMouseCoords();
//   </script>
// </body>
// </html>`;

//         await fs.promises.writeFile(tempHtmlPath, overlayHTML, 'utf8');
        
//         // 마우스 이벤트 통과하도록 설정
//         selectionWindow.setIgnoreMouseEvents(true, { forward: true });
//         await selectionWindow.loadFile(tempHtmlPath);
//         selectionWindow.show();

//         // 5. 창 목록 미리 가져오기
//         const availableWindows = await get().refreshAvailableWindows();
//         let currentHighlightedId: string | null = null;

//         // 6. 🔥 ShareX 스타일 빨간 테두리 표시 함수 (개선됨)
//         const showRedBorder = (x: number, y: number, width: number, height: number) => {
//           console.log(`🔴 showRedBorder 호출됨: borderWindows.length=${borderWindows.length}`);
//           console.log(`🔴 테두리 좌표: x=${x}, y=${y}, width=${width}, height=${height}`);
          
//           if (borderWindows.length !== 4) {
//             console.error('❌ borderWindows가 4개가 아님:', borderWindows.length);
//             return;
//           }
          
//           try {
//             // 🔥 얇고 깔끔한 테두리 (4px)
//             const borderThickness = 4;
            
//             // 화면 경계 체크 및 조정
//             const screenBounds = screen.getPrimaryDisplay().bounds;
//             const adjustedX = Math.max(0, Math.min(x, screenBounds.width - width));
//             const adjustedY = Math.max(0, Math.min(y, screenBounds.height - height));
//             const adjustedWidth = Math.min(width, screenBounds.width - adjustedX);
//             const adjustedHeight = Math.min(height, screenBounds.height - adjustedY);
            
//             // 상단 테두리 (전체 너비)
//             console.log(`🔴 상단 테두리: x=${adjustedX}, y=${adjustedY}, w=${adjustedWidth}, h=${borderThickness}`);
//             borderWindows[0].setBounds({ 
//               x: adjustedX, 
//               y: adjustedY, 
//               width: adjustedWidth, 
//               height: borderThickness 
//             });
//             borderWindows[0].setAlwaysOnTop(true, 'screen-saver');
//             borderWindows[0].show();
            
//             // 하단 테두리 (전체 너비)
//             const bottomY = adjustedY + adjustedHeight - borderThickness;
//             console.log(`🔴 하단 테두리: x=${adjustedX}, y=${bottomY}, w=${adjustedWidth}, h=${borderThickness}`);
//             borderWindows[1].setBounds({ 
//               x: adjustedX, 
//               y: bottomY, 
//               width: adjustedWidth, 
//               height: borderThickness 
//             });
//             borderWindows[1].setAlwaysOnTop(true, 'screen-saver');
//             borderWindows[1].show();
            
//             // 좌측 테두리 (상하 테두리 제외한 높이)
//             const leftHeight = adjustedHeight - (borderThickness * 2);
//             console.log(`🔴 좌측 테두리: x=${adjustedX}, y=${adjustedY + borderThickness}, w=${borderThickness}, h=${leftHeight}`);
//             borderWindows[2].setBounds({ 
//               x: adjustedX, 
//               y: adjustedY + borderThickness, 
//               width: borderThickness, 
//               height: leftHeight 
//             });
//             borderWindows[2].setAlwaysOnTop(true, 'screen-saver');
//             borderWindows[2].show();
            
//             // 우측 테두리 (상하 테두리 제외한 높이)
//             const rightX = adjustedX + adjustedWidth - borderThickness;
//             console.log(`🔴 우측 테두리: x=${rightX}, y=${adjustedY + borderThickness}, w=${borderThickness}, h=${leftHeight}`);
//             borderWindows[3].setBounds({ 
//               x: rightX, 
//               y: adjustedY + borderThickness, 
//               width: borderThickness, 
//               height: leftHeight 
//             });
//             borderWindows[3].setAlwaysOnTop(true, 'screen-saver');
//             borderWindows[3].show();
            
//             console.log('✅ ShareX 스타일 테두리 표시 완료 (12px 두께)');
//           } catch (error) {
//             console.error('❌ showRedBorder 에러:', error);
//           }
//         };

//         const hideRedBorder = () => {
//           borderWindows.forEach(win => win.hide());
//         };

//         // 7. 🔥 최적화된 마우스 추적 핸들러
//         let mouseTrackingInterval: NodeJS.Timeout | null = null;
//         let isTracking = false; // 중복 호출 방지
        
//         const trackMouse = async () => {
//           if (isTracking) return; // 이미 처리 중이면 스킵
//           isTracking = true;
          
//           try {
//             const point = screen.getCursorScreenPoint();
            
//             // 🔥 async 함수를 제대로 await
//             const windowInfo = await getWindowAtPoint(point.x, point.y);
            
//             if (windowInfo && windowInfo.id !== currentHighlightedId) {
//               currentHighlightedId = windowInfo.id;
              
//               console.log(`🎯 새 창 감지: "${windowInfo.name}" (${windowInfo.width}x${windowInfo.height})`);
              
//               // 정확한 창 위치와 크기로 빨간 테두리 표시
//               showRedBorder(windowInfo.x, windowInfo.y, windowInfo.width, windowInfo.height);
              
//               // 창 정보 전송
//               selectionWindow?.webContents.send('window-under-mouse', {
//                 id: windowInfo.id,
//                 name: windowInfo.name
//               });
              
//             } else if (!windowInfo && currentHighlightedId) {
//               console.log(`❌ 창 영역 벗어남`);
//               currentHighlightedId = null;
//               hideRedBorder();
//               selectionWindow?.webContents.send('window-under-mouse', null);
//             }
//           } catch (error) {
//             console.error('❌ trackMouse 에러:', error);
//           } finally {
//             isTracking = false;
//           }
//         };

//         // 🔥 마우스 추적 시작 (최적화: 60ms 간격, 부드러운 추적)
//         mouseTrackingInterval = setInterval(trackMouse, 60);

//         // 8. IPC 핸들러 설정
//         const handleWindowSelected = (_event: any, windowInfo: any) => {
//           console.log('✅ 창 선택됨:', windowInfo.name);
          
//           cleanup();
          
//           const selectedWindow = availableWindows.find(w => w.id === windowInfo.id) || windowInfo;
          
//           set({ 
//             targetWindowInfo: selectedWindow,
//             isWindowSelectionMode: false 
//           });
          
//           if (mainWindowRef && !mainWindowRef.isDestroyed()) {
//             mainWindowRef.restore();
//           }
          
//           fs.promises.unlink(tempHtmlPath).catch(() => {});
          
//           resolve(selectedWindow);
//         };

//         const handleCancelled = () => {
//           console.log('❌ 사용자가 취소함');
//           cleanup();
          
//           if (mainWindowRef && !mainWindowRef.isDestroyed()) {
//             mainWindowRef.restore();
//           }
          
//           fs.promises.unlink(tempHtmlPath).catch(() => {});
          
//           resolve(null);
//         };

//         const cleanup = () => {
//           if (mouseTrackingInterval) {
//             clearInterval(mouseTrackingInterval);
//             mouseTrackingInterval = null;
//           }
          
//           hideRedBorder();
          
//           borderWindows.forEach(win => {
//             if (!win.isDestroyed()) {
//               win.close();
//             }
//           });
//           borderWindows = [];
          
//           if (selectionWindow && !selectionWindow.isDestroyed()) {
//             selectionWindow.close();
//           }
//           selectionWindow = null;
          
//           set({ isWindowSelectionMode: false });
          
//           ipcMain.removeListener('window-selected', handleWindowSelected);
//           ipcMain.removeListener('window-selection-cancelled', handleCancelled);
//         };

//         // IPC 리스너 등록
//         ipcMain.once('window-selected', handleWindowSelected);
//         ipcMain.once('window-selection-cancelled', handleCancelled);

//         // 창이 닫히면 정리
//         selectionWindow.on('closed', () => {
//           cleanup();
//           if (mainWindowRef && !mainWindowRef.isDestroyed()) {
//             mainWindowRef.restore();
//           }
//           resolve(null);
//         });

//       } catch (error) {
//         console.error('❌ [startWindowSelectionMode] 실패:', error);
        
//         if (mainWindowRef && !mainWindowRef.isDestroyed()) {
//           mainWindowRef.restore();
//         }
//         set({ isWindowSelectionMode: false });
        
//         reject(error);
//       }
//     });
//   },

//   stopWindowSelectionMode: (): void => {
//     set({ isWindowSelectionMode: false });
    
//     borderWindows.forEach(win => {
//       if (win && !win.isDestroyed()) {
//         win.close();
//       }
//     });
//     borderWindows = [];
    
//     if (selectionWindow && !selectionWindow.isDestroyed()) {
//       selectionWindow.close();
//     }
//     selectionWindow = null;
    
//     console.log('🔄 창 선택 모드 종료');
//   },

//   attachToTargetWindow: async (targetWindow: WindowInfo): Promise<void> => {
//     if (!mainWindowRef) {
//       console.warn('⚠️ mainWindow 없음');
//       return;
//     }

//     try {
//       console.log('📌 [attachToTargetWindow] 부착 시작:', targetWindow.name);
      
//       set({ 
//         targetWindowInfo: targetWindow, 
//         isAttachedMode: true 
//       });

//       mainWindowRef.setAlwaysOnTop(true);
      
//       const { attachPosition } = get();
//       const mainBounds = mainWindowRef.getBounds();
//       const MARGIN = 20;
      
//       const primaryDisplay = screen.getPrimaryDisplay();
//       const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      
//       let targetX = screenWidth - mainBounds.width - MARGIN;
//       let targetY = MARGIN;
      
//       switch (attachPosition) {
//         case 'top-left':
//           targetX = MARGIN;
//           targetY = MARGIN;
//           break;
//         case 'bottom-right':
//           targetX = screenWidth - mainBounds.width - MARGIN;
//           targetY = screenHeight - mainBounds.height - MARGIN;
//           break;
//         case 'bottom-left':
//           targetX = MARGIN;
//           targetY = screenHeight - mainBounds.height - MARGIN;
//           break;
//       }
      
//       mainWindowRef.setBounds({ 
//         x: targetX, 
//         y: targetY, 
//         width: mainBounds.width, 
//         height: mainBounds.height 
//       });
      
//       if (trackingInterval) {
//         clearInterval(trackingInterval);
//       }
      
//       trackingInterval = setInterval(() => {
//         if (!mainWindowRef || !get().isAttachedMode) {
//           if (trackingInterval) {
//             clearInterval(trackingInterval);
//             trackingInterval = null;
//           }
//           return;
//         }
        
//         if (!mainWindowRef.isAlwaysOnTop()) {
//           mainWindowRef.setAlwaysOnTop(true);
//         }
//       }, 1000);
      
//       console.log('✅ [attachToTargetWindow] 부착 완료');
      
//     } catch (error) {
//       console.error('❌ [attachToTargetWindow] 실패:', error);
//     }
//   },

//   detachFromTargetWindow: (): void => {
//     try {
//       if (trackingInterval) {
//         clearInterval(trackingInterval);
//         trackingInterval = null;
//       }

//       if (mainWindowRef && !mainWindowRef.isDestroyed()) {
//         mainWindowRef.setAlwaysOnTop(false);
//       }
      
//       set({ 
//         targetWindowInfo: null, 
//         isAttachedMode: false 
//       });
      
//       console.log('🔄 [detachFromTargetWindow] 분리 완료');
//     } catch (error) {
//       console.error('❌ [detachFromTargetWindow] 실패:', error);
//     }
//   },

//   captureTargetWindow: async (): Promise<string> => {
//     const { targetWindowInfo } = get();
//     if (!targetWindowInfo) {
//       throw new Error('타겟 윈도우가 선택되지 않았습니다');
//     }

//     try {
//       const sources = await desktopCapturer.getSources({
//         types: ['window'],
//         thumbnailSize: { width: 1920, height: 1080 }
//       });

//       const targetSource = sources.find(s => s.id === targetWindowInfo.id);

//       if (!targetSource) {
//         throw new Error('타겟 윈도우를 찾을 수 없습니다');
//       }

//       const screenshot = targetSource.thumbnail.toPNG().toString('base64');
//       return screenshot;
      
//     } catch (error) {
//       console.error('❌ [captureTargetWindow] 실패:', error);
//       throw error;
//     }
//   },

//   updateAttachPosition: (position: WindowState['attachPosition']): void => {
//     set({ attachPosition: position });
    
//     const { isAttachedMode, targetWindowInfo } = get();
//     if (isAttachedMode && targetWindowInfo) {
//       get().attachToTargetWindow(targetWindowInfo);
//     }
//   },

//   cleanup: (): void => {
//     try {
//       get().stopWindowSelectionMode();
      
//       if (trackingInterval) {
//         clearInterval(trackingInterval);
//         trackingInterval = null;
//       }
      
//       if (mainWindowRef && !mainWindowRef.isDestroyed()) {
//         mainWindowRef.setAlwaysOnTop(false);
//       }
//       mainWindowRef = null;
      
//       set({
//         isAttachedMode: false,
//         targetWindowInfo: null,
//         availableWindows: [],
//         selectedDisplayId: null,
//         windowOpacity: 1,
//         isWindowSelectionMode: false
//       });
      
//       console.log('✅ [windowStore] 정리 완료');
      
//     } catch (error) {
//       console.error('❌ [windowStore] 정리 중 오류:', error);
//     }
//   }
// }));