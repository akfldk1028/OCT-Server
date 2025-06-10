// src/main/windowApi.ts - libwin32 + koffi 버전
import { ipcMain, desktopCapturer, screen, BrowserWindow } from 'electron';
import * as os from 'os';

// webpack 우회를 위한 타입 정의
declare const __non_webpack_require__: NodeRequire;

// 🔥 libwin32 + koffi 기반 Windows API
let libwin32: any = null;
let user32_win32: any = null; // <-- 이렇게 빈 변수로 선언만 해두세요.
let koffi: any = null;
let user32: any = null;

// Win32 함수들
let WindowFromPoint: any = null;
let GetWindowRect: any = null;
let GetWindowTextW: any = null;
let IsWindowVisible: any = null;
let GetClassNameW: any = null;
let GetForegroundWindow: any = null;
let GetWindowThreadProcessId: any = null;
let IsIconic: any = null;
let EnumWindows: any = null;
let GetCursorPos: any = null;
let FindWindowW: any = null;
let FindWindowExW: any = null;

if (process.platform === 'win32') {
  try {
    // 🔥 webpack 번들링 환경에서 안전한 동적 로딩
    const requireNode: NodeRequire =
      typeof __non_webpack_require__ === 'function'
        ? __non_webpack_require__
        : require;
    
    // 🔥 방법 1: libwin32 사용 (간단한 방법)
    try {
      libwin32 = requireNode('libwin32');
      user32_win32 = libwin32.user32;
      console.log('✅ libwin32 및 user32_win32 로드 성공');
      console.log('✅ libwin32 로드 성공');
      
      // libwin32에서 지원하는 함수들 가져오기
      if (libwin32.FindWindow) FindWindowW = libwin32.FindWindow;
      if (libwin32.FindWindowEx) FindWindowExW = libwin32.FindWindowEx;
      if (libwin32.GetWindowText) GetWindowTextW = libwin32.GetWindowText;
      if (libwin32.GetClassName) GetClassNameW = libwin32.GetClassName;
      if (libwin32.EnumWindows) EnumWindows = libwin32.EnumWindows;
      if (libwin32.GetCursorPos) GetCursorPos = libwin32.GetCursorPos;
      
      console.log('✅ libwin32 함수들 로드 완료');
    } catch (libwin32Error) {
      console.warn('⚠️ libwin32 로드 실패:', libwin32Error);
    }
    
    // 🔥 방법 2: koffi로 직접 정의 (libwin32에 없는 함수들)
    try {
      koffi = requireNode('koffi');
      user32 = koffi.load('user32.dll');
      console.log('✅ koffi + user32.dll 로드 성공');
      
             // 🔥 WindowFromPoint 정의 (libwin32에 없음) - 더 안전한 방식
       try {
         // 방법 1: 두 개의 int32 파라미터로 시도
         WindowFromPoint = user32.func('void* WindowFromPoint(int32_t x, int32_t y)');
         console.log('✅ WindowFromPoint (x, y 방식) 정의 성공');
       } catch (e1) {
         try {
           // 방법 2: POINT 구조체 방식
           WindowFromPoint = user32.func('void* WindowFromPoint(int64_t point)');
           console.log('✅ WindowFromPoint (int64 방식) 정의 성공');
         } catch (e2) {
           console.error('❌ WindowFromPoint 정의 실패:', e1, e2);
           WindowFromPoint = null;
         }
       }
      
      // 🔥 다른 필요한 함수들도 koffi로 정의
      if (!GetWindowRect) {
        GetWindowRect = user32.func('bool GetWindowRect(void* hWnd, void* lpRect)');
      }
      if (!GetWindowTextW) {
        GetWindowTextW = user32.func('int GetWindowTextW(void* hWnd, void* lpString, int nMaxCount)');
      }
      if (!IsWindowVisible) {
        IsWindowVisible = user32.func('bool IsWindowVisible(void* hWnd)');
      }
      if (!GetClassNameW) {
        GetClassNameW = user32.func('int GetClassNameW(void* hWnd, void* lpClassName, int nMaxCount)');
      }
      if (!GetForegroundWindow) {
        GetForegroundWindow = user32.func('void* GetForegroundWindow()');
      }
      if (!GetWindowThreadProcessId) {
        GetWindowThreadProcessId = user32.func('uint32_t GetWindowThreadProcessId(void* hWnd, void* lpdwProcessId)');
      }
      if (!IsIconic) {
        IsIconic = user32.func('bool IsIconic(void* hWnd)');
      }
      if (!EnumWindows) {
        EnumWindows = user32.func('bool EnumWindows(void* lpEnumFunc, intptr_t lParam)');
      }
      if (!GetCursorPos) {
        GetCursorPos = user32.func('bool GetCursorPos(void* lpPoint)');
      }
      if (!FindWindowW) {
        FindWindowW = user32.func('void* FindWindowW(const wchar_t* lpClassName, const wchar_t* lpWindowName)');
      }
      if (!FindWindowExW) {
        FindWindowExW = user32.func('void* FindWindowExW(void* hWndParent, void* hWndChildAfter, const wchar_t* lpszClass, const wchar_t* lpszWindow)');
      }
      
      console.log('✅ koffi Win32 함수들 정의 완료');
      console.log('🔍 WindowFromPoint:', typeof WindowFromPoint);
      
    } catch (koffiError) {
      console.error('❌ koffi 로드 실패:', koffiError);
    }
    
    console.log('✅ libwin32 + koffi 패키지 로드 성공');
  } catch (error) {
    console.error('❌ libwin32/koffi 로드 실패:', error);
    console.log('💡 폴백 모드로 전환: Electron API만 사용');
    libwin32 = null;
    koffi = null;
    user32 = null;
  }
}




