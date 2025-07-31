// src/main/stores/update/updateStore.ts
import { createStore } from 'zustand/vanilla';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

export interface UpdateState {
  currentVersion: string;
  status: 'idle' | 'checking' | 'downloading' | 'ready' | 'error';
  lastError: string | null;
  
  init: () => void;
}

export const updateStore = createStore<UpdateState>((set, get) => ({
  currentVersion: process.env.npm_package_version || '0.0.0',
  status: 'idle',
  lastError: null,

  init: () => {
    // 개발 환경 스킵
    if (process.env.NODE_ENV === 'development') {
      log.info('🔧 Auto updater disabled in development');
      return;
    }

    // 완전 자동 설정
    autoUpdater.autoDownload = true;  // 자동 다운로드
    autoUpdater.autoInstallOnAppQuit = true;  // 종료 시 자동 설치
    autoUpdater.logger = log;

    // 이벤트 로깅만
    autoUpdater.on('checking-for-update', () => {
      log.info('🔍 Checking for updates...');
      set({ status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      log.info(`✅ Update available: ${info.version}`);
      set({ status: 'downloading' });
    });

    autoUpdater.on('update-not-available', () => {
      log.info('ℹ️ Already up to date');
      set({ status: 'idle' });
    });

    autoUpdater.on('download-progress', (progress) => {
      log.info(`📥 Download: ${progress.percent.toFixed(1)}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info(`✅ Update ready: ${info.version}`);
      set({ status: 'ready' });
      
      // 자동 알림 표시 (OS 네이티브 알림)
      autoUpdater.checkForUpdatesAndNotify({
        title: '업데이트 준비 완료',
        body: '다음 실행 시 자동으로 설치됩니다.'
      });
    });

    autoUpdater.on('error', (error) => {
      log.error('❌ Update error:', error);
      set({ status: 'error', lastError: error.message });
    });

    // 시작 30초 후 체크
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 30000);

    // 4시간마다 체크
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }
}));