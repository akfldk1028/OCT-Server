import path from 'path';
import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import './mcp/serverHandlers';
// 환경 변수 로드
import dotenv from 'dotenv';
import {
  // getBaseMCPServerConfig,  // ✅ 제거됨 - installerStore에서 처리
  // getMergedMCPServerConfig,  // ✅ 제거됨
  // updateServerInstallStatus,  // ✅ 제거됨
  getServerSessionInfo,
  userConfig
} from './src/common/configLoader';
// import type { MCPServerExtended } from './src/common/types/server-config';  // ✅ 제거됨
import { manager } from './src/common/manager/managerInstance';
import { setupMcpHealthCheckHandlers } from './src/common/server/services/mcpHealthCheck';
import { ServerInstanceFactory } from './src/common/manager/ServerInstanceFactory';
import { NodeExecutorFactory } from './src/workflow/executors/NodeExecutorFactory';
import { ExecutionContext } from './src/workflow/executors/node-executor-types';
import { ClaudeDesktopIntegration } from './src/workflow/clients/claude';

// 소프트웨어 가이드 기능 관련 임포트
// import { GuideManager } from './GuideManager';
import { aiService } from './overlay/SimpleAIService';

// 윈도우 관리 모듈 임포트
import { createMainWindow, hideWindowBlock } from './window';

import { createZustandBridge } from '@zubridge/electron/main';

// import { store } from './computer/antropic/create';
// import { store } from './computer/overlay/create';
import {combinedStore} from  './stores/combinedStore'

import {setupMCPHandlers} from "@/main/mcp-handler";
import {setupMCPpreLoad} from "@/main/stores/renderProxy/rendererMCPProxy-preload";

// 🔥 Window-Specific Overlay 시스템 임포트 (이미 구현된 기능 사용)
import { integrateOverlayWithWindow, setupWindowSelectionTrigger } from './stores/overlay/overlayWindowIntegration';
import { registerWindowApi } from './windowApi';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../renderer/database.types';

dotenv.config();

// 로그 출력
console.log('[Main Process] dotenv loaded.');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);

// 🔥 메인 프로세스용 Supabase 클라이언트 (createClient 사용)
const supabase = createClient<Database>(
  process.env.SUPABASE_URL || 'https://mcrzlwriffyulnswfckt.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcnpsd3JpZmZ5dWxuc3dmY2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMDkwMjIsImV4cCI6MjA2Mjg4NTAyMn0.zHbjwPZnJUBx-u6YWsBVKS36gtO2WnUQT3ieZRLzKRQ'
);

// function getPythonPath() {  // ✅ 제거됨 - installer-helpers.ts에서 처리
//   if (app.isPackaged) {
//     return path.join(process.resourcesPath, 'python', 'python.exe');
//   } else {
//     return path.join(process.cwd(), 'python', 'python.exe');
//   }
// }

// const installer = new ServerInstaller(); // ✅ 제거됨 - 새로운 installerStore 사용

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// 🔥 개발자 도구 완전 차단 - electron-debug 제거
// if (isDebug) {
//   require('electron-debug').default();
// }




let authWindow: BrowserWindow | null = null;