export interface WinApiWindowInfo {
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
}

// 창 정보 캐시
const windowCache = new Map<number, WinApiWindowInfo>();
let cacheUpdateTime = 0;
const CACHE_DURATION = 500; // 0.5초

// RECT 구조체 파싱
function parseRect(buffer: Buffer): { left: number; top: number; right: number; bottom: number } {
  return {
    left: buffer.readInt32LE(0),
    top: buffer.readInt32LE(4),
    right: buffer.readInt32LE(8),
    bottom: buffer.readInt32LE(12)
  };
}

// 창 정보 가져오기
function getWindowInfo(hwnd: any): WinApiWindowInfo | null {
  try {
    // 보이는 창만
    if (!user32_win32.IsWindowVisible(hwnd)) return null;
    // 최소화된 창 제외
    if (user32_win32.IsIconic(hwnd)) return null;

    // 위치/크기 얻기
    const rect = user32_win32.GetWindowRect(hwnd);
    const width  = rect.right  - rect.left;
    const height = rect.bottom - rect.top;
    if (width < 10 || height < 10) return null;

    // 제목, 클래스, PID
    const title     = user32_win32.GetWindowText(hwnd);
    const className = user32_win32.GetClassName(hwnd);
    const pid       = user32_win32.GetWindowThreadProcessId(hwnd);

    return {
      id:        `hwnd-${hwnd}`,
      name:      title || `Window (${className})`,
      x:         rect.left,
      y:         rect.top,
      width,
      height,
      className,
      hwnd,
      isVisible: true,
      processId: pid
    };
  } catch {
    return null;
  }
}


