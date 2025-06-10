// main/windowApi.ts - 모든 프로그램 창 감지 버전
import { ipcMain, BrowserWindow, desktopCapturer } from 'electron';

// webpack 우회를 위한 require
declare const __non_webpack_require__: NodeRequire;
const requireNode: NodeRequire = typeof __non_webpack_require__ === 'function' ? __non_webpack_require__ : require;

// 🔥 libwin32(win32-api)에서 제공하는 user32 함수들
let user32_win32: any = null;
try {
  user32_win32 = requireNode('libwin32/user32');
  console.log('✅ libwin32/user32 로드 성공:', Object.keys(user32_win32));
} catch (e) {
  console.warn('⚠️ libwin32/user32 로드 실패:', e);
}

// 🔥 koffi로 추가할 Win32 API
let koffi: any = null;
let user32_koffi: any = null;
let WindowFromPoint: any,
    IsWindowVisible_k: any, IsIconic_k: any,
    GetWindowRect: any, GetWindowTextW: any, GetClassNameW: any,
    GetWindowThreadProcessId: any, GetCursorPos: any,
    GetWindowLong: any, GetParent: any, GetAncestor: any;
let EnumWindowsFn: any;
let RECT: any, POINT: any;

// Window styles
const GWL_STYLE = -16;
const GWL_EXSTYLE = -20;
const WS_VISIBLE = 0x10000000;
const WS_CAPTION = 0x00C00000;
const WS_CHILD = 0x40000000;
const WS_EX_TOOLWINDOW = 0x00000080;
const WS_EX_APPWINDOW = 0x00040000;
const WS_EX_TRANSPARENT = 0x00000020;
const WS_EX_LAYERED = 0x00080000;
const GA_ROOT = 2;

// 핵심 OS 창만 제외 (최소한의 필터링)
const CRITICAL_OS_CLASSES = [
  'Shell_TrayWnd', 'Progman', 'WorkerW', 'Shell_SecondaryTrayWnd',
  'FolderView', 'SysListView32', 'DirectUIHWND', 'SHELLDLL_DefView',
  'Button', 'Static', 'SysHeader32', 'ToolbarWindow32', 'ReBarWindow32',
  'MSTaskSwWClass', 'MSTaskListWClass', 'TaskListThumbnailWnd',
  'Windows.UI.Core.CoreWindow', 'ApplicationFrameWindow',
  'ImmersiveLauncher', 'SearchPane', 'NativeHWNDHost', 'Program Manager', 'Progman', 'WorkerW', 'Shell_SecondaryTrayWnd',
];


if (process.platform === 'win32') {
  try {
    // 1) koffi 로드 및 user32.dll 바인딩
    koffi = requireNode('koffi');
    user32_koffi = koffi.load('user32.dll');
    console.log('✅ koffi + user32.dll 로드 성공');

    // 2) 구조체 타입 선언
    RECT = koffi.struct('RECT', { left: 'long', top: 'long', right: 'long', bottom: 'long' });
    POINT = koffi.struct('POINT', { x: 'long', y: 'long' });
    console.log('✅ RECT, POINT 구조체 정의 완료');

    // 3) koffi 바인딩 함수 정의
    WindowFromPoint = user32_koffi.func('void* __stdcall WindowFromPoint(int32_t, int32_t)');
    IsWindowVisible_k = user32_koffi.func('bool __stdcall IsWindowVisible(void*)');
    IsIconic_k = user32_koffi.func('bool __stdcall IsIconic(void*)');
    GetWindowRect = user32_koffi.func('bool __stdcall GetWindowRect(void*, _Out_ RECT*)');
    GetWindowTextW = user32_koffi.func('int __stdcall GetWindowTextW(void*, _Out_ wchar_t*, int)');
    GetClassNameW = user32_koffi.func('int __stdcall GetClassNameW(void*, _Out_ wchar_t*, int)');
    GetWindowThreadProcessId = user32_koffi.func('uint32_t __stdcall GetWindowThreadProcessId(void*, _Out_ uint32_t*)');
    GetCursorPos = user32_koffi.func('bool __stdcall GetCursorPos(_Out_ POINT*)');
    GetWindowLong = user32_koffi.func('long __stdcall GetWindowLongW(void*, int)');
    GetParent = user32_koffi.func('void* __stdcall GetParent(void*)');
    GetAncestor = user32_koffi.func('void* __stdcall GetAncestor(void*, uint32_t)');

    // 4) EnumWindows: libwin32 제공 함수 우선, 아니면 koffi 버전 사용
    if (user32_win32 && typeof user32_win32.EnumWindows === 'function') {
      EnumWindowsFn = user32_win32.EnumWindows.bind(user32_win32);
      console.log('✅ libwin32 EnumWindows 사용');
    } else {
      EnumWindowsFn = user32_koffi.func('bool __stdcall EnumWindows(void*, intptr_t)');
      console.log('✅ koffi EnumWindows 사용');
    }

    console.log('✅ Win32 함수 정의 완료');
  } catch (e) {
    console.error('❌ koffi 로드 또는 함수 정의 실패:', e);
  }
}

