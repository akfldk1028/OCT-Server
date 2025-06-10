// // src/main/windowApi.ts

// import { ipcMain, BrowserWindow } from 'electron';
// import * as os from 'os';

// // webpack 우회를 위한 require
// declare const __non_webpack_require__: NodeRequire;
// const requireNode: NodeRequire =
//   typeof __non_webpack_require__ === 'function'
//     ? __non_webpack_require__
//     : require;

// // 🔥 libwin32(win32-api)에서 제공하는 user32 함수들
// let user32_win32: any = null;
// try {
//   user32_win32 = requireNode('libwin32/user32');
//   console.log('✅ libwin32/user32 로드 성공:', Object.keys(user32_win32));
// } catch (e) {
//   console.warn('⚠️ libwin32/user32 로드 실패:', e);
// }

// // 🔥 koffi로 추가할 Win32 API
// let koffi: any = null;
// let user32_koffi: any = null;
// let WindowFromPoint: any,
//     IsWindowVisible_k: any, IsIconic_k: any,
//     GetWindowRect: any, GetWindowTextW: any, GetClassNameW: any,
//     GetWindowThreadProcessId: any, GetCursorPos: any;
// let EnumWindowsFn: any;
// let RECT: any, POINT: any;

// if (process.platform === 'win32') {
//   try {
//     // 1) koffi 로드 및 user32.dll 바인딩
//     koffi = requireNode('koffi');                                            // Koffi FFI 모듈:contentReference[oaicite:4]{index=4}
//     user32_koffi = koffi.load('user32.dll');                                  // user32.dll 직접 로드:contentReference[oaicite:5]{index=5}
//     console.log('✅ koffi + user32.dll 로드 성공');

//     // 2) 구조체 타입 선언 (koffi.struct 반환값을 타입으로 사용):contentReference[oaicite:6]{index=6}
//     RECT  = koffi.struct('RECT',  { left:'long', top:'long', right:'long', bottom:'long' });
//     POINT = koffi.struct('POINT', { x:'long',    y:'long'                  });
//     console.log('✅ RECT, POINT 구조체 정의 완료');

//     // 3) koffi 바인딩 함수 정의 (Wide-character 포함)
//     WindowFromPoint          = user32_koffi.func('void* __stdcall WindowFromPoint(int32_t, int32_t)');
//     IsWindowVisible_k        = user32_koffi.func('bool   __stdcall IsWindowVisible(void*)');
//     IsIconic_k               = user32_koffi.func('bool   __stdcall IsIconic(void*)');
//     GetWindowRect            = user32_koffi.func('bool   __stdcall GetWindowRect(void*, _Out_ RECT*)');
//     GetWindowTextW           = user32_koffi.func('int    __stdcall GetWindowTextW(void*, _Out_ wchar_t*, int)');
//     GetClassNameW            = user32_koffi.func('int    __stdcall GetClassNameW(void*, _Out_ wchar_t*, int)');
//     GetWindowThreadProcessId = user32_koffi.func('uint32_t __stdcall GetWindowThreadProcessId(void*, _Out_ uint32_t*)');
//     GetCursorPos             = user32_koffi.func('bool   __stdcall GetCursorPos(_Out_ POINT*)');

//     // 4) EnumWindows: libwin32 제공 함수 우선, 아니면 koffi 버전 사용
//     if (user32_win32 && typeof user32_win32.EnumWindows === 'function') {
//       EnumWindowsFn = user32_win32.EnumWindows.bind(user32_win32);            // libwin32 콜백 방식:contentReference[oaicite:7]{index=7}
//       console.log('✅ libwin32 EnumWindows 사용');
//     } else {
//       EnumWindowsFn = user32_koffi.func('bool __stdcall EnumWindows(void*, intptr_t)');
//       console.log('✅ koffi EnumWindows 사용');
//     }

//     console.log('✅ Win32 함수 정의 완료');
//   } catch (e) {
//     console.error('❌ koffi 로드 또는 함수 정의 실패:', e);
//   }
// }

// // ▶ 윈도우 정보 인터페이스
// export interface WinApiWindowInfo {
//   id: string; name: string;
//   x: number; y: number; width: number; height: number;
//   className?: string; hwnd?: number;
//   isVisible?: boolean; processId?: number;
// }

// // ▶ 캐시 및 상수
// const windowCache = new Map<number, WinApiWindowInfo>();
// let cacheUpdateTime = 0;
// const CACHE_DURATION = 500;

// // ▶ HWND 포인터 정규화 헬퍼
// function normalizeHwnd(raw: any): { ptr: any; addr: number } {
//   if (typeof raw === 'number') return { ptr: raw, addr: raw };
//   return { ptr: raw, addr: Number(koffi.address(raw)) };
// }

