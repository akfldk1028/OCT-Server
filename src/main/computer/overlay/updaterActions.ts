// src/main/store/updaterActions.ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import log from 'electron-log';
import { store } from './create';
import { AppState } from '@/common/types/overlay-types';

// UpdateInfo 타입 정의 (선택 사항)
interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
  files?: Array<{
    url: string;
    sha512?: string;
    size?: number;
  }>;
  path?: string;
  sha512?: string;
  [key: string]: any;
}

// 자동 업데이트 관련 상태 및 액션 추가
export function addUpdaterActions(
  set: (state: any) => void,
  get: () => any
) {
  return {
    // 상태 확장

    // 액션 확장
    INIT_AUTO_UPDATER: () => {
      console.log('Initializing auto-updater...');

      // 개발 모드에서는 업데이트 체크 스킵
      if (!app.isPackaged) {
        console.log('Skipping auto-updater in development mode');
        return;
      }

      if (!process.env.GH_TOKEN) {
        console.error('GH_TOKEN environment variable is not set');
        set({ updateError: 'GH_TOKEN environment variable is not set' });
        return;
      }

      // 자동 업데이터 설정
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.allowDowngrade = true;
      autoUpdater.allowPrerelease = true;

      // 로깅 설정
      autoUpdater.logger = log;
      log.transports.file.level = 'debug';
      console.log(
        'Auto-updater logger configured with level:',
        log.transports.file.level,
      );

      // 이벤트 리스너 등록
      autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
      });

      autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info);
        set({ updateAvailable: true, updateInfo: info });

        // 렌더러 프로세스에 알림
        BrowserWindow.getAllWindows().forEach((window) => {
          if (!window.isDestroyed()) {
            console.log('Sending update-available to window');
            window.webContents.send('update-available', info);
          }
        });
      });

      autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available:', info);
        set({ updateAvailable: false });
      });

      autoUpdater.on('download-progress', (progressObj) => {
        console.log('Download progress:', progressObj);
      });

      autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info);
        set({ updateDownloaded: true, updateInfo: info });

        // 렌더러 프로세스에 알림
        BrowserWindow.getAllWindows().forEach((window) => {
          if (!window.isDestroyed()) {
            console.log('Sending update-downloaded to window');
            window.webContents.send('update-downloaded', info);
          }
        });
      });

      autoUpdater.on('error', (err) => {
        console.error('Auto updater error:', err);
        set({ updateError: err.message });
      });

      // 즉시 업데이트 체크
      get().CHECK_FOR_UPDATES();

      // 주기적 업데이트 체크 설정 (1시간마다)
      setInterval(
        () => {
          get().CHECK_FOR_UPDATES();
        },
        60 * 60 * 1000,
      );
    },

    CHECK_FOR_UPDATES: () => {
      console.log('Checking for updates...');
      autoUpdater
        .checkForUpdates()
        .then((result) => {
          console.log('Update check result:', result);
        })
        .catch((err: Error) => {
          console.error('Error checking for updates:', err);
          set({ updateError: err.message });
        });
    },

    START_UPDATE: async () => {
      console.log('Start update requested');
      try {
        await autoUpdater.downloadUpdate();
        console.log('Update download completed');
        return { success: true };
      } catch (error: any) {
        console.error('Failed to start update:', error);
        set({ updateError: error.message });
        return { success: false, error: error.message };
      }
    },

    INSTALL_UPDATE: () => {
      console.log('Install update requested');
      autoUpdater.quitAndInstall();
    },
  };
}