// OAuth 창 생성 함수
async function createAuthWindow(authUrl: string): Promise<string | { type: 'tokens'; access_token: string; refresh_token: string; fragment_params: any } | null> {
  return new Promise((resolve) => {
    authWindow = new BrowserWindow({
      width: 600,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      parent: mainWindow || undefined,
      modal: true,
    });

    authWindow.loadURL(authUrl);

    // URL 변경 감지
    const handleRedirect = (url: string) => {
      console.log('🔥 [OAuth] URL 변경 감지:', url);
      
      // Supabase 콜백 URL 패턴 확인 (code 또는 access_token)
      if (url.includes('/auth/v1/callback') || url.includes('code=') || url.includes('access_token=')) {
        try {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');
          
          // URL fragment (#) 파라미터도 확인 (implicit flow)
          const fragment = urlObj.hash.substring(1); // # 제거
          const fragmentParams = new URLSearchParams(fragment);
          const accessToken = fragmentParams.get('access_token');
          const refreshToken = fragmentParams.get('refresh_token');

          console.log('🔥 [OAuth] 추출된 코드:', code);
          console.log('🔥 [OAuth] 추출된 access_token:', accessToken ? '있음' : '없음');
          console.log('🔥 [OAuth] 오류:', error);

          if (code) {
            // Authorization Code Flow - 코드 반환
            console.log('🔥 [OAuth] Authorization Code Flow - 코드:', code);
            resolve(code);
          } else if (accessToken && refreshToken) {
            // Implicit Flow - 토큰 직접 반환
            console.log('🔥 [OAuth] Implicit Flow - 토큰 직접 받음');
            resolve({ 
              type: 'tokens',
              access_token: accessToken,
              refresh_token: refreshToken,
              fragment_params: Object.fromEntries(fragmentParams.entries())
            });
          } else if (error) {
            // 인증 실패
            console.error('🔥 [OAuth] 인증 실패:', error);
            resolve(null);
          } else {
            // 코드도 토큰도 에러도 없음
            console.warn('🔥 [OAuth] 코드, 토큰, 에러가 모두 없음');
            resolve(null);
          }

          authWindow?.close();
        } catch (parseError) {
          console.error('🔥 [OAuth] URL 파싱 오류:', parseError);
          resolve(null);
          authWindow?.close();
        }
      }
    };

    // navigation 이벤트 리스너
    authWindow.webContents.on('will-navigate', (event, url) => {
      handleRedirect(url);
    });

    authWindow.webContents.on('did-navigate', (event, url) => {
      handleRedirect(url);
    });

    // 창 닫힘 처리
    authWindow.on('closed', () => {
      authWindow = null;
      resolve(null);
    });
  });
}

// 🔥 현재 세션 정보 가져오기 IPC 핸들러 추가
ipcMain.handle('auth:get-session', async (event) => {
  try {
    console.log('🔍 [auth:get-session] 현재 세션 정보 요청');
    
    // Supabase에서 현재 세션 정보 가져오기
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('🔍 [auth:get-session] 세션 정보 가져오기 실패:', error);
      return { success: false, user: null, error: error };
    }
    
    console.log('🔍 [auth:get-session] 세션 정보:', user?.email || 'No user');
    
    return { success: true, user: user };
  } catch (error) {
    console.error('🔍 [auth:get-session] 세션 정보 오류:', error);
    return { success: false, user: null, error: error };
  }
});

// 🔥 로그아웃 IPC 핸들러 추가
ipcMain.handle('auth:logout', async (event) => {
  try {
    console.log('🔥 [auth:logout] 로그아웃 시작 (메인 프로세스)');
    
    // Supabase 세션 종료
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('🔥 [auth:logout] 로그아웃 실패:', error);
      throw error;
    }
    
    console.log('🔥 [auth:logout] 메인 프로세스 로그아웃 성공');
    
    // 🔥 중요: 렌더러 프로세스에 로그아웃 알림
    if (mainWindow) {
      mainWindow.webContents.send('auth:logged-out');
    }
    
    return { success: true };
  } catch (error) {
    console.error('🔥 [auth:logout] 로그아웃 오류:', error);
    return { success: false, error: error };
  }
});