// // ▶ 단일 윈도우 정보 조회
// function getWindowInfo(rawHwnd: any): WinApiWindowInfo | null {
//   try {
//     const { ptr, addr: hwnd } = normalizeHwnd(rawHwnd);
//     console.log(`🔍 getWindowInfo: hwnd=0x${hwnd.toString(16)}`);

//     // 1) 보임/아이콘화 검사 (koffi 바인딩)
//     if (!IsWindowVisible_k(ptr) || IsIconic_k(ptr)) return null;

//     // 2) RECT 구조체 출력 (빈 객체 사용)
//     const rect: any = {};
//     if (!GetWindowRect(ptr, rect)) return null;
//     const left   = rect.left;
//     const top    = rect.top;
//     const width  = rect.right  - left;
//     const height = rect.bottom - top;
//     if (width < 10 || height < 10) return null;

//     // 3) 제목(Wide-char) - 배열 사용
//     const titleBuf = ['\0'.repeat(256)];
//     const tlen = GetWindowTextW(ptr, titleBuf, 256);
//     const title = tlen > 0
//       ? titleBuf[0].substring(0, tlen)
//       : '';

//     // 4) 클래스명(Wide-char) - 배열 사용
//     const classBuf = ['\0'.repeat(256)];
//     const clen = GetClassNameW(ptr, classBuf, 256);
//     const className = clen > 0
//       ? classBuf[0].substring(0, clen)
//       : '';

//     // 5) PID - 배열 사용
//     const pidArray: number[] = [0];
//     GetWindowThreadProcessId(ptr, pidArray);
//     const pid = pidArray[0];



//     console.log(`  ✅ "${title}" @(${left},${top}) ${width}×${height} [${className}] PID:${pid}`);
//     return {
//       id:        `hwnd-${hwnd}`,
//       name:      title || `Window (${className})`,
//       x:         left,
//       y:         top,
//       width,
//       height,
//       className,
//       hwnd,
//       isVisible: true,
//       processId: pid,
//     };
//   } catch (e) {
//     console.error('getWindowInfo error:', e);
//     return null;
//   }
// }

// // ▶ 모든 윈도우 열거
// function enumerateAllWindows(): WinApiWindowInfo[] {
//   const list: WinApiWindowInfo[] = [];
//   if (EnumWindowsFn) {
//     const seen = new Set<number>();
//     const cb = (h: any) => {
//       const info = getWindowInfo(h);
//       if (info && !seen.has(info.hwnd!)) {
//         list.push(info);
//         seen.add(info.hwnd!);
//       }
//       return true;
//     };
//     EnumWindowsFn(cb, 0);
//     cacheUpdateTime = Date.now();
//     console.log(`✅ enumerateAllWindows: found ${list.length}`);
//   }
//   return list;
// }
// // ▶ 좌표 위 윈도우 조회 (IPC용)
// // ────────────── 좌표 위 윈도우 조회 ──────────────
// export async function getWindowAtPoint(x: number, y: number): Promise<WinApiWindowInfo | null> {
//   console.log(`🔍 getWindowAtPoint(${x},${y})`);
//   if (WindowFromPoint) {
//     const raw = WindowFromPoint(x, y);
//     if (!raw) return null;
//     const { addr } = normalizeHwnd(raw);
//     if (windowCache.has(addr) && Date.now() - cacheUpdateTime < CACHE_DURATION) {
//       return windowCache.get(addr)!;
//     }
//     const info = getWindowInfo(raw);
//     if (info) windowCache.set(addr, info);
//     return info;
//   }
//   // Electron BrowserWindow fallback
//   for (const w of BrowserWindow.getAllWindows()) {
//     const b = w.getBounds();
//     if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
//       return {
//         id:        `electron-${w.id}`,
//         name:      w.getTitle(),
//         x:         b.x,
//         y:         b.y,
//         width:     b.width,
//         height:    b.height,
//         isVisible: true,
//       };
//     }
//   }
//   return null;
// }

// // ────────────── IPC 핸들러 등록 ──────────────
// export function registerWindowApi() {
//   ipcMain.handle('window-at-point', (_e, { x, y }) => getWindowAtPoint(x, y));
//   ipcMain.handle('get-all-windows',   ()                   => enumerateAllWindows());
//   console.log('✅ [windowApi] IPC handlers registered');
// }

// // ────────────── 프로세스 종료 시 캐시 정리 ──────────────
// process.on('exit', () => {
//   windowCache.clear();
//   console.log('🔄 windowCache cleared');
// });