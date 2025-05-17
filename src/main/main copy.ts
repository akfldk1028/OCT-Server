// /* eslint global-require: off, no-console: off, promise/always-return: off */

// /**
//  * This module executes inside of electron's main process. You can start
//  * electron renderer process from here and communicate with the other processes
//  * through IPC.
//  *
//  * When running `npm run build` or `npm run build:main`, this file is compiled to
//  * `./src/main.js` using webpack. This gives us some performance wins.
//  */
// import path from 'path';
// import { app, BrowserWindow, shell, ipcMain, IpcMainEvent } from 'electron';
// import { autoUpdater } from 'electron-updater';
// import log from 'electron-log';
// import installExtension, {
//   REACT_DEVELOPER_TOOLS,
// } from 'electron-devtools-installer';
// import MenuBuilder from './menu';
// import { resolveHtmlPath } from './util';
// import './mcp/serverHandlers';
// // Load environment variables from .env file at the very beginning
// import dotenv from 'dotenv';
// import {
//   getBaseMCPServerConfig,
//   getMergedMCPServerConfig,
//   updateServerInstallStatus,
//   getServerSessionInfo,
//   userConfig // userConfig 변수 가져오기
// } from './src/common/configLoader';
// import type { MCPServerExtended } from './src/common/types/server-config';
// import { ServerInstaller } from './src/common/installer/ServerInstaller';
// import { startExpressServer } from './src/common/server/server';
// import { manager } from './src/common/manager/managerInstance';
// import { setupMcpHealthCheckHandlers } from './src/common/server/services/mcpHealthCheck';
// import { ServerInstanceFactory } from './src/common/manager/ServerInstanceFactory';
// import { createNodeExecutor } from './src/common/server/node/NodeExecutorFactory';
// import { SoftwareGuideProcessingHelper } from './overlay/SoftwareGuideProcessingHelper';

// dotenv.config();

// // Optional: Log to confirm loading in main process
// console.log('[Main Process] dotenv loaded.');
// console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
// console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);


// // 인스톨러 및 언인스톨러 인스턴스 생성
// const installer = new ServerInstaller();
// // const uninstaller = new ServerUninstaller();


// class AppUpdater {
//   constructor() {
//     log.transports.file.level = 'info';
//     autoUpdater.logger = log;
//     autoUpdater.checkForUpdatesAndNotify();
//   }
// }

// let mainWindow: BrowserWindow | null = null;
// let softwareGuideManager: SoftwareGuideProcessingHelper | null = null; // 이 줄 추가



// if (process.env.NODE_ENV === 'production') {
//   const sourceMapSupport = require('source-map-support');
//   sourceMapSupport.install();
// }

// const isDebug =
//   process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// if (isDebug) {
//   require('electron-debug').default();
// }

// // const installExtensions = async () => {
// //   const installer = require('electron-devtools-installer');
// //
// //   const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
// //   const extensions = ['REACT_DEVELOPER_TOOLS'];
// //
// //   return installer
// //     .default(
// //       extensions.map((name) => installer[name]),
// //       forceDownload,
// //     )
// //     .catch(console.log);
// // };




// ipcMain.handle('installServer', async (event, serverName: string, command: string, envVars?: Record<string, string>) => {
//   console.log('⬇️ main: installServer handler received for', serverName, command);
//   console.log('⬇️ main: with environment variables:', envVars || 'none');

//   const config = await getBaseMCPServerConfig(serverName, command as MCPServerExtended['type'], envVars);
//   //  console.log('⬇️ main: installServer config', config);
//   if (!config) {
//     console.error(
//       `[Main] Base config not found for ${serverName}. Replying error.`,
//     );
//     event.sender.send('installResult', {
//       success: false,
//       serverName,
//       message: `기본 설정 파일(${serverName}.json)을 찾을 수 없습니다.`,
//     });
//     return { success: false, error: 'Config not found' };
//   }


//   try {
//     console.log(
//       `[Main] Starting installation process for ${serverName} using BASE config...`,
//     );

//     const installResult = await installer.installServer(serverName, config);

//     // console.log(
//     //   `[Main] Install attempt finished for ${serverName}. Success: ${installResult.success}`,
//     // );