// 🔥 모든 최상위 창 열거
function enumerateAllWindows(): WinApiWindowInfo[] {
  if (!EnumWindows || !koffi) return [];

  const windows: WinApiWindowInfo[] = [];
  const processedHandles = new Set<number>();

  try {
    // EnumWindows 콜백 정의 (koffi 방식)
    const enumCallback = koffi.callback('bool', ['void*', 'intptr_t'], (hwnd: any, lParam: number) => {
      try {
        // 🔥 koffi에서 반환되는 hwnd 안전하게 처리
        let hwndAddress: number;
        if (typeof hwnd === 'number') {
          hwndAddress = hwnd;
        } else if (typeof hwnd === 'bigint') {
          hwndAddress = Number(hwnd);
        } else if (hwnd && typeof hwnd.toString === 'function') {
          hwndAddress = parseInt(hwnd.toString());
        } else {
          hwndAddress = parseInt(String(hwnd));
        }
        
        // 이미 처리한 핸들은 스킵
        if (processedHandles.has(hwndAddress)) {
          return true;
        }
        processedHandles.add(hwndAddress);

        const info = getWindowInfo(hwnd);
        if (info) {
          windows.push(info);
          windowCache.set(hwndAddress, info);
        }
      } catch (error) {
        // 개별 창 처리 실패는 무시
      }
      return true; // 계속 열거
    });

    // 모든 최상위 창 열거
    EnumWindows(enumCallback, 0);
    
    cacheUpdateTime = Date.now();
    console.log(`✅ 총 ${windows.length}개의 창 감지됨`);
    
    return windows;

  } catch (error) {
    console.error('❌ enumerateAllWindows 에러:', error);
    return windows;
  }
}

// 🔥 마우스 위치의 창 정확히 찾기
export async function getWindowAtPoint(x: number, y: number): Promise<WinApiWindowInfo|null> {
  console.log(`🔍 getWindowAtPoint 호출: (${x}, ${y})`);

  // 1) WindowFromPoint 호출
  let rawHwnd: any;
  try {
    rawHwnd = WindowFromPoint(x, y);
    console.log('✅ WindowFromPoint 호출 결과:', rawHwnd);
  } catch (e) {
    console.error('❌ WindowFromPoint 에러:', e);
    return await getWindowAtPointFallback(x, y);
  }

  // 2) NULL 체크
  if (!rawHwnd) {
    console.log('❌ 해당 좌표에 창이 없습니다');
    return null;
  }

  // 3) koffi.address 로 포인터 주소(BigInt) 얻기 :contentReference[oaicite:0]{index=0}
  let hwndAddrBig: bigint;
  try {
    hwndAddrBig = koffi.address(rawHwnd);
  } catch (e) {
    console.error('❌ koffi.address 실패:', e);
    return await getWindowAtPointFallback(x, y);
  }

  // 4) BigInt → number 변환 (32/64비트 상관없이 안전) :contentReference[oaicite:1]{index=1}
  const hwndAddress = Number(hwndAddrBig);
  console.log(`🔍 hwndAddress: 0x${hwndAddress.toString(16)}`);

  // 5) 캐시 확인
  if (windowCache.has(hwndAddress) && (Date.now() - cacheUpdateTime) < CACHE_DURATION) {
    return windowCache.get(hwndAddress)!;
  }

  // 6) 실제 창 정보 조회
  const info = getWindowInfo(rawHwnd);
  if (info) {
    windowCache.set(hwndAddress, info);
  }
  return info;
}

// 🔥 모든 보이는 창 가져오기
export async function getAllVisibleWindows(): Promise<WinApiWindowInfo[]> {
  if (process.platform !== 'win32' || !EnumWindows) {
    return [];
  }

  try {
    // 캐시가 유효하면 사용
    if ((Date.now() - cacheUpdateTime) < CACHE_DURATION && windowCache.size > 0) {
      return Array.from(windowCache.values());
    }

    // 모든 창 새로 열거
    return enumerateAllWindows();
    
  } catch (error) {
    console.error('❌ getAllVisibleWindows 에러:', error);
    return [];
  }
}