// IPC 핸들러 추가
ipcMain.handle('auth:social-login', async (event, provider: string) => {
  try {
    console.log(`🔥 [auth:social-login] ${provider} 소셜 로그인 시작`);
    
    // Supabase OAuth URL 생성
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        // 일렉트론용 커스텀 redirect URL
        redirectTo: `https://mcrzlwriffyulnswfckt.supabase.co/auth/v1/callback`,
        skipBrowserRedirect: true, // 중요: 자동 브라우저 열기 방지
      },
    });

    if (error || !data?.url) {
      console.error('🔥 [auth:social-login] OAuth URL 생성 실패:', error);
      throw error || new Error('No auth URL');
    }

    console.log('🔥 [auth:social-login] OAuth URL 생성 성공:', data.url);

    // OAuth 창에서 인증 진행
    const result = await createAuthWindow(data.url);
    console.log('🔥 [auth:social-login] 인증 결과:', result);

    if (result) {
      if (typeof result === 'string') {
        // Authorization Code Flow - 코드로 세션 교환
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(result);

        if (sessionError) {
          console.error('🔥 [auth:social-login] 세션 교환 실패:', sessionError);
          throw sessionError;
        }

        console.log('🔥 [auth:social-login] 세션 교환 성공:', sessionData?.user?.email);
        
        // 🔥 중요: 메인 윈도우에 세션 정보 전달
        if (mainWindow) {
          mainWindow.webContents.send('auth:session-updated', {
            user: sessionData?.user,
            session: sessionData?.session
          });
        }

        return { success: true, user: sessionData?.user };
      } else if (result.type === 'tokens') {
        // Implicit Flow - 토큰으로 직접 세션 설정
        const { access_token, refresh_token } = result;
        
        console.log('🔥 [auth:social-login] 토큰으로 세션 설정 중...');
        
        try {
          // Supabase에 토큰을 설정하여 세션 생성
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (sessionError) {
            console.error('🔥 [auth:social-login] 토큰 세션 설정 실패:', sessionError);
            throw sessionError;
          }

          console.log('🔥 [auth:social-login] 토큰 세션 설정 성공:', sessionData?.user?.email);
          
          // 🔥 중요: 메인 윈도우에 세션 정보 전달
          if (mainWindow) {
            mainWindow.webContents.send('auth:session-updated', {
              user: sessionData?.user,
              session: sessionData?.session
            });
          }

          return { success: true, user: sessionData?.user };
        } catch (tokenError) {
          console.error('🔥 [auth:social-login] 토큰 처리 오류:', tokenError);
          throw tokenError;
        }
      }
    }

    return { success: false, error: 'Authentication cancelled' };
  } catch (error) {
    console.error('🔥 [auth:social-login] 소셜 로그인 오류:', error);
    return { success: false, error: error};
  }
});















const installExtensions = async () => {
  try {
    const name = await installExtension(REACT_DEVELOPER_TOOLS, {
      loadExtensionOptions: { allowFileAccess: true },
    });
  } catch (err) {
    console.error('❌ Failed to install React DevTools:', err);
  }
};

const appDataPath = path.join(
  process.env.APPDATA ||
    (process.platform === 'darwin'
      ? `${process.env.HOME}/Library/Application Support`
      : `${process.env.HOME}/.local/share`),
  'mcp-server-manager',
);

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  try {
    await manager.startServer('local-express-server');
    const loadedCount = ServerInstanceFactory.loadServerConfigs(appDataPath);
    console.log(`📊 [main] 서버 인스턴스 로드 완료: ${loadedCount}개 서버 로드됨`);
  } catch (error) {
    console.error('❌ [main] Express 로컬 서버 시작 실패:', error);
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
  const getAssetPath = (...paths: string[]) => path.join(RESOURCES_PATH, ...paths);

  // 메인 윈도우 생성 및 옵션 전달
  mainWindow = await createMainWindow(getAssetPath, {
    width: 1200,  // 🔥 Slack과 비슷한 크기로 증가 (1024 → 1200)
    height: 800,  // 🔥 Slack과 비슷한 크기로 증가 (728 → 800)
    // transparent: true,
    // 🌲 완전 커스텀 타이틀바 - 네이티브 타이틀바 완전히 숨김
  });

  // 🔥 Window-Specific Overlay를 위해 windowStore에 메인 윈도우 설정
  if (mainWindow) {
    combinedStore.getState().window.setMainWindow(mainWindow);
    console.log('🔥 WindowStore에 메인 윈도우 설정 완료!');
  }

  if (mainWindow) {
    // const { unsubscribe } = createZustandBridge(store, [mainWindow]);
    const { unsubscribe } = createZustandBridge(combinedStore, [mainWindow]);

    // reducer: rootReducer,
    app.on('window-all-closed', unsubscribe);

  }

  mainWindow.on('ready-to-show', () => {
    // 🔥 개발자 도구 허용 (개발 시 F12 사용 가능)
    if (isDebug) {
      console.log('🔧 개발 모드: 개발자 도구 허용됨 (F12 사용 가능)');
    } else {
      // 프로덕션에서만 개발자 도구 차단
      // BrowserWindow.getAllWindows().forEach(window => {
      //   if (window.webContents.isDevToolsOpened()) {
      //     window.webContents.closeDevTools();
      //   }
      //   window.webContents.on('devtools-opened', () => {
      //     window.webContents.closeDevTools();
      //   });
      // });

      // app.on('web-contents-created', (_, webContents) => {
      //   webContents.on('devtools-opened', () => {
      //     webContents.closeDevTools();
      //   });
      // });
    }
  });

  mainWindow.on('closed', () => {
    try {
      // 🔥 Window-Specific Overlay 정리 (안전하게)
      const windowState = combinedStore.getState().window;
      if (windowState && windowState.cleanup) {
        windowState.cleanup();
      }
      if (windowState && windowState.setMainWindow) {
        windowState.setMainWindow(null);
      }
    } catch (error) {
      console.warn('⚠️ [main] cleanup 실패 (무시):', error);
    }
    mainWindow = null;
  });

  new AppUpdater();
};

