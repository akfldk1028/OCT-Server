// src/main/store/screenshotActions.ts
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
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
        // 플랫폼별 스크린샷 캡처
        const screenshotBuffer =
          process.platform === 'darwin'
            ? await captureScreenshotMac()
            : await captureScreenshotWindows();

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

// 플랫폼별 스크린샷 캡처 구현
async function captureScreenshotMac(): Promise<Buffer> {
  const tmpPath = path.join(app.getPath('temp'), `${uuidv4()}.png`);
  await execFileAsync('screencapture', ['-x', tmpPath]);
  const buffer = await fs.promises.readFile(tmpPath);
  await fs.promises.unlink(tmpPath);
  return buffer;
}

async function captureScreenshotWindows(): Promise<Buffer> {
  const tmpPath = path.join(app.getPath('temp'), `${uuidv4()}.png`);
  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
    $bitmap.Save('${tmpPath.replace(/\\/g, '\\\\')}')
    $graphics.Dispose()
    $bitmap.Dispose()
  `;
  await execFileAsync('powershell', ['-command', script]);
  const buffer = await fs.promises.readFile(tmpPath);
  await fs.promises.unlink(tmpPath);
  return buffer;
}