// 🔥 폴백: Electron API만 사용 (실제 창 위치 기반)
async function getWindowAtPointFallback(x: number, y: number): Promise<WinApiWindowInfo | null> {
  try {
    console.log(`🔍 [폴백 모드] 좌표 (${x}, ${y})에서 창 찾기`);
    
    // 1. 🔥 Electron 창들의 실제 위치 먼저 확인
    const electronWindows = BrowserWindow.getAllWindows();
    
    for (const win of electronWindows) {
      if (!win.isDestroyed() && win.isVisible() && !win.isMinimized()) {
        const bounds = win.getBounds();
        
        if (x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height) {
          
          console.log(`✅ [폴백] Electron 창 발견: "${win.getTitle()}" at (${bounds.x}, ${bounds.y})`);
          
          try {
            const mediaSourceId = win.getMediaSourceId();
            return {
              id: mediaSourceId,
              name: win.getTitle() || 'Electron Window',
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              isVisible: true
            };
          } catch (error) {
            return {
              id: `electron-${win.id}`,
              name: win.getTitle() || 'Electron Window',
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              isVisible: true
            };
          }
        }
      }
    }
    
    // 2. 🔥 다른 창들은... 사실 정확한 위치를 모른다
    // desktopCapturer는 창 목록만 주고 위치는 안 줌
    // 이 경우 "추정"이 아니라 "위치를 알 수 없다"고 해야 정확함
    
    console.log(`❌ [폴백] 해당 좌표의 창 위치를 정확히 알 수 없음 - Win32 API 필요`);
    return null;
    
  } catch (error) {
    console.error('❌ getWindowAtPointFallback 에러:', error);
    return null;
  }
}



// 🔥 특정 창 추적
export async function trackWindow(windowId: string): Promise<WinApiWindowInfo | null> {
  if (windowId.startsWith('hwnd-')) {
    const hwndAddress = parseInt(windowId.replace('hwnd-', ''));
    
    if (windowCache.has(hwndAddress)) {
      return windowCache.get(hwndAddress)!;
    }
  }
  
  // 전체 창 목록에서 찾기
  const allWindows = await getAllVisibleWindows();
  return allWindows.find(w => w.id === windowId) || null;
}

// 🔥 창 위치 실시간 업데이트
export async function updateWindowPosition(windowId: string): Promise<WinApiWindowInfo | null> {
  if (!windowId.startsWith('hwnd-') || !GetWindowRect) {
    return null;
  }

  try {
    const hwndAddress = parseInt(windowId.replace('hwnd-', ''));
    
    // koffi에서는 hwnd를 직접 숫자로 사용
    const windowInfo = getWindowInfo(hwndAddress);
    if (windowInfo) {
      windowCache.set(hwndAddress, windowInfo);
    }
    
    return windowInfo;
    
  } catch (error) {
    console.error('❌ updateWindowPosition 에러:', error);
    return null;
  }
}

// 🔥 IPC 핸들러 등록
export function registerWindowApi() {
  console.log('🔧 [windowApi] IPC 핸들러 등록 중...');
  
  // 중복 등록 방지
  try {
    ipcMain.handle('window-at-point', async (_evt, { x, y }: { x: number; y: number }) => {
      return await getWindowAtPoint(x, y);
    });
    console.log('✅ window-at-point 핸들러 등록');
  } catch (error) {
    console.log('⚠️ window-at-point 핸들러 이미 등록됨');
  }
  
  try {
    ipcMain.handle('get-all-windows', async () => {
      return await getAllVisibleWindows();
    });
    console.log('✅ get-all-windows 핸들러 등록');
  } catch (error) {
    console.log('⚠️ get-all-windows 핸들러 이미 등록됨');
  }
  
  try {
    ipcMain.handle('track-window', async (_evt, { windowId }: { windowId: string }) => {
      return await trackWindow(windowId);
    });
    console.log('✅ track-window 핸들러 등록');
  } catch (error) {
    console.log('⚠️ track-window 핸들러 이미 등록됨');
  }
  
  try {
    ipcMain.handle('update-window-position', async (_evt, { windowId }: { windowId: string }) => {
      return await updateWindowPosition(windowId);
    });
    console.log('✅ update-window-position 핸들러 등록');
  } catch (error) {
    console.log('⚠️ update-window-position 핸들러 이미 등록됨');
  }
  
  console.log('✅ [windowApi] IPC 핸들러 등록 완료');
}

// 정리
process.on('exit', () => {
  windowCache.clear();
  if (libwin32) libwin32 = null;
  if (koffi) koffi = null;
  if (user32) user32 = null;
});