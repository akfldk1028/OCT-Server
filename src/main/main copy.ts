// import path from 'path';
// import { app, BrowserWindow, ipcMain, globalShortcut, shell } from 'electron';
// import { autoUpdater } from 'electron-updater';
// import log from 'electron-log';
// import installExtension, {
//   REACT_DEVELOPER_TOOLS,
// } from 'electron-devtools-installer';
// import './mcp/serverHandlers';
// import dotenv from 'dotenv';
// import {
//   getServerSessionInfo,
//   userConfig
// } from './src/common/configLoader';
// import { manager } from './src/common/manager/managerInstance';
// import { setupMcpHealthCheckHandlers } from './src/common/server/services/mcpHealthCheck';
// import { ServerInstanceFactory } from './src/common/manager/ServerInstanceFactory';
// import { NodeExecutorFactory } from './src/workflow/executors/NodeExecutorFactory';
// import { ExecutionContext } from './src/workflow/executors/node-executor-types';
// import { ClaudeDesktopIntegration } from './src/workflow/clients/claude';
// import { aiService } from './overlay/SimpleAIService';
// import { resolveHtmlPath } from './util';
// import MenuBuilder from './menu';
// import { createZustandBridge } from '@zubridge/electron/main';
// import { combinedStore } from './stores/combinedStore';
// import { setupMCPHandlers } from "@/main/mcp-handler";
// import { setupMCPpreLoad } from "@/main/stores/renderProxy/rendererMCPProxy-preload";

// dotenv.config();

// // 로그 출력
// console.log('[Main Process] dotenv loaded.');
// console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
// console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);

// class AppUpdater {
//   constructor() {
//     log.transports.file.level = 'info';
//     autoUpdater.logger = log;
//     autoUpdater.checkForUpdatesAndNotify();
//   }
// }

// let mainWindow: BrowserWindow | null = null;
// const isDebug =
//   process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// if (isDebug) {
//   require('electron-debug').default();
// }

// const installExtensions = async () => {
//   try {
//     const name = await installExtension(REACT_DEVELOPER_TOOLS, {
//       loadExtensionOptions: { allowFileAccess: true },
//     });
//   } catch (err) {
//     console.error('❌ Failed to install React DevTools:', err);
//   }
// };

// const appDataPath = path.join(
//   process.env.APPDATA ||
//     (process.platform === 'darwin'
//       ? `${process.env.HOME}/Library/Application Support`
//       : `${process.env.HOME}/.local/share`),
//   'mcp-server-manager',
// );

// const createWindow = async () => {
//   if (isDebug) {
//     await installExtensions();
//   }

//   try {
//     await manager.startServer('local-express-server');
//     const loadedCount = ServerInstanceFactory.loadServerConfigs(appDataPath);
//     console.log(`📊 [main] 서버 인스턴스 로드 완료: ${loadedCount}개 서버 로드됨`);
//   } catch (error) {
//     console.error('❌ [main] Express 로컬 서버 시작 실패:', error);
//   }

//   const RESOURCES_PATH = app.isPackaged
//     ? path.join(process.resourcesPath, 'assets')
//     : path.join(__dirname, '../../assets');
//   const getAssetPath = (...paths: string[]) => path.join(RESOURCES_PATH, ...paths);

//   // 메인 윈도우 생성
//   const preloadPath = app.isPackaged
//     ? path.join(__dirname, 'preload.js')
//     : path.join(__dirname, '../../.erb/dll/preload.js');

//   mainWindow = new BrowserWindow({
//     show: false,
//     width: 1024,
//     height: 728,
//     icon: getAssetPath('icon.png'),
//     transparent: false,
//     frame: true,
//     alwaysOnTop: false,
//     webPreferences: {
//       preload: preloadPath,
//     },
//   });

//   mainWindow.loadURL(resolveHtmlPath('index.html'));

//   // combinedStore의 window store에 메인 윈도우 설정
//   combinedStore.getState().window.setMainWindow(mainWindow);

//   mainWindow.on('ready-to-show', () => {
//     if (!mainWindow) {
//       throw new Error('"mainWindow" is not defined');
//     }
//     if (process.env.START_MINIMIZED) {
//       mainWindow.minimize();
//     } else {
//       // combinedStore를 통해 fadeWindow 호출
//       combinedStore.getState().window.fadeWindow(true, true);
//     }
//   });