// ▶ 윈도우 정보 인터페이스 (통합)
export interface WindowInfo {
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

// ▶ 캐시 및 상수
const windowCache = new Map<number, WindowInfo>();
const desktopCapturerCache = new Map<string, WindowInfo>();
let cacheUpdateTime = 0;
const CACHE_DURATION = 500;

// ▶ HWND 포인터 정규화 헬퍼
function normalizeHwnd(raw: any): { ptr: any; addr: number } {
  if (typeof raw === 'number') return { ptr: raw, addr: raw };
  return { ptr: raw, addr: Number(koffi.address(raw)) };
}

// ▶ 작업표시줄에 표시되는 실제 애플리케이션 창인지 확인 (WebRTC 방식)
function isTaskbarWindow(ptr: any, className: string, title: string): boolean {
  try {
    // 1) 핵심 시스템 창 제외
    if (CRITICAL_OS_CLASSES.includes(className)) {
      console.log(`    ⛔ 핵심 시스템 창 제외: ${className}`);
      return false;
    }

    // 2) 특정 클래스명 제외 (WebRTC 방식)
    if (className === 'Button') {
      console.log(`    ⛔ 시작 버튼 창 제외: ${className}`);
      return false;
    }

    // 3) 소유자 창이 있는지 확인
    const owner = GetParent ? GetParent(ptr) : null;
    const exStyle = GetWindowLong(ptr, GWL_EXSTYLE);
    
    // 소유자가 있으면서 WS_EX_APPWINDOW이 없으면 작업표시줄에 표시되지 않음
    if (owner && !(exStyle & WS_EX_APPWINDOW)) {
      console.log(`    ⛔ 소유자 창이 있고 WS_EX_APPWINDOW 없음`);
      return false;
    }

    // 4) 도구 창은 작업표시줄에 표시되지 않음 (WS_EX_APPWINDOW이 있는 경우 제외)
    if ((exStyle & WS_EX_TOOLWINDOW) && !(exStyle & WS_EX_APPWINDOW)) {
      console.log(`    ⛔ 도구 창 (WS_EX_TOOLWINDOW) 제외`);
      return false;
    }

    // 5) 제목이 없는 창 제외 (선택적)
    if (!title.trim()) {
      console.log(`    ⛔ 제목 없는 창 제외`);
      return false;
    }

    console.log(`    ✅ 작업표시줄 창으로 판정: "${title}" [${className}]`);
    return true;
  } catch (e) {
    console.error('isTaskbarWindow 에러:', e);
    return false;
  }
}

// ▶ 단일 윈도우 정보 조회 (Win32) - 모든 창 포함 버전
function getWindowInfo(rawHwnd: any, isFromPoint: boolean = false): WindowInfo | null {
  try {
    const { ptr, addr: hwnd } = normalizeHwnd(rawHwnd);

    // isFromPoint가 true면 최상위 창으로 이동
    let targetPtr = ptr;
    let targetHwnd = hwnd;
    
    if (isFromPoint && GetAncestor) {
      const rootWindow = GetAncestor(ptr, GA_ROOT);
      if (rootWindow) {
        const { ptr: rootPtr, addr: rootAddr } = normalizeHwnd(rootWindow);
        targetPtr = rootPtr;
        targetHwnd = rootAddr;
        console.log(`    📤 최상위 창으로 이동: 0x${hwnd.toString(16)} → 0x${targetHwnd.toString(16)}`);
      }
    }

    // 1) 기본 검사 - 보이지 않거나 아이콘화된 창만 제외
    if (!IsWindowVisible_k(targetPtr) || IsIconic_k(targetPtr)) return null;

    // 2) RECT 구조체 가져오기
    const rect: any = {};
    if (!GetWindowRect(targetPtr, rect)) return null;
    const left = rect.left;
    const top = rect.top;
    const width = rect.right - left;
    const height = rect.bottom - top;
    
    // 너무 작은 창만 제외 (30x30 이상만)
    if (width < 30 || height < 30) return null;

    // 3) 제목
    const titleBuf = ['\0'.repeat(512)];
    const tlen = GetWindowTextW(targetPtr, titleBuf, 512);
    const title = tlen > 0 ? titleBuf[0].substring(0, tlen) : '';

    // 4) 클래스명
    const classBuf = ['\0'.repeat(256)];
    const clen = GetClassNameW(targetPtr, classBuf, 256);
    const className = clen > 0 ? classBuf[0].substring(0, clen) : '';

    // 5) PID
    const pidArray: number[] = [0];
    GetWindowThreadProcessId(targetPtr, pidArray);
    const pid = pidArray[0];

    // 디버깅: 모든 창 정보 출력
    console.log(`  🔍 감지된 창: "${title}" [${className}] @(${left},${top}) ${width}×${height} PID:${pid}`);

    // 작업표시줄 창 필터링 (WebRTC 방식)
    if (!isTaskbarWindow(targetPtr, className, title)) {
      return null;
    }

    // 6) 스타일 체크 - 매우 관대하게
    const style = GetWindowLong(targetPtr, GWL_STYLE);
    const exStyle = GetWindowLong(targetPtr, GWL_EXSTYLE);
    
    // 보이지 않는 창 제외
    if (!(style & WS_VISIBLE)) {
      console.log(`    ⛔ 보이지 않는 창 제외`);
      return null;
    }
    
    // 투명하고 레이어드된 창 중 제목이 없는 것 제외 (오버레이 등)
    if ((exStyle & WS_EX_TRANSPARENT) && (exStyle & WS_EX_LAYERED) && !title) {
      console.log(`    ⛔ 투명 오버레이 창 제외`);
      return null;
    }
    
    // isFromPoint일 때는 자식 창도 OK (최상위로 이동했으므로)
    // 전체 열거할 때만 자식 창 체크
    if (!isFromPoint && (style & WS_CHILD)) {
      // 자식 창이어도 제목이 있으면 포함
      if (!title) {
        console.log(`    ⛔ 제목 없는 자식 창 제외`);
        return null;
      }
    }
    
    console.log(`    ✅ 프로그램 창으로 판정: "${title || className}"`);
    
    return {
      id: `hwnd-${targetHwnd}`,
      name: title || `Window (${className})`,
      x: left,
      y: top,
      width,
      height,
      className,
      hwnd: targetHwnd,
      isVisible: true,
      processId: pid,
    };
  } catch (e) {
    console.error('getWindowInfo error:', e);
    return null;
  }
}

// ▶ 모든 윈도우 열거 (Win32)
function enumerateAllWindows(): WindowInfo[] {
  const list: WindowInfo[] = [];
  if (EnumWindowsFn) {
    const seen = new Set<number>();
    const cb = (h: any) => {
      try {
        const info = getWindowInfo(h, false);
        if (info && !seen.has(info.hwnd!)) {
          list.push(info);
          seen.add(info.hwnd!);
        }
        // libwin32는 number를 기대함 (1 = continue, 0 = stop)
        return 1;
      } catch (e) {
        console.error('EnumWindows 콜백 에러:', e);
        return 1; // 계속 진행
      }
    };
    
    try {
      EnumWindowsFn(cb, 0);
      cacheUpdateTime = Date.now();
      console.log(`✅ Win32로 ${list.length}개 창 발견`);
    } catch (e) {
      console.error('❌ EnumWindows 호출 실패:', e);
    }
  }
  return list;
}

// ▶ 좌표에 포함된 창 찾기 (자식 창까지 검사)
async function findWindowAtCoordinates(x: number, y: number): Promise<WindowInfo | null> {
  try {
    const allWindows = enumerateAllWindows();
    const candidateWindows: WindowInfo[] = [];
    
    // 1) 모든 창에서 좌표가 포함된 창들 찾기
    for (const window of allWindows) {
      if (x >= window.x && x <= window.x + window.width &&
          y >= window.y && y <= window.y + window.height) {
        candidateWindows.push(window);
        console.log(`    📍 좌표 포함 후보: "${window.name}" @(${window.x},${window.y}) ${window.width}×${window.height}`);
      }
    }
    
    if (candidateWindows.length === 0) {
      return null;
    }
    
    // 2) 가장 작은 창 우선 (더 정확한 타겟)
    candidateWindows.sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      return areaA - areaB;
    });
    