//     // if (installResult.success && installResult.method) {
//     //   console.log(
//     //     `[Main] Install successful. Updating ServerManager for ${serverName} with method: ${installResult.method.type}`,
//     //   );
//     //   manager.updateServerExecutionDetails(serverName, installResult.method);
//     //   console.log(`[Main] ServerManager updated for ${serverName}.`);
//     // } else if (installResult.success) {
//     //   console.warn(
//     //     `[Main] Install successful for ${serverName}, but no specific method details received to update ServerManager.`,
//     //   );
//     // } else {
//     //   console.error(`[Main] Installation failed for ${serverName}.`);
//     // }

//     // const message = installResult.success
//     //   ? '설치 완료'
//     //   : '설치 실패 (오류 발생)';
//     // console.log(
//     //   `[Main] Sending 'installResult' to renderer for ${serverName}: success=${installResult.success}`,
//     // );
//     // event.reply('installResult', {
//     //   success: installResult.success,
//     //   serverName,
//     //   message,
//     // });

//     // if (installResult.success) {
//     //   const newMap = loadMCPServers();
//     //   // manager = new ServerManager(Array.from(newMap.values()));
//     //   event.sender.send('serversUpdated', manager.getStatus());

//     //   event.reply('ask-claude-connection', {
//     //     serverName,
//     //     serverConfig: getMCPServerConfig(serverName),
//     //   });
//     // }
//   } catch (error) {
//     console.error(
//       `[Main] Error during install process for ${serverName}:`,
//       error,
//     );
//     // event.reply('installResult', {
//     //   success: false,
//     //   serverName,
//     //   message: `설치 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`,
//     // });
//   }



//   return { success: true }; // 응답
// });

// /////////////////////////////////////////////////////////

//   // 활성 세션 조회
//   ipcMain.handle('mcp:getActiveSessions', async (event, serverName?: string) => {
//     try {
//       return await manager.getActiveSessions(serverName);
//     } catch (error) {
//       console.error('Error getting active sessions:', error);
//       return [];
//     }
//   });



// const installExtensions = async () => {
//   try {
//     const name = await installExtension(REACT_DEVELOPER_TOOLS, {
//       loadExtensionOptions: { allowFileAccess: true },
//     });
//     console.log(`✅ Loaded Extension: ${name}`);
//   } catch (err) {
//     console.error('❌ Failed to install React DevTools:', err);
//   }
// };



// let expressServer: any = null;

// // 앱 데이터 경로 정의 (configLoader.ts에 정의된 것과 일치시킴)
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

//   // Express 서버 대신 ServerManager를 통해 서버 관리
//   console.log('🚀 [main] 일렉트론 앱 시작 - Express 로컬 서버 시작 중...');

//   // Express 서버 시작
//   try {
//     await manager.startServer('local-express-server');
//     console.log('✅ [main] Express 로컬 서버 시작 완료');

//     // Zero-install 서버 인스턴스 로드 (Express 서버가 시작된 후)
//     console.log('📂 [main] 서버 인스턴스 로드 시작...');
//     const loadedCount = ServerInstanceFactory.loadServerConfigs(appDataPath);
//     console.log(`📊 [main] 서버 인스턴스 로드 완료: ${loadedCount}개 서버 로드됨`);
//   } catch (error) {
//     console.error('❌ [main] Express 로컬 서버 시작 실패:', error);
//   }

//   // 필요한 경우 MCP 서버도 시작
//   // await manager.startServer('remote-mcp-server');

//   // 직접 Express 서버를 실행하는 것이 아닌 ServerManager를 통해 관리하므로 제거
//   // expressServer = startExpressServer();

//   const RESOURCES_PATH = app.isPackaged
//     ? path.join(process.resourcesPath, 'assets')
//     : path.join(__dirname, '../../assets');

//   const getAssetPath = (...paths: string[]): string => {
//     return path.join(RESOURCES_PATH, ...paths);
//   };

//   mainWindow = new BrowserWindow({
//     show: false,
//     width: 1024,
//     height: 728,
//     icon: getAssetPath('icon.png'),
//     webPreferences: {
//       preload: app.isPackaged
//         ? path.join(__dirname, 'preload.js')
//         : path.join(__dirname, '../../.erb/dll/preload.js'),
//     },
//   });
//   //   win.loadURL('http://localhost:3000'); // express 서버에서 프론트 제공 시 (중복 및 에러로 삭제)
//   softwareGuideManager = new SoftwareGuideProcessingHelper(mainWindow);

//   mainWindow.loadURL(resolveHtmlPath('index.html'));