app.on('window-all-closed', () => {
  try {
    manager.stopServer('remote-mcp-server');
    manager.stopServer('local-express-server');


  } catch (err) {
    console.error('서버 종료 중 오류:', err);
  }
  if (process.platform !== 'darwin') app.quit();
});

app.whenReady()
  .then(async () => {
    registerWindowApi();
    if (isDebug) await installExtensions();

    // 🔥 개발자 도구 단축키 등록 (복수 등록으로 안정성 향상)
    try {
      const f12Result = globalShortcut.register('F12', () => {
        console.log('🔧 F12 키 감지됨!');
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          if (focusedWindow.webContents.isDevToolsOpened()) {
            focusedWindow.webContents.closeDevTools();
            console.log('🔧 개발자 도구 닫힘 (F12)');
          } else {
            focusedWindow.webContents.openDevTools();
            console.log('🔧 개발자 도구 열림 (F12)');
          }
        } else {
          console.log('⚠️ 포커스된 윈도우 없음');
        }
      });
      console.log('✅ F12 단축키 등록:', f12Result ? '성공' : '실패');

      // 🔥 대안 단축키: Ctrl+Shift+I
      const ctrlShiftIResult = globalShortcut.register('CommandOrControl+Shift+I', () => {
        console.log('🔧 Ctrl+Shift+I 키 감지됨!');
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          if (focusedWindow.webContents.isDevToolsOpened()) {
            focusedWindow.webContents.closeDevTools();
            console.log('🔧 개발자 도구 닫힘 (Ctrl+Shift+I)');
          } else {
            focusedWindow.webContents.openDevTools();
            console.log('🔧 개발자 도구 열림 (Ctrl+Shift+I)');
          }
        } else {
          console.log('⚠️ 포커스된 윈도우 없음');
        }
      });
      console.log('✅ Ctrl+Shift+I 단축키 등록:', ctrlShiftIResult ? '성공' : '실패');

      // 🔥 추가 단축키: Ctrl+Shift+J (Chrome 스타일)
      const ctrlShiftJResult = globalShortcut.register('CommandOrControl+Shift+J', () => {
        console.log('🔧 Ctrl+Shift+J 키 감지됨!');
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
          focusedWindow.webContents.openDevTools();
          console.log('🔧 개발자 도구 열림 (Ctrl+Shift+J)');
        }
      });
      console.log('✅ Ctrl+Shift+J 단축키 등록:', ctrlShiftJResult ? '성공' : '실패');

    } catch (error) {
      console.error('❌ 개발자 도구 단축키 등록 실패:', error);
    }

    // store.getState().INIT_API_KEY();
    // store.getState().SET_API_KEY(
    //   "sk-proj-...",
    //   '수동 설정'
    // );
    createWindow();
    setupMcpHealthCheckHandlers();

    // 파이썬 스크립트 예시 생략...
    setupMCPHandlers();
    setupMCPpreLoad();

    // 🔥 Window-Specific Overlay 시스템 활성화 (새로운 마우스 커서 선택 방식)
    try {
      integrateOverlayWithWindow();
      setupWindowSelectionTrigger();
      console.log('✅ Window-Specific Overlay 시스템 활성화 완료!');
      console.log('🎯 이제 채팅에서 "이 창에서 도움줘"라고 하면 창 선택 모드가 작동합니다!');
    } catch (error) {
      console.error('❌ Window-Specific Overlay 활성화 실패:', error);
    }

    // 🔥 새로운 마우스 커서 창 선택 IPC 핸들러들
    setupNewWindowIPCHandlers();

    // 🔥 개발자 도구 IPC 핸들러들 추가
    setupDevToolsIPCHandlers();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch(console.log);

