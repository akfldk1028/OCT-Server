
// // main/mcp-handler.ts - IPC 핸들러에서 사용
// import { ipcMain } from 'electron';
// import { installerStore, installerThunks } from './installerStore';

// export function setupMCPInstallerHandlers() {
//   // 설치 요청 핸들러
//   ipcMain.handle('mcp:install', async (event, payload) => {
//     const { serverName, config, preferredMethod } = payload;
    
//     try {
//       // installerThunks를 통해 설치 실행
//       const result = await installerThunks.installServer(
//         serverName,
//         config,
//         preferredMethod
//       );
      
//       return result;
//     } catch (error) {
//       console.error('설치 중 오류:', error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : '설치 실패',
//       };
//     }
//   });
  
//   // 설치 진행 상태 조회
//   ipcMain.handle('mcp:getInstallProgress', (event, serverName) => {
//     const state = installerStore.getState();
//     return state.installProgress[serverName];
//   });
  
//   // 설치 취소
//   ipcMain.handle('mcp:cancelInstall', (event, serverName) => {
//     installerThunks.cancelInstall(serverName);
//     return { success: true };
//   });
  
//   // 사용 가능한 설치 방법 확인
//   ipcMain.handle('mcp:checkAvailableMethods', async () => {
//     const methods = await installerThunks.checkAvailableMethods();
//     return methods;
//   });
  
//   // 배치 설치
//   ipcMain.handle('mcp:batchInstall', async (event, servers) => {
//     // 우선순위에 따라 큐에 추가
//     servers.forEach((server: any, index: number) => {
//       installerThunks.addToQueue(
//         server.name,
//         server.config,
//         servers.length - index // 순서대로 우선순위 부여
//       );
//     });
    
//     // 큐 처리 시작
//     await installerThunks.processQueue();
    
//     return { success: true };
//   });
// }
