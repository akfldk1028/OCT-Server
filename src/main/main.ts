// main.ts - 가이드 기능 모듈화 버전
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import './mcp/serverHandlers';
// Load environment variables from .env file at the very beginning
import dotenv from 'dotenv';
import {
  getBaseMCPServerConfig,
  getMergedMCPServerConfig,
  updateServerInstallStatus,
  getServerSessionInfo,
  userConfig
} from './src/common/configLoader';
import type { MCPServerExtended } from './src/common/types/server-config';
import { ServerInstaller } from './src/common/installer/ServerInstaller';
import { manager } from './src/common/manager/managerInstance';
import { setupMcpHealthCheckHandlers } from './src/common/server/services/mcpHealthCheck';
import { ServerInstanceFactory } from './src/common/manager/ServerInstanceFactory';
import { createNodeExecutor } from './src/common/server/node/NodeExecutorFactory';
import { ClaudeDesktopIntegration } from './src/common/server/node/service/claude';

// 소프트웨어 가이드 기능 관련 임포트
import { GuideManager } from './GuideManager';
import { aiService } from './overlay/SimpleAIService';

dotenv.config();

// 로그 출력
console.log('[Main Process] dotenv loaded.');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);


// 테스트 API 키 설정 (개발 중에만 사용)
const TEST_API_KEY = "sk"; // 테스트용 더미 키
let apiKeySource = "없음";


// 환경 변수에서 API 키 로드 - 앱 시작 시점에 수행
if (true) {
  aiService.setApiKey("");
  apiKeySource = "환경 변수";
  console.log("✅ OpenAI API 키가 환경 변수에서 로드되었습니다");
} else {
  // 테스트 API 키 설정 (개발 중에만 사용)
  if (process.env.NODE_ENV === 'development') {
    aiService.setApiKey(TEST_API_KEY);
    apiKeySource = "개발용 테스트 키";
    console.log("⚠️ 개발 모드: 테스트 API 키가 설정되었습니다");
  } else {
    console.log("⚠️ OpenAI API 키가 설정되지 않았습니다. 모의 응답이 사용됩니다.");
  }
}


// 인스톨러 인스턴스 생성
const installer = new ServerInstaller();

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// 전역 변수
let mainWindow: BrowserWindow | null = null;
let guideManager: GuideManager | null = null;

// 개발 환경 설정
if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

// 확장 기능 설치
const installExtensions = async () => {
  try {
    const name = await installExtension(REACT_DEVELOPER_TOOLS, {
      loadExtensionOptions: { allowFileAccess: true },
    });
    console.log(`✅ Loaded Extension: ${name}`);
  } catch (err) {
    console.error('❌ Failed to install React DevTools:', err);
  }
};

// 앱 데이터 경로 정의
const appDataPath = path.join(
  process.env.APPDATA ||
    (process.platform === 'darwin'
      ? `${process.env.HOME}/Library/Application Support`
      : `${process.env.HOME}/.local/share`),
  'mcp-server-manager',
);