//   mainWindow.on('closed', () => {
//     // combinedStore를 통해 cleanup 호출
//     combinedStore.getState().window.cleanup();
//     combinedStore.getState().window.setMainWindow(null);
//     mainWindow = null;
//   });

//   const menuBuilder = new MenuBuilder(mainWindow);
//   menuBuilder.buildMenu();

//   mainWindow.webContents.setWindowOpenHandler((edata) => {
//     shell.openExternal(edata.url);
//     return { action: 'deny' };
//   });

//   // Window 관련 IPC 핸들러 설정
//   setupWindowIPCHandlers();

//   if (mainWindow) {
//     const { unsubscribe } = createZustandBridge(combinedStore, [mainWindow]);
//     app.on('window-all-closed', unsubscribe);
//   }

//   mainWindow.on('ready-to-show', () => {
//     BrowserWindow.getAllWindows().forEach(window => {
//       if (window.webContents.isDevToolsOpened()) {
//         window.webContents.closeDevTools();
//       }
//     });
//   });

//   new AppUpdater();
// };

// // Window 관련 IPC 핸들러 설정
// function setupWindowIPCHandlers() {
//   // 기존 window 핸들러들
//   ipcMain.handle('minimize-window', () => {
//     combinedStore.getState().window.mainWindow?.minimize();
//   });

//   ipcMain.handle('maximize-window', () => {
//     const mainWindow = combinedStore.getState().window.mainWindow;
//     if (mainWindow?.isMaximized()) {
//       mainWindow?.unmaximize();
//     } else {
//       mainWindow?.maximize();
//     }
//   });

//   ipcMain.handle('close-window', async () => {
//     const mainWindow = combinedStore.getState().window.mainWindow;
//     if (mainWindow) {
//       await combinedStore.getState().window.fadeWindow(false);
//       mainWindow.close();
//     }
//   });

//   ipcMain.handle('show-window', async (_, show: boolean) => {
//     await combinedStore.getState().window.fadeWindow(show);
//     return { success: true };
//   });

//   // 새로운 타겟 윈도우 관련 핸들러들
//   ipcMain.handle('select-target-window', async () => {
//     return await combinedStore.getState().window.selectTargetWindow();
//   });

//   ipcMain.handle('attach-to-window', async (_, windowInfo) => {
//     return await combinedStore.getState().window.attachToTargetWindow(windowInfo);
//   });

//   ipcMain.handle('detach-from-window', async () => {
//     combinedStore.getState().window.detachFromTargetWindow();
//     return { success: true };
//   });

//   ipcMain.handle('capture-target-window', async () => {
//     return await combinedStore.getState().window.captureTargetWindow();
//   });

//   ipcMain.handle('update-attach-position', async (_, position) => {
//     combinedStore.getState().window.updateAttachPosition(position);
//     return { success: true };
//   });

//   ipcMain.handle('get-all-windows', async () => {
//     return await combinedStore.getState().window.getAllWindows();
//   });

//   // hideWindowBlock을 사용하는 스크린샷 핸들러
//   ipcMain.handle('trigger-screenshot', async () => {
//     const mainWindow = combinedStore.getState().window.mainWindow;
//     if (!mainWindow) return { error: 'No main window available' };

//     try {
//       const screenshotPath = await combinedStore.getState().window.hideWindowBlock(async () => {
//         // 여기서 실제 스크린샷 로직 실행
//         return await combinedStore.getState().overlay.TAKE_SCREENSHOT(
//           () => {}, // hideWindow는 이미 처리됨
//           () => {}  // showWindow도 이미 처리됨
//         );
//       });

//       mainWindow.webContents.send('screenshot-taken', {
//         path: screenshotPath,
//       });

//       return { success: true };
//     } catch (error: any) {
//       console.error('Error triggering screenshot:', error);
//       return { error: 'Failed to trigger screenshot' };
//     }
//   });
// }

// app.on('window-all-closed', () => {
//   try {
//     manager.stopServer('remote-mcp-server');
//     manager.stopServer('local-express-server');
//   } catch (err) {
//     console.error('서버 종료 중 오류:', err);
//   }
//   if (process.platform !== 'darwin') app.quit();
// });

// app.whenReady()
//   .then(async () => {
//     if (isDebug) await installExtensions();
    
//     // API 키 초기화 (필요한 경우)
//     // combinedStore.getState().overlay.INIT_API_KEY();
    
//     createWindow();
//     setupMcpHealthCheckHandlers();
//     setupMCPHandlers();
//     setupMCPpreLoad();
    
