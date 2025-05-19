// src/main/store/ipcActions.ts
import { ipcMain, BrowserWindow } from 'electron';
import { store } from './create'; // dispatch 제거

// IPC 핸들러 관련 액션 추가
export function addIpcActions(set: (state: any) => void, get: () => any) {
  // 액션 실행 유틸리티 함수 - 로컬에서 store 사용
  const executeAction = (actionName: string, ...args: any[]) => {
    const state = store.getState() as any;
    if (typeof state[actionName] === 'function') {
      return state[actionName](...args);
    }
    console.error(`Action ${actionName} not found in store`);
    return null;
  };

  return {
    // 액션 확장
    INIT_IPC_HANDLERS: () => {
      console.log('🤖 [메인] INIT_IPC_HANDLERS 호출됨! IPC 핸들러들을 등록합니다.');
      // 창 관련 핸들러
      ipcMain.on('set-guide-window', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
          win.setBounds({ width: 600, height: 800 });
          win.setAlwaysOnTop(true);
        }
      });

      ipcMain.on('reset-window', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
          win.setBounds({ width: 1200, height: 900 });
          win.setAlwaysOnTop(false);
        }
      });


      // ipcMain.handle('getState', () => {
      //   console.log('getState IPC called!');
      //   const state = store.getState();

      //   // 직렬화 가능한 상태만 포함하는 새 객체 생성
      //   const serializableState = {
      //     isRunning: state.isRunning,
      //     isGuideMode: state.isGuideMode,
      //     error: state.error,
      //     activeView: state.activeView,
      //     activeSoftware: state.activeSoftware,
      //     apiKey: state.apiKey,
      //     apiKeySource: state.apiKeySource,
      //     updateAvailable: state.updateAvailable,
      //     updateDownloaded: state.updateDownloaded,
      //     updateInfo: state.updateInfo,
      //     updateError: state.updateError,
      //     instructions: state.instructions, // Ensure this is part of the state if needed
      //     fullyAuto: state.fullyAuto,       // Ensure this is part of the state if needed
      //     // Map이나 함수와 같은 직렬화 불가능한 객체는 제외
      //   };

      //   return serializableState;
      // });

      // dispatch 핸들러 (일단 유지하되, 개별 액션 핸들러가 우선될 수 있음)


      // 크레딧 관련 핸들러
      ipcMain.handle('set-initial-credits', async (_event, credits: number) => {
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (!mainWindow) return;

        try {
          await mainWindow.webContents.executeJavaScript(
            `window.__CREDITS__ = ${credits}`,
          );
          mainWindow.webContents.send('credits-updated', credits);
        } catch (error) {
          console.error('Error setting initial credits:', error);
          throw error;
        }
      });

      ipcMain.handle('decrement-credits', async () => {
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (!mainWindow) return;

        try {
          const currentCredits =
            await mainWindow.webContents.executeJavaScript(
              'window.__CREDITS__',
            );
          if (currentCredits > 0) {
            const newCredits = currentCredits - 1;
            await mainWindow.webContents.executeJavaScript(
              `window.__CREDITS__ = ${newCredits}`,
            );
            mainWindow.webContents.send('credits-updated', newCredits);
          }
        } catch (error) {
          console.error('Error decrementing credits:', error);
        }
      });

      // 스크린샷 관련 핸들러
      ipcMain.handle('get-screenshot-queue', () => {
        return get().screenshotQueue;
      });

      ipcMain.handle('get-extra-screenshot-queue', () => {
        return get().extraScreenshotQueue;
      });

      ipcMain.handle('delete-screenshot', async (event, path: string) => {
        return executeAction('DELETE_SCREENSHOT', path);
      });

      ipcMain.handle('get-image-preview', async (event, path: string) => {
        return executeAction('GET_IMAGE_PREVIEW', path);
      });

      // 스크린샷 트리거 핸들러
      ipcMain.handle('trigger-screenshot', async () => {
        const mainWindow = BrowserWindow.getFocusedWindow();
        if (!mainWindow) return { error: 'No main window available' };

        try {
          const hideWindow = () => mainWindow.hide();
          const showWindow = () => mainWindow.show();

          const screenshotPath = await executeAction(
            'TAKE_SCREENSHOT',
            hideWindow,
            showWindow,
          );
          const preview = await executeAction(
            'GET_IMAGE_PREVIEW',
            screenshotPath,
          );

          mainWindow.webContents.send('screenshot-taken', {
            path: screenshotPath,
            preview,
          });

          return { success: true };
        } catch (error: any) {
          console.error('Error triggering screenshot:', error);
          return { error: 'Failed to trigger screenshot' };
        }
      });

      // 윈도우 관리 핸들러
      ipcMain.handle('toggle-window', () => {
        try {
          executeAction('TOGGLE_MAIN_WINDOW');
          return { success: true };
        } catch (error: any) {
          console.error('Error toggling window:', error);
          return { error: 'Failed to toggle window' };
        }
      });

      // 가이드 관련 핸들러
      ipcMain.handle(
        'process-software-guide',
        async (_, { software, question }) => {
          console.log('🚀 process-software-guide 핸들러 호출됨!', {
            software,
            question,
          });

          try {
            if (!get().isGuideMode) {
              console.log('⛔ 가이드 모드가 비활성화 상태입니다');
              return { error: 'Guide mode is disabled' };
            }

            console.log('✅ 가이드 모드 활성화 상태 확인 완료');

            // 소프트웨어 감지
            if (!software || software === 'unknown') {
              console.log('🔍 활성 소프트웨어 감지 시작...');
              const activeWindow = await executeAction(
                'DETECT_ACTIVE_SOFTWARE',
              );
              software = activeWindow.software;
              console.log(`🖥️ 감지된 소프트웨어: ${software}`);
            } else {
              console.log(`💻 요청된 소프트웨어: ${software}`);
            }

            // 스크린샷 캡처
            const mainWindow = BrowserWindow.getFocusedWindow();
            if (!mainWindow) {
              console.log('❌ 메인 윈도우를 찾을 수 없습니다');
              return { error: 'No main window available' };
            }

            console.log('📸 스크린샷 캡처 시작...');
            const hideWindow = () => {
              console.log('🙈 윈도우 숨김');
              mainWindow.hide();
            };

            const showWindow = () => {
              console.log('🙉 윈도우 표시');
              mainWindow.show();
            };

            const screenshotPath = await executeAction(
              'TAKE_SCREENSHOT',
              hideWindow,
              showWindow,
            );
            console.log(`📷 스크린샷 저장 완료: ${screenshotPath}`);

            console.log('🖼️ 이미지 미리보기 생성 중...');
            const screenshotData = await executeAction(
              'GET_IMAGE_PREVIEW',
              screenshotPath,
            );
            console.log('🖼️ 이미지 미리보기 생성 완료');

            // 가이드 생성
            console.log(`🤖 "${question}" 질문에 대한 가이드 생성 시작...`);
            const guideData = await executeAction(
              'GENERATE_GUIDE',
              software,
              question,
              screenshotData,
            );
            console.log(
              `✨ 가이드 생성 완료: ${guideData.steps?.length || 0}개 단계`,
            );

            // 가이드 표시
            console.log('🎯 오버레이 가이드 표시 시작...');
            await executeAction('SHOW_GUIDE', guideData);
            console.log('🎉 오버레이 가이드 표시 완료!');

            return { success: true };
          } catch (error: any) {
            console.error('❌ 소프트웨어 가이드 처리 오류:', error);
            return {
              error: `Failed to process software guide: ${error.message}`,
            };
          }
        },
      );

      // 커스텀 질문 모달 핸들러
      ipcMain.handle(
        'submit-guide-question',
        async (_, { software, question }) => {
          try {
            // 직접 PROCESS_GUIDE 액션을 호출하도록 변경
            const state = store.getState() as any;
            if (typeof state.PROCESS_GUIDE === 'function') {
               return await state.PROCESS_GUIDE({ software, question });
            }
            console.error('PROCESS_GUIDE action not found in store for submit-guide-question');
            return { error: 'PROCESS_GUIDE action not found' };
          } catch (error: any) {
            console.error('Error processing guide question:', error);
            return { error: 'Failed to process guide question' };
          }
        },
      );

      // 가이드 모드 토글 핸들러
      ipcMain.handle('toggle-guide-mode', async (_, enabled: boolean) => {
        executeAction('TOGGLE_GUIDE_MODE', enabled);
        return {
          success: true,
          mode: get().isGuideMode ? 'guide-enabled' : 'server-only',
        };
      });

      // 앱 모드 상태 취득 핸들러
      ipcMain.handle('get-app-mode', async () => {
        return {
          mode: get().isGuideMode ? 'guide-enabled' : 'server-only',
          guideEnabled: get().isGuideMode,
        };
      });

      // 기타 핸들러들...
      console.log('🤖 [메인] 모든 IPC 핸들러 등록 완료.');
    },
  };
}