// 메인 윈도우 생성
const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  // Express 서버 시작
  console.log('🚀 [main] 일렉트론 앱 시작 - Express 로컬 서버 시작 중...');

  try {
    await manager.startServer('local-express-server');
    console.log('✅ [main] Express 로컬 서버 시작 완료');

    // Zero-install 서버 인스턴스 로드
    console.log('📂 [main] 서버 인스턴스 로드 시작...');
    const loadedCount = ServerInstanceFactory.loadServerConfigs(appDataPath);
    console.log(`📊 [main] 서버 인스턴스 로드 완료: ${loadedCount}개 서버 로드됨`);
  } catch (error) {
    console.error('❌ [main] Express 로컬 서버 시작 실패:', error);
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  // 가이드 매니저 초기화 (메인 윈도우 생성 후)
  guideManager = new GuideManager(mainWindow);

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  // if (isDebug) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' });
  // }

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  // 모든 창의 개발자 도구 닫기
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents.isDevToolsOpened()) {
        window.webContents.closeDevTools();
      }
    });
    // AI 서비스 상태 로그
    console.log(`✅ AI 서비스 상태: API 키 출처 = ${apiKeySource}`);
    try {
      // SimpleAIService에 isApiKeySet 메서드가 정의되어 있다고 가정
      const isKeySet = aiService.isApiKeySet();
      console.log(`✅ AI API 키 설정 상태: ${isKeySet ? "설정됨" : "설정되지 않음"}`);
    } catch (error) {
      console.error("⚠️ AI API 키 상태 확인 중 오류:", error);
    }



  });

  mainWindow.on('closed', () => {
    if (guideManager) {
      guideManager.updateMainWindow(null);
    }
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Auto updater
  new AppUpdater();
};

// 이벤트 리스너
app.on('window-all-closed', () => {
  // 애플리케이션 종료 시 모든 서버 중지
  try {
    manager.stopServer('remote-mcp-server');
    manager.stopServer('local-express-server');
  } catch (err) {
    console.error('서버 종료 중 오류:', err);
  }

  // Respect the OSX convention
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    if (isDebug) {
      console.log("OpenAI API 키 설정 상태:", aiService.isApiKeySet() ? "설정됨" : "설정되지 않음");

      await installExtensions();
    }
    createWindow();
    setupMcpHealthCheckHandlers();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

// 앱 종료 시 정리
app.on('before-quit', async () => {
  if (guideManager) {
    await guideManager.cleanup();
  }
});

// 앱 종료 시 전역 단축키 해제
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ===== MCP 서버 관련 IPC 핸들러 =====

// 서버 설치
ipcMain.handle('installServer', async (event, serverName: string, command: string, envVars?: Record<string, string>) => {
  console.log('⬇️ main: installServer handler received for', serverName, command);
  console.log('⬇️ main: with environment variables:', envVars || 'none');

  const config = await getBaseMCPServerConfig(serverName, command as MCPServerExtended['type'], envVars);

  if (!config) {
    console.error(`[Main] Base config not found for ${serverName}. Replying error.`);
    event.sender.send('installResult', {
      success: false,
      serverName,
      message: `기본 설정 파일(${serverName}.json)을 찾을 수 없습니다.`,
    });
    return { success: false, error: 'Config not found' };
  }

  try {
    console.log(`[Main] Starting installation process for ${serverName} using BASE config...`);
    const installResult = await installer.installServer(serverName, config);
  } catch (error) {
    console.error(`[Main] Error during install process for ${serverName}:`, error);
  }

  return { success: true };
});

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
  const { workflowId, nodes, edges, triggerId, context } = payload;
  const results: Record<string, any> = {};
  let currentContext = context || {};

  for (const node of nodes) {
    try {
      const executor = createNodeExecutor(node, nodes, edges, triggerId);
      const result = await executor.execute(currentContext, nodes, edges, triggerId);
      results[node.id] = result;
      currentContext[node.id] = result;
      Object.assign(currentContext, result);
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        message = (error as any).message;
      } else if (typeof error === 'string') {
        message = error;
      }
      results[node.id] = { error: true, message };
      break;
    }
  }

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


// main.ts에 추가

// 앱 시작 시 환경 변수에서 API 키 로드
// 설정에서 API 키를 가져오는 IPC 핸들러
ipcMain.handle('ai:set-api-key', (_, key: string) => {
  if (!key || !key.trim()) {
    console.warn("⚠️ 빈 API 키 설정 시도가 무시되었습니다");
    return { success: false, error: 'Invalid API key' };
  }

  try {
    // 키의 처음 4자와 마지막 4자만 로그로 남김 (보안)
    const maskedKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    console.log(`✅ API 키 설정 중: ${maskedKey}`);

    aiService.setApiKey(key.trim());
    apiKeySource = "사용자 설정";

    console.log("✅ API 키가 성공적으로 설정되었습니다");
    return { success: true };
  } catch (error) {
    console.error("❌ API 키 설정 중 오류:", error);
    return { success: false, error: 'Failed to set API key' };
  }
});

// AI 서비스 상태 확인 핸들러 추가
ipcMain.handle('ai:get-status', () => {
  try {
    return {
      isKeySet: aiService.isApiKeySet(),
      source: apiKeySource
    };
  } catch (error) {
    console.error("AI 상태 확인 중 오류:", error);
    return { isKeySet: false, source: "오류" };
  }
});