//   if (isDebug) {
//     mainWindow.webContents.openDevTools({ mode: 'detach' });
//   }

//   mainWindow.on('ready-to-show', () => {
//     if (!mainWindow) {
//       throw new Error('"mainWindow" is not defined');
//     }
//     if (process.env.START_MINIMIZED) {
//       mainWindow.minimize();
//     } else {
//       mainWindow.show();
//     }
//   });

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//     // 이 부분 추가
//     if (softwareGuideManager) {
//       softwareGuideManager.updateMainWindow(null);
//     }
//   });

//   const menuBuilder = new MenuBuilder(mainWindow);
//   menuBuilder.buildMenu();

//   // Open urls in the user's browser
//   mainWindow.webContents.setWindowOpenHandler((edata) => {
//     shell.openExternal(edata.url);
//     return { action: 'deny' };
//   });

//   // Remove this if your app does not use auto updates
//   // eslint-disable-next-line
//   new AppUpdater();
// };

// /**
//  * Add event listeners...
//  */

// app.on('window-all-closed', () => {
//   // 애플리케이션 종료 시 모든 서버 중지
//   try {
//     manager.stopServer('remote-mcp-server');
//     manager.stopServer('local-express-server');
//   } catch (err) {
//     console.error('서버 종료 중 오류:', err);
//   }

//   // Respect the OSX convention of having the application in memory even
//   // after all windows have been closed
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// // app
// //   .whenReady()
// //   .then(() => {
// //     createWindow();
// //     app.on('activate', () => {
// //       // On macOS it's common to re-create a window in the app when the
// //       // dock icon is clicked and there are no other windows open.
// //       if (mainWindow === null) createWindow();
// //     });
// //   })
// //   .catch(console.log);
// app
//   .whenReady()
//   .then(async () => {
//     if (isDebug) {
//       await installExtensions();
//     }
//     createWindow();
//     setupMcpHealthCheckHandlers();
//     app.on('activate', () => {
//       if (mainWindow === null) createWindow();
//     });
//   })
//   .catch(console.log);


// ipcMain.handle('mcp:getSessionId', async (event, config) => {
//   // config에서 서버 id나 name을 추출
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

// // src/main/main.ts

// // 세션 저장




// // ///////////////////////////////////////////////////

// ipcMain.handle('workflow:execute', async (event, payload) => {
//   const { workflowId, nodes, edges, triggerId, context } = payload;
//   const results: Record<string, any> = {};
//   let currentContext = context || {};

//   for (const node of nodes) {
//     try {
//       const executor = createNodeExecutor(node, nodes, edges, triggerId);
//       const result = await executor.execute(currentContext, nodes, edges, triggerId);
//       results[node.id] = result;
//       currentContext[node.id] = result;
//       Object.assign(currentContext, result);
//     } catch (error: unknown) {
//       let message = 'Unknown error';
//       if (error && typeof error === 'object' && 'message' in error) {
//         message = (error as any).message;
//       } else if (typeof error === 'string') {
//         message = error;
//       }
//       results[node.id] = { error: true, message };
//       break;
//     }
//   }

//   return {
//     success: true,
//     finalData: currentContext,
//   };
// });

// // ipcMain.handle('workflow:execute', async (event, payload) => {
// //   // payload 전체를 depth 제한 없이 예쁘게 출력
// //   console.log('⬇️ main: workflow:execute handler received for',
// //     JSON.stringify(payload, (key, value) => {
// //       // 순환 참조 방지 및 함수 등 제외
// //       if (typeof value === 'function') return '[Function]';
// //       return value;
// //     }, 2)
// //   );
// //   // payload.nodes, payload.edges, payload.triggerId, payload.context 등
// //   // 모든 데이터 접근 가능
// // });
// import { ClaudeDesktopIntegration } from '../main/src/common/server/node/service/claude'; // 실제 경로로 수정

// ipcMain.handle('claude:getAllServers', () => {
//   const claude = new ClaudeDesktopIntegration();
//   return claude.getAllConnectedServers();
// });

// ipcMain.handle('claude:removeServer', (event, serverName) => {
//   const claude = new ClaudeDesktopIntegration();
//   return claude.disconnectServer(serverName);
// });


// // 앱 종료 시 정리
// app.on('before-quit', async () => {
//   if (softwareGuideManager) {
//     await softwareGuideManager.cleanup();
//   }
// });