    // 3) 첫 번째 후보에 desktopCapturer 정보 추가
    const bestCandidate = candidateWindows[0];
    console.log(`    ✅ 최적 후보 선택: "${bestCandidate.name}" (${bestCandidate.width}×${bestCandidate.height})`);
    
    await addDesktopCapturerInfo(bestCandidate);
    return bestCandidate;
    
  } catch (e) {
    console.error('findWindowAtCoordinates 에러:', e);
    return null;
  }
}

// ▶ desktopCapturer 정보 추가
async function addDesktopCapturerInfo(windowInfo: WindowInfo): Promise<void> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      fetchWindowIcons: true,
      thumbnailSize: { width: 192, height: 108 }
    });
    
    const matchedSource = sources.find(s => {
      if (s.name === windowInfo.name) return true;
      if (windowInfo.name.includes(s.name) || s.name.includes(windowInfo.name)) return true;
      if (windowInfo.className && s.name.includes(windowInfo.className)) return true;
      return false;
    });
    
    if (matchedSource) {
      windowInfo.display_id = matchedSource.display_id;
      if (matchedSource.thumbnail) {
        windowInfo.thumbnailURL = matchedSource.thumbnail.toDataURL();
      }
      if (matchedSource.appIcon) {
        windowInfo.appIcon = matchedSource.appIcon.toDataURL();
      }
      console.log(`    🔗 desktopCapturer 매칭: "${matchedSource.name}"`);
    }
  } catch (e) {
    console.error('addDesktopCapturerInfo 에러:', e);
  }
}