//     app.on('activate', () => {
//       if (BrowserWindow.getAllWindows().length === 0) createWindow();
//     });
//   })
//   .catch(console.log);

// app.on('before-quit', async () => {});

// app.on('will-quit', () => {
//   globalShortcut.unregisterAll();
// });

// // ===== MCP 서버 관련 IPC 핸들러 =====

// // 활성 세션 조회
// ipcMain.handle('mcp:getActiveSessions', async (event, serverName?: string) => {
//   try {
//     return await manager.getActiveSessions(serverName);
//   } catch (error) {
//     console.error('Error getting active sessions:', error);
//     return [];
//   }
// });

// // 세션 ID 조회
// ipcMain.handle('mcp:getSessionId', async (event, config) => {
//   const serverId = config?.id || config?.name;
//   if (!serverId) return null;
//   try {
//     const sessionInfo = getServerSessionInfo(serverId);
//     return sessionInfo?.sessionId || null;
//   } catch (e) {
//     console.error('[main] mcp:getSessionId error:', e);
//     return null;
//   }
// });

// // 워크플로우 실행
// ipcMain.handle('workflow:execute', async (event, payload) => {
//   console.log('🔥 [main] workflow:execute 핸들러 시작');
//   console.log('📨 [main] 받은 payload:', JSON.stringify(payload, null, 2));
  
//   const { workflowId, nodes, edges, triggerId, context } = payload;
//   const results: Record<string, any> = {};
//   let currentContext = context || {};

//   console.log(`🎯 [main] 처리할 노드 개수: ${nodes.length}`);

//   const claudeIntegration = new ClaudeDesktopIntegration();
//   const executorFactory = new NodeExecutorFactory(claudeIntegration);
//   const executionContext = new ExecutionContext();

//   if (currentContext) {
//     Object.entries(currentContext).forEach(([key, value]) => {
//       executionContext.set(key, value);
//     });
//   }

//   for (const node of nodes) {
//     console.log(`🔄 [main] 노드 ${node.id} (${node.type}) 처리 시작`);
    
//     try {
//       const executor = executorFactory.create(node);
//       console.log(`⚡ [main] NodeExecutor 생성됨: ${executor ? '성공' : '실패'}`);
      
//       if (executor && executor.execute) {
//         const executePayload = {
//           nodeId: String(node.id),
//           context: executionContext,
//           nodes,
//           edges,
//           triggerId
//         };
        
//         const result = await executor.execute(executePayload);
//         console.log(`✅ [main] 노드 ${node.id} 실행 완료:`, result);
        
//         results[node.id] = result;
//         executionContext.set(String(node.id), result);
//         Object.assign(currentContext, result);
//       } else {
//         console.log(`⚠️ [main] 노드 ${node.id} executor가 없거나 execute 메서드가 없음`);
//       }
//     } catch (error: unknown) {
//       let message = 'Unknown error';
//       if (error && typeof error === 'object' && 'message' in error) {
//         message = (error as any).message;
//       } else if (typeof error === 'string') {
//         message = error;
//       }
//       console.error(`❌ [main] 노드 ${node.id} 실행 실패:`, message);
//       results[node.id] = { error: true, message };
//       break;
//     }
//   }

//   console.log('🏁 [main] workflow:execute 완료, 최종 결과:', currentContext);
  
//   return {
//     success: true,
//     finalData: currentContext,
//   };
// });

// // Claude 관련 핸들러
// ipcMain.handle('claude:getAllServers', () => {
//   const claude = new ClaudeDesktopIntegration();
//   return claude.getAllConnectedServers();
// });

// ipcMain.handle('claude:removeServer', (event, serverName) => {
//   const claude = new ClaudeDesktopIntegration();
//   return claude.disconnectServer(serverName);
// });

// // Claude Desktop 연결 핸들러
// ipcMain.handle('connect-to-claude-desktop', async (event, serverName: string, serverConfig: any) => {
//   console.log(`🚀 [main] Claude Desktop 연결 요청: ${serverName}`);
  
//   try {
//     const claude = new ClaudeDesktopIntegration();
//     const connected = claude.connectServer(serverName, serverConfig);
    
//     console.log(`${connected ? '✅' : '❌'} [main] Claude Desktop 연결 결과: ${serverName} - ${connected ? '성공' : '실패'}`);
//     return connected;
    
//   } catch (error) {
//     console.error(`❌ [main] Claude Desktop 연결 오류: ${serverName}`, error);
//     return false;
//   }
// });