// 🔥 새로운 마우스 커서 창 선택 IPC 핸들러들
function setupNewWindowIPCHandlers() {
  console.log('🔥 [main] 새로운 창 선택 IPC 핸들러 설정 중...');

  // 마우스 커서로 창 선택 모드 시작
  ipcMain.handle('window:start-selection-mode', async () => {
    try {
      console.log('🖱️ [IPC] 창 선택 모드 시작 요청');
      const result = await combinedStore.getState().window.startWindowSelectionMode();
      console.log('✅ [IPC] 창 선택 결과:', result?.name || 'null');
      return result;
    } catch (error) {
      console.error('❌ [IPC] 창 선택 모드 실패:', error);
      return null;
    }
  });

  // 창에 부착
  ipcMain.handle('window:attach-to-target', async (_, windowInfo) => {
    try {
      console.log('🔗 [IPC] 창 부착 요청:', windowInfo?.name);
      await combinedStore.getState().window.attachToTargetWindow(windowInfo);
      console.log('✅ [IPC] 창 부착 완료');
      return { success: true };
    } catch (error) {
      console.error('❌ [IPC] 창 부착 실패:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 창에서 분리
  ipcMain.handle('window:detach-from-target', async () => {
    try {
      console.log('🔄 [IPC] 창 분리 요청');
      combinedStore.getState().window.detachFromTargetWindow();
      console.log('✅ [IPC] 창 분리 완료');
      return { success: true };
    } catch (error) {
      console.error('❌ [IPC] 창 분리 실패:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 타겟 창 캡처
  ipcMain.handle('window:capture-target', async () => {
    try {
      console.log('📸 [IPC] 타겟 창 캡처 요청');
      const screenshot = await combinedStore.getState().window.captureTargetWindow();
      console.log('✅ [IPC] 창 캡처 완료');
      return screenshot;
    } catch (error) {
      console.error('❌ [IPC] 창 캡처 실패:', error);
      throw error;
    }
  });

  console.log('✅ [main] 새로운 창 선택 IPC 핸들러 설정 완료!');
}

// 🔥 개발자 도구 IPC 핸들러들 (강화된 예외 처리)
function setupDevToolsIPCHandlers() {
  console.log('🔧 [main] 개발자 도구 IPC 핸들러 설정 중...');

  // 기존 핸들러 제거 (중복 방지)
  try {
    ipcMain.removeHandler('devtools:open');
    ipcMain.removeHandler('devtools:close');
    ipcMain.removeHandler('devtools:toggle');
    ipcMain.removeHandler('devtools:status');
  } catch (error) {
    // 핸들러가 존재하지 않으면 무시
  }

  // 개발자 도구 열기
  ipcMain.handle('devtools:open', async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;
      if (focusedWindow && !focusedWindow.isDestroyed()) {
        focusedWindow.webContents.openDevTools();
        console.log('🔧 개발자 도구 열림 (IPC)');
        return { success: true };
      }
      console.warn('⚠️ 개발자 도구 열기 실패: 윈도우 없음');
      return { success: false, error: 'No available window' };
    } catch (error) {
      console.error('❌ devtools:open 에러:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 개발자 도구 닫기
  ipcMain.handle('devtools:close', async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;
      if (focusedWindow && !focusedWindow.isDestroyed()) {
        focusedWindow.webContents.closeDevTools();
        console.log('🔧 개발자 도구 닫힘 (IPC)');
        return { success: true };
      }
      console.warn('⚠️ 개발자 도구 닫기 실패: 윈도우 없음');
      return { success: false, error: 'No available window' };
    } catch (error) {
      console.error('❌ devtools:close 에러:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 개발자 도구 토글
  ipcMain.handle('devtools:toggle', async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;
      if (focusedWindow && !focusedWindow.isDestroyed()) {
        if (focusedWindow.webContents.isDevToolsOpened()) {
          focusedWindow.webContents.closeDevTools();
          console.log('🔧 개발자 도구 닫힘 (IPC Toggle)');
        } else {
          focusedWindow.webContents.openDevTools();
          console.log('🔧 개발자 도구 열림 (IPC Toggle)');
        }
        return { success: true };
      }
      console.warn('⚠️ 개발자 도구 토글 실패: 윈도우 없음');
      return { success: false, error: 'No available window' };
    } catch (error) {
      console.error('❌ devtools:toggle 에러:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 개발자 도구 상태 확인 (강화된 안전성)
  ipcMain.handle('devtools:status', async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;
      if (focusedWindow && !focusedWindow.isDestroyed()) {
        const isOpen = focusedWindow.webContents.isDevToolsOpened();
        console.log(`🔍 개발자 도구 상태 확인: ${isOpen ? '열림' : '닫힘'}`);
        return {
          success: true,
          isOpen: isOpen
        };
      }
      console.warn('⚠️ 개발자 도구 상태 확인 실패: 윈도우 없음');
      return { success: false, error: 'No available window', isOpen: false };
    } catch (error) {
      console.error('❌ devtools:status 에러:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isOpen: false
      };
    }
  });

  console.log('✅ [main] 개발자 도구 IPC 핸들러 설정 완료!');
}

app.on('before-quit', async () => {});
app.on('will-quit', () => {
  // 앱이 준비된 상태에서만 globalShortcut 해제
  if (app.isReady()) {
    globalShortcut.unregisterAll();
  }
});


// ===== Window-Specific Overlay IPC 핸들러 (공식 API 기반) =====

// 화면 접근 권한 확인
ipcMain.handle('get-screen-access', async () => {
  try {
    return await combinedStore.getState().window.getScreenAccess();
  } catch (error) {
    console.error('❌ get-screen-access 실패:', error);
    return false;
  }
});

// 시스템 환경설정 열기 (macOS)
ipcMain.handle('open-screen-security', () => {
  try {
    combinedStore.getState().window.openScreenSecurity();
    return { success: true };
  } catch (error) {
    console.error('❌ open-screen-security 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 사용 가능한 윈도우 목록 새로고침
ipcMain.handle('refresh-available-windows', async () => {
  try {
    return await combinedStore.getState().window.refreshAvailableWindows();
  } catch (error) {
    console.error('❌ refresh-available-windows 실패:', error);
    return [];
  }
});

// 🔥 기존 창 선택 핸들러 제거됨 - 새로운 마우스 커서 방식으로 대체

// 선택된 창에 부착 (실시간 추적 포함)
ipcMain.handle('attach-to-window', async (_, windowInfo) => {
  console.log('🚀🚀🚀 [main.ts] attach-to-window IPC 핸들러 호출됨!!! 🚀🚀🚀');
  console.log('📋 [main.ts] windowInfo:', JSON.stringify(windowInfo, null, 2));
  console.log('📡 [main.ts] 현재 시각:', new Date().toISOString());

  try {
    console.log('🔍 [main.ts] combinedStore 확인 중...');
    const combinedState = combinedStore.getState();
    console.log('🔍 [main.ts] combinedState 존재:', !!combinedState);
    console.log('🔍 [main.ts] combinedState.window 존재:', !!combinedState.window);
    console.log('🔍 [main.ts] attachToTargetWindow 함수 존재:', !!combinedState.window?.attachToTargetWindow);

    if (!combinedState.window?.attachToTargetWindow) {
      throw new Error('attachToTargetWindow 함수를 찾을 수 없습니다');
    }

    console.log('📡 [main.ts] windowStore.attachToTargetWindow 호출 중...');
    await combinedStore.getState().window.attachToTargetWindow(windowInfo);

    console.log('✅✅✅ [main.ts] attachToTargetWindow 완료!!! ✅✅✅');
    return { success: true };
  } catch (error) {
    console.error('❌❌❌ [main.ts] attach-to-window 실패:', error);
    console.error('❌ [main.ts] 에러 스택:', error instanceof Error ? error.stack : 'No stack');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 🎯 ID로 창 직접 선택 (React UI에서 사용)
ipcMain.handle('select-window-by-id', async (_, windowId: string) => {
  try {
    const selectedWindow = await combinedStore.getState().window.selectWindowById(windowId);
    if (selectedWindow) {
      return { success: true, window: selectedWindow };
    } else {
      return { success: false, error: 'Window not found' };
    }
  } catch (error) {
    console.error('❌ select-window-by-id 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 창에서 분리 (추적 중지 포함)
ipcMain.handle('detach-from-window', async () => {
  try {
    combinedStore.getState().window.detachFromTargetWindow();
    return { success: true };
  } catch (error) {
    console.error('❌ detach-from-window 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// 타겟 창 정확한 캡처 (공식 API)
ipcMain.handle('capture-target-window', async () => {
  try {
    return await combinedStore.getState().window.captureTargetWindow();
  } catch (error) {
    console.error('❌ capture-target-window 실패:', error);
    return null;
  }
});

// 부착 위치 업데이트
ipcMain.handle('update-attach-position', (_, position) => {
  try {
    combinedStore.getState().window.updateAttachPosition(position);
    return { success: true };
  } catch (error) {
    console.error('❌ update-attach-position 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});


// 창 선택 모드 토글 (오버레이 통합)
ipcMain.handle('toggle-window-mode', async (_, enabled: boolean) => {
  try {
    const overlayState = combinedStore.getState().overlay;
    if (overlayState.TOGGLE_WINDOW_MODE) {
      return await overlayState.TOGGLE_WINDOW_MODE(enabled);
    }
    return { success: false, error: 'Window mode not available' };
  } catch (error) {
    console.error('❌ toggle-window-mode 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});


// 🔥 중복 제거됨 - 위의 windowStore 기반 핸들러 사용

// ===== MCP 서버 관련 IPC 핸들러 =====

// 🔥 서버 설치 - 새로운 installerStore로 이관됨
// 이제 renderer에서 직접 installerStore를 사용하므로 이 핸들러는 필요 없음
// ipcMain.handle('installServer', ...)  // ✅ 제거됨

// 활성 세션 조회
ipcMain.handle('mcp:getActiveSessions', async (event, serverName?: string) => {
  try {
    return await manager.getActiveSessions(serverName);
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
});

// 세션 ID 조회
ipcMain.handle('mcp:getSessionId', async (event, config) => {
  const serverId = config?.id || config?.name;
  if (!serverId) return null;
  try {
    const sessionInfo = getServerSessionInfo(serverId);
    return sessionInfo?.sessionId || null;
  } catch (e) {
    console.error('[main] mcp:getSessionId error:', e);
    return null;
  }
});

// 워크플로우 실행
ipcMain.handle('workflow:execute', async (event, payload) => {
  console.log('🔥 [main] workflow:execute 핸들러 시작');
  console.log('📨 [main] 받은 payload:', JSON.stringify(payload, null, 2));

  const { workflowId, nodes, edges, triggerId, context } = payload;
  const results: Record<string, any> = {};
  let currentContext = context || {};

  console.log(`🎯 [main] 처리할 노드 개수: ${nodes.length}`);

  // 🔥 새로운 workflow 시스템 사용
  const claudeIntegration = new ClaudeDesktopIntegration();
  const executorFactory = new NodeExecutorFactory(claudeIntegration);
  const executionContext = new ExecutionContext();

  // 기존 context 데이터가 있으면 ExecutionContext에 복사
  if (currentContext) {
    Object.entries(currentContext).forEach(([key, value]) => {
      executionContext.set(key, value);
    });
  }

  for (const node of nodes) {
    console.log(`🔄 [main] 노드 ${node.id} (${node.type}) 처리 시작`);
    console.log(`📊 [main] 노드 데이터:`, {
      id: node.id,
      type: node.type,
      'data': node.data,
      'data.config': node.data?.config,
      'data.name': node.data?.name
    });

    try {
      // 🔥 서버 노드인 경우 MCP 설정 형식으로 변환
      let nodeToProcess = node;

      if (node.type === 'server' && node.data) {
        console.log(`🔧 [main] 서버 노드 데이터 변환 시작`);

        // 🔥 mcp_install_methods 우선 사용 (실제 설치된 방법)
        let mcpConfig = null;
        if (node.data.mcp_install_methods) {
          const installMethod = node.data.mcp_install_methods;
          if (installMethod.command && installMethod.args) {
            mcpConfig = {
              command: installMethod.command,
              args: installMethod.args,
              env: installMethod.env || {}
            };
            console.log(`✅ [main] mcp_install_methods 사용: ${installMethod.command}`);
          }
        }

        // fallback: mcp_configs에서 npx 우선 선택
        if (!mcpConfig && node.data.mcp_configs && Array.isArray(node.data.mcp_configs)) {
          // 🔥 강제로 순서대로만 찾기 - is_recommended 완전 무시
          const priorities = ['npx', 'npm', 'pip', 'uvx', 'uv', 'python', 'docker'];

          for (const priority of priorities) {
            const config = node.data.mcp_configs.find((config: any) => config.command === priority);
            if (config) {
              mcpConfig = config;
              break;
            }
          }

          // 위에서 못 찾으면 첫 번째 사용
          if (!mcpConfig) {
            mcpConfig = node.data.mcp_configs[0];
          }

          console.log(`✅ [main] mcp_configs 사용: ${mcpConfig?.command}`);
        }

        if (mcpConfig) {
          // 노드 데이터를 MCP 형식으로 변환
          nodeToProcess = {
            ...node,
            data: {
              ...node.data,
              // MCP 설정 형식 추가
              mcpConfig: {
                command: mcpConfig.command,
                args: mcpConfig.args,
                env: mcpConfig.env || {}
              },
              // 서버 이름 추가
              serverName: node.data.mcp_servers?.name || `server_${node.id}`,
              // 원본 데이터도 보존
              originalData: node.data
            }
          };

          console.log(`✅ [main] 서버 노드 MCP 설정 변환 완료:`, {
            serverName: nodeToProcess.data.serverName,
            mcpConfig: nodeToProcess.data.mcpConfig
          });
        } else {
          console.warn(`⚠️ [main] 서버 노드 ${node.id}에 MCP 설정을 찾을 수 없음`);
        }
      }

      const executor = executorFactory.create(nodeToProcess);
      console.log(`⚡ [main] NodeExecutor 생성됨: ${executor ? '성공' : '실패'}`);

      if (executor && executor.execute) {
        const executePayload = {
          nodeId: String(node.id),
          context: executionContext,
          nodes,
          edges,
          triggerId
        };

        const result = await executor.execute(executePayload);
        console.log(`✅ [main] 노드 ${node.id} 실행 완료:`, result);

        results[node.id] = result;
        executionContext.set(String(node.id), result);
        Object.assign(currentContext, result);
      } else {
        console.log(`⚠️ [main] 노드 ${node.id} executor가 없거나 execute 메서드가 없음`);
      }
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      } else if (typeof error === 'string') {
        message = error;
      }
      console.error(`❌ [main] 노드 ${node.id} 실행 실패:`, message);
      results[node.id] = { error: true, message };
      break;
    }
  }

  console.log('🏁 [main] workflow:execute 완료, 최종 결과:', currentContext);

  return {
    success: true,
    finalData: currentContext,
  };
});

// Claude 관련 핸들러
ipcMain.handle('claude:getAllServers', () => {
  const claude = new ClaudeDesktopIntegration();
  return claude.getAllConnectedServers();
});

ipcMain.handle('claude:removeServer', (event, serverName) => {
  const claude = new ClaudeDesktopIntegration();
  return claude.disconnectServer(serverName);
});

// === Claude Desktop 연결 핸들러 ===
ipcMain.handle('connect-to-claude-desktop', async (event, serverName: string, serverConfig: any) => {
  console.log(`🚀 [main] Claude Desktop 연결 요청: ${serverName}`);

  try {
    const claude = new ClaudeDesktopIntegration();
    const connected = claude.connectServer(serverName, serverConfig);

    console.log(`${connected ? '✅' : '❌'} [main] Claude Desktop 연결 결과: ${serverName} - ${connected ? '성공' : '실패'}`);
    return connected;

  } catch (error) {
    console.error(`❌ [main] Claude Desktop 연결 오류: ${serverName}`, error);
    return false;
  }
});