// ▶ desktopCapturer와 Win32 정보 병합 - 개선된 버전
async function mergeWithDesktopCapturer(win32Windows: WindowInfo[]): Promise<WindowInfo[]> {
  try {
    // desktopCapturer로 썸네일과 아이콘 가져오기
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      fetchWindowIcons: true,
      thumbnailSize: { width: 192, height: 108 }
    });
    
    console.log(`📸 desktopCapturer: ${sources.length}개 소스 발견`);
    
    // Win32 창에 desktopCapturer 정보 추가
    for (const window of win32Windows) {
      // 이름으로 매칭 (정확히 일치하거나 포함하는 경우)
      const matchedSource = sources.find(s => 
        s.name === window.name || 
        window.name.includes(s.name) || 
        s.name.includes(window.name)
      );
      
      if (matchedSource) {
        window.display_id = matchedSource.display_id;
        if (matchedSource.thumbnail) {
          window.thumbnailURL = matchedSource.thumbnail.toDataURL();
        }
        if (matchedSource.appIcon) {
          window.appIcon = matchedSource.appIcon.toDataURL();
        }
        console.log(`  🔗 매칭됨: "${window.name}" ↔ "${matchedSource.name}"`);
      } else {
        console.log(`  ❌ 매칭 실패: "${window.name}"`);
      }
    }
    
    // Win32에서 못 찾은 창들 추가 (선택적)
    for (const source of sources) {
      if (!source.name.trim() || 
          source.name.includes('Electron') ||
          source.name.includes('DevTools') ||
          source.name === 'Desktop' ||
          source.name === 'Window') {
        continue;
      }
      
      const exists = win32Windows.some(w => 
        w.name === source.name || 
        w.name.includes(source.name) || 
        source.name.includes(w.name)
      );
      
      if (!exists) {
        const windowInfo: WindowInfo = {
          id: source.id,
          name: source.name,
          x: 100,
          y: 100,
          width: 800,
          height: 600,
          display_id: source.display_id
        };
        
        if (source.thumbnail) {
          windowInfo.thumbnailURL = source.thumbnail.toDataURL();
        }
        if (source.appIcon) {
          windowInfo.appIcon = source.appIcon.toDataURL();
        }
        
        win32Windows.push(windowInfo);
        console.log(`  ➕ desktopCapturer에서 추가: "${source.name}"`);
      }
    }
    
    return win32Windows;
  } catch (error) {
    console.error('❌ desktopCapturer 병합 실패:', error);
    return win32Windows;
  }
}

