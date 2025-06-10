// main/windowApi.ts - 기존 성공 코드 + desktopCapturer 통합
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
    GetWindowLong: any, GetParent: any;
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

// ▶ HWND 포인터 정규화 헬퍼 (기존 코드와 동일)
function normalizeHwnd(raw: any): { ptr: any; addr: number } {
  if (typeof raw === 'number') return { ptr: raw, addr: raw };
  return { ptr: raw, addr: Number(koffi.address(raw)) };
}

// ▶ 프로그램 창인지 확인 (OS 창 필터링) - 사용 안 함
function isProgramWindow(title: string, className: string): boolean {
  return true; // 일단 모든 창 허용
}

// ▶ 단일 윈도우 정보 조회 (Win32)
function getWindowInfo(rawHwnd: any): WindowInfo | null {
  try {
    const { ptr, addr: hwnd } = normalizeHwnd(rawHwnd);

    // 1) 보임/아이콘화 검사
    if (!IsWindowVisible_k(ptr) || IsIconic_k(ptr)) return null;

    // 2) RECT 구조체 출력
    const rect: any = {};
    if (!GetWindowRect(ptr, rect)) return null;
    const left = rect.left;
    const top = rect.top;
    const width = rect.right - left;
    const height = rect.bottom - top;
    if (width < 10 || height < 10) return null;

    // 3) 제목
    const titleBuf = ['\0'.repeat(512)];
    const tlen = GetWindowTextW(ptr, titleBuf, 512);
    const title = tlen > 0 ? titleBuf[0].substring(0, tlen) : '';

    // 4) 클래스명
    const classBuf = ['\0'.repeat(256)];
    const clen = GetClassNameW(ptr, classBuf, 256);
    const className = clen > 0 ? classBuf[0].substring(0, clen) : '';

    // 5) PID
    const pidArray: number[] = [0];
    GetWindowThreadProcessId(ptr, pidArray);
    const pid = pidArray[0];

    // 디버깅: 모든 창 정보 출력
    console.log(`  🔍 감지된 창: "${title}" [${className}] @(${left},${top}) ${width}×${height} PID:${pid}`);

    // 6) GetWindowLong을 사용해서 진짜 프로그램 창인지 확인
    const style = GetWindowLong(ptr, GWL_STYLE);
    const exStyle = GetWindowLong(ptr, GWL_EXSTYLE);
    
    // 보이는 창이 아니면 제외
    if (!(style & WS_VISIBLE)) {
      console.log(`    ⛔ 보이지 않는 창 제외`);
      return null;
    }
    
    // 자식 창이면 제외 (최상위 창만)
    if (style & WS_CHILD) {
      console.log(`    ⛔ 자식 창 제외`);
      return null;
    }
    
    // 도구 창이면서 앱 창이 아니면 제외
    if ((exStyle & WS_EX_TOOLWINDOW) && !(exStyle & WS_EX_APPWINDOW)) {
      console.log(`    ⛔ 도구 창 제외`);
      return null;
    }
    
    // 부모가 있으면 제외 (팝업 등)
    const parent = GetParent(ptr);
    if (parent) {
      console.log(`    ⛔ 부모 창이 있는 창 제외`);
      return null;
    }
    
    // 제목이 없고 캡션도 없으면 제외
    if (!title.trim() && !(style & WS_CAPTION)) {
      console.log(`    ⛔ 제목과 캡션이 없는 창 제외`);
      return null;
    }
    
    console.log(`    ✅ 프로그램 창으로 판정: "${title || className}"`);
    
    return {
      id: `hwnd-${hwnd}`,
      name: title || `Window (${className})`,
      x: left,
      y: top,
      width,
      height,
      className,
      hwnd,
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
      const info = getWindowInfo(h);
      if (info && !seen.has(info.hwnd!)) {
        list.push(info);
        seen.add(info.hwnd!);
      }
      return true;
    };
    EnumWindowsFn(cb, 0);
    cacheUpdateTime = Date.now();
    console.log(`✅ Win32로 ${list.length}개 창 발견`);
  }
  return list;
}

// ▶ desktopCapturer와 Win32 정보 병합
async function mergeWithDesktopCapturer(win32Windows: WindowInfo[]): Promise<WindowInfo[]> {
  try {
    // desktopCapturer로 썸네일과 아이콘 가져오기
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      fetchWindowIcons: true,
      thumbnailSize: { width: 192, height: 108 }
    });
    
    // Win32 창에 desktopCapturer 정보 추가
    for (const window of win32Windows) {
      const matchedSource = sources.find(s => s.name === window.name);
      if (matchedSource) {
        window.display_id = matchedSource.display_id;
        if (matchedSource.thumbnail) {
          window.thumbnailURL = matchedSource.thumbnail.toDataURL();
        }
        if (matchedSource.appIcon) {
          window.appIcon = matchedSource.appIcon.toDataURL();
        }
      }
    }
    
    // Win32에서 못 찾은 창들 추가
    for (const source of sources) {
      if (!source.name.trim() || 
          source.name.includes('Electron') ||
          source.name.includes('DevTools') ||
          source.name === 'Desktop') {
        continue;
      }
      
      const exists = win32Windows.some(w => w.name === source.name);
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
        console.log(`✅ desktopCapturer에서 추가: "${source.name}"`);
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
    console.log(`  ${i+1}. "${w.name}" - ${w.width}×${w.height} at (${w.x}, ${w.y})`);
  });
  
  return mergedWindows;
}

// ▶ 좌표 위 윈도우 조회
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
    
    // 캐시 확인
    if (windowCache.has(addr) && Date.now() - cacheUpdateTime < CACHE_DURATION) {
      const cached = windowCache.get(addr)!;
      console.log(`  📌 캐시에서 발견: "${cached.name}"`);
      return cached;
    }
    
    // Win32로 정보 가져오기
    const info = getWindowInfo(raw);
    if (!info) {
      console.log('  ❌ 창 정보를 가져올 수 없음');
      return null;
    }
    
    // desktopCapturer에서 추가 정보 찾기
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        fetchWindowIcons: true,
        thumbnailSize: { width: 192, height: 108 }
      });
      
      const matchedSource = sources.find(s => s.name === info.name);
      if (matchedSource) {
        info.display_id = matchedSource.display_id;
        if (matchedSource.thumbnail) {
          info.thumbnailURL = matchedSource.thumbnail.toDataURL();
        }
        if (matchedSource.appIcon) {
          info.appIcon = matchedSource.appIcon.toDataURL();
        }
      }
    } catch (e) {
      // desktopCapturer 실패해도 Win32 정보는 유지
    }
    
    windowCache.set(addr, info);
    console.log(`  ✅ 창 발견: "${info.name}" ${info.width}×${info.height} at (${info.x}, ${info.y})`);
    return info;
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