// src/main/store/screenshotActions.ts
import fs from 'node:fs';
import path from 'node:path';
import { app, desktopCapturer, nativeImage } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { execFile } from 'child_process';
import { promisify } from 'util';


const execFileAsync = promisify(execFile);

// 스크린샷 디렉토리 초기화
export function initScreenshotDirectories() {
  const screenshotDir = path.join(app.getPath('userData'), 'screenshots');
  const extraScreenshotDir = path.join(
    app.getPath('userData'),
    'extra_screenshots',
  );

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }
  if (!fs.existsSync(extraScreenshotDir)) {
    fs.mkdirSync(extraScreenshotDir);
  }

  return { screenshotDir, extraScreenshotDir };
}

// 스크린샷 관련 액션 추가
export function addScreenshotActions(
  set: (state: any) => void,
  get: () => any,
) {
  const { screenshotDir, extraScreenshotDir } = initScreenshotDirectories();
  const MAX_SCREENSHOTS = 2;

  return {
    // 상태 확장


    // 액션 확장
    SET_VIEW: (view: 'queue' | 'solutions' | 'debug') => {
      set({ activeView: view });
    },

    TAKE_SCREENSHOT: async (hideWindow: () => void, showWindow: () => void) => {
      hideWindow();
      await new Promise((resolve) => setTimeout(resolve, 100));

      let screenshotPath = '';
      try {
        // 🔥 선택된 창 정보 가져오기
        const { combinedStore } = require('../../stores/combinedStore');
        const windowState = combinedStore.getState().window;
        const targetWindow = windowState?.targetWindowInfo;

        console.log('📸 [TAKE_SCREENSHOT] 캡처 모드:', {
          hasTargetWindow: !!targetWindow,
          windowName: targetWindow?.name,
          bounds: targetWindow ? { x: targetWindow.x, y: targetWindow.y, width: targetWindow.width, height: targetWindow.height } : null
        });

        // 플랫폼별 스크린샷 캡처 (선택된 창 기준)
        const screenshotBuffer =
          process.platform === 'darwin'
            ? await captureScreenshotMac(targetWindow)
            : await captureScreenshotWindows(targetWindow);

        // 현재 뷰에 따라 스크린샷 저장 경로 결정
        const state = get();
        if (state.activeView === 'queue') {
          screenshotPath = path.join(screenshotDir, `${uuidv4()}.png`);
          await fs.promises.writeFile(screenshotPath, screenshotBuffer);

          // 큐 업데이트 및 최대 개수 제한
          const newQueue = [...state.screenshotQueue, screenshotPath];
          if (newQueue.length > MAX_SCREENSHOTS) {
            const removedPath = newQueue.shift();
            if (removedPath) {
              try {
                await fs.promises.unlink(removedPath);
              } catch (error) {
                console.error('Error removing old screenshot:', error);
              }
            }
          }
          set({ screenshotQueue: newQueue });
        } else {
          screenshotPath = path.join(extraScreenshotDir, `${uuidv4()}.png`);
          await fs.promises.writeFile(screenshotPath, screenshotBuffer);

          // 추가 큐 업데이트 및 최대 개수 제한
          const newExtraQueue = [...state.extraScreenshotQueue, screenshotPath];
          if (newExtraQueue.length > MAX_SCREENSHOTS) {
            const removedPath = newExtraQueue.shift();
            if (removedPath) {
              try {
                await fs.promises.unlink(removedPath);
              } catch (error) {
                console.error('Error removing old screenshot:', error);
              }
            }
          }
          set({ extraScreenshotQueue: newExtraQueue });
        }
      } catch (error) {
        console.error('Screenshot error:', error);
        throw error;
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 50));
        showWindow();
      }

      return screenshotPath;
    },

    GET_IMAGE_PREVIEW: async (filepath: string) => {
      try {
        const data = await fs.promises.readFile(filepath);
        return `data:image/png;base64,${data.toString('base64')}`;
      } catch (error) {
        console.error('Error reading image:', error);
        throw error;
      }
    },

    DELETE_SCREENSHOT: async (filepath: string) => {
      try {
        await fs.promises.unlink(filepath);
        const state = get();

        if (state.activeView === 'queue') {
          set({
            screenshotQueue: state.screenshotQueue.filter(
              (path: string) => path !== filepath,
            ),
          });
        } else {
          set({
            extraScreenshotQueue: state.extraScreenshotQueue.filter(
              (path: string) => path !== filepath,
            ),
          });
        }

        return { success: true };
      } catch (error) {
        console.error('Error deleting file:', error);
        return { success: false, error: (error as Error).message };
      }
    },

    CLEAR_QUEUES: () => {
      const state = get();

      // 메인 큐 정리
      state.screenshotQueue.forEach((screenshotPath: string) => {
        fs.unlink(screenshotPath, (err) => {
          if (err)
            console.error(
              `Error deleting screenshot at ${screenshotPath}:`,
              err,
            );
        });
      });

      // 추가 큐 정리
      state.extraScreenshotQueue.forEach((screenshotPath: string) => {
        fs.unlink(screenshotPath, (err) => {
          if (err)
            console.error(
              `Error deleting extra screenshot at ${screenshotPath}:`,
              err,
            );
        });
      });

      set({
        screenshotQueue: [],
        extraScreenshotQueue: [],
      });
    },
  };
}

// 플랫폼별 스크린샷 캡처 구현 (선택된 창 기준)
async function captureScreenshotMac(targetWindow?: any): Promise<Buffer> {
  const tmpPath = path.join(app.getPath('temp'), `${uuidv4()}.png`);
  
  if (targetWindow) {
    // 🔥 선택된 창 영역만 캡처
    const { x, y, width, height } = targetWindow;
    await execFileAsync('screencapture', ['-x', '-R', `${x},${y},${width},${height}`, tmpPath]);
  } else {
    // 전체 화면 캡처 (fallback)
    await execFileAsync('screencapture', ['-x', tmpPath]);
  }
  
  const buffer = await fs.promises.readFile(tmpPath);
  await fs.promises.unlink(tmpPath);
  return buffer;
}

async function captureScreenshotWindows(targetWindow?: any): Promise<Buffer> {
  // 🔥 PowerShell 대신 desktopCapturer API 사용 (성능 최적화)
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 1920, height: 1080 } // 임시 크기, 실제론 원본 크기
  });

  let source;
  if (targetWindow && targetWindow.id) {
    // targetWindow.id 형식: "window:12345:1"
    const windowId = targetWindow.id.split(':')[1];
    source = sources.find(s => s.id.includes(windowId));
  }
  
  // 특정 창을 못 찾으면 주 화면을 캡처
  if (!source) {
    source = sources.find(s => s.id.startsWith('screen:'));
    if (!source) throw new Error('스크린샷 소스를 찾을 수 없습니다.');
  }

  const image = await source.thumbnail.toPNG();
  return image;
}