// ▶ 모든 창 가져오기 (통합)
export async function getAllWindows(): Promise<WindowInfo[]> {
  console.log('🔍 모든 창 검색 시작...');
  
  // Win32로 정확한 위치 정보 가져오기
  const win32Windows = enumerateAllWindows();
  console.log(`📊 Win32로 ${win32Windows.length}개 프로그램 창 발견`);
  
  // desktopCapturer로 썸네일/아이콘 추가
  const mergedWindows = await mergeWithDesktopCapturer(win32Windows);
  
  // 캐시 업데이트
  windowCache.clear();
  desktopCapturerCache.clear();
  for (const window of mergedWindows) {
    if (window.hwnd) {
      windowCache.set(window.hwnd, window);
    }
    if (window.display_id) {
      desktopCapturerCache.set(window.display_id, window);
    }
  }
  
  console.log(`✅ 총 ${mergedWindows.length}개 창 발견 (Win32 + desktopCapturer)`);
  mergedWindows.forEach((w, i) => {
    console.log(`  ${i+1}. "${w.name}" - ${w.width}×${w.height} at (${w.x}, ${w.y}) ${w.display_id ? '✅캡처가능' : '❌캡처불가'}`);
  });
  
  return mergedWindows;
}

// ▶ 좌표 위 윈도우 조회 - 개선된 버전
export async function getWindowAtPoint(x: number, y: number): Promise<WindowInfo | null> {
  console.log(`🔍 getWindowAtPoint(${x},${y})`);
  
  if (WindowFromPoint) {
    const raw = WindowFromPoint(x, y);
    if (!raw) {
      console.log('❌ WindowFromPoint가 null 반환');
      return null;
    }
    
    const { addr } = normalizeHwnd(raw);
    console.log(`  🎯 HWND: 0x${addr.toString(16)}`);
    
    // 먼저 원본 창 정보 확인 (GetAncestor 사용하지 않음)
    const directInfo = getWindowInfo(raw, false);
    if (directInfo) {
      console.log(`  ✅ 직접 창 발견: "${directInfo.name}"`);
      
      // desktopCapturer 정보 추가
      await addDesktopCapturerInfo(directInfo);
      return directInfo;
    }
    
    // 직접 창이 시스템 창이면 해당 좌표의 모든 창 검색
    console.log('  🔍 좌표에 포함된 모든 창 검색 중...');
    const windowAtCoords = await findWindowAtCoordinates(x, y);
    if (windowAtCoords) {
      console.log(`  ✅ 좌표 검색으로 창 발견: "${windowAtCoords.name}"`);
      return windowAtCoords;
    }
    
    console.log('  ❌ 해당 좌표에서 유효한 창을 찾을 수 없음');
    return null;
  }
  
  // Electron BrowserWindow fallback
  for (const w of BrowserWindow.getAllWindows()) {
    const b = w.getBounds();
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
      const electronWindow: WindowInfo = {
        id: `electron-${w.id}`,
        name: w.getTitle(),
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        isVisible: true,
      };
      console.log(`✅ Electron 창 발견: "${electronWindow.name}"`);
      return electronWindow;
    }
  }
  
  console.log('❌ 창을 찾을 수 없음');
  return null;
}

// ▶ IPC 핸들러 등록
export function registerWindowApi() {
  ipcMain.handle('window-at-point', (_e, { x, y }) => getWindowAtPoint(x, y));
  ipcMain.handle('get-all-windows', () => getAllWindows());
  console.log('✅ [windowApi] IPC handlers registered');
}

// ▶ 프로세스 종료 시 캐시 정리
process.on('exit', () => {
  windowCache.clear();
  desktopCapturerCache.clear();
  console.log('🔄 windowCache cleared');
});