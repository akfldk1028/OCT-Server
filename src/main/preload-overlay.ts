// preload-overlay.ts
import { contextBridge, ipcRenderer } from 'electron';

// 오버레이 API 정의
export const overlayAPI = {
  // 소프트웨어 가이드 표시
  showSoftwareGuide: async (
    guideData: any,
  ): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('show-software-guide', guideData);
  },

  // 모든 오버레이 정리
  clearGuideOverlays: async (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('clear-guide-overlays');
  },

  // 활성 윈도우 정보 가져오기
  getActiveWindow: async (): Promise<any> => {
    return ipcRenderer.invoke('get-active-window');
  },

  // 가이드 모드 토글
  toggleGuideMode: async (
    enabled: boolean,
  ): Promise<{
    success: boolean;
    mode: string;
  }> => {
    return ipcRenderer.invoke('toggle-guide-mode', enabled);
  },

  // 현재 앱 모드 조회
  getAppMode: async (): Promise<{
    mode: 'server-only' | 'guide-enabled';
    guideEnabled: boolean;
  }> => {
    return ipcRenderer.invoke('get-app-mode');
  },

  // 가이드 상태 변경 이벤트 리스너
  onGuideStarted: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('guide-started', subscription);
    return () => ipcRenderer.removeListener('guide-started', subscription);
  },

  onGuideCompleted: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('guide-completed', subscription);
    return () => ipcRenderer.removeListener('guide-completed', subscription);
  },

  onGuideError: (callback: (error: string) => void) => {
    const subscription = (_event: any, error: string) => callback(error);
    ipcRenderer.on('guide-error', subscription);
    return () => ipcRenderer.removeListener('guide-error', subscription);
  },

  // 소프트웨어별 가이드 요청 (Processing Helper 사용)
  requestSoftwareGuide: async (
    software: string,
    question: string,
  ): Promise<any> => {
    return ipcRenderer.invoke('process-software-guide', { software, question });
  },
  // getState: () => ipcRenderer.invoke('getState'),
  // 오버레이 위치 업데이트 (윈도우 이동 시)
  updateOverlayPositions: async (windowBounds: any): Promise<void> => {
    return ipcRenderer.invoke('update-overlay-positions', windowBounds);
  },
};

// export type OverlayAPI = typeof overlayAPI;

//
// // src/main/preload.ts
// import { contextBridge, ipcRenderer } from 'electron';
//
// // API 정의
// const api = {
//   // 스크린샷 관련 API
//   screenshot: {
//     getQueue: () => ipcRenderer.invoke('get-screenshot-queue'),
//     getExtraQueue: () => ipcRenderer.invoke('get-extra-screenshot-queue'),
//     delete: (path: string) => ipcRenderer.invoke('delete-screenshot', path),
//     getPreview: (path: string) => ipcRenderer.invoke('get-image-preview', path),
//     trigger: () => ipcRenderer.invoke('trigger-screenshot'),
//     take: () => ipcRenderer.invoke('take-screenshot'),
//   },
//
//   // 창 관리 API
//   window: {
//     toggle: () => ipcRenderer.invoke('toggle-window'),
//     moveLeft: () => ipcRenderer.invoke('trigger-move-left'),
//     moveRight: () => ipcRenderer.invoke('trigger-move-right'),
//     moveUp: () => ipcRenderer.invoke('trigger-move-up'),
//     moveDown: () => ipcRenderer.invoke('trigger-move-down'),
//     reset: () => ipcRenderer.send('reset-window'),
//     setGuideMode: () => ipcRenderer.send('set-guide-window'),
//   },
//
//   // 가이드 관련 API
//   guide: {
//     process: (software: string, question: string) =>
//       ipcRenderer.invoke('process-software-guide', { software, question }),
//     submit: (software: string, question: string) =>
//       ipcRenderer.invoke('submit-guide-question', { software, question }),
//     toggleMode: (enabled: boolean) =>
//       ipcRenderer.invoke('toggle-guide-mode', enabled),
//     getMode: () => ipcRenderer.invoke('get-app-mode'),
//     clear: () => ipcRenderer.invoke('clear-guide-overlays'),
//     getActiveSoftware: () => ipcRenderer.invoke('get-active-window'),
//   },
//
//   // 업데이트 관련 API
//   updater: {
//     start: () => ipcRenderer.invoke('start-update'),
//     install: () => ipcRenderer.invoke('install-update'),
//   },
//
//   // 기타 API
//   reset: () => ipcRenderer.invoke('trigger-reset'),
//   getState: () => ipcRenderer.invoke('getState'),
//
//   // 이벤트 리스너
//   on: (channel: string, callback: (...args: any[]) => void) => {
//     ipcRenderer.on(channel, (_event, ...args) => callback(...args));
//   },
//
//   // 이벤트 리스너 제거
//   off: (channel: string, callback: (...args: any[]) => void) => {
//     ipcRenderer.removeListener(channel, callback);
//   },
// };
//
// // 렌더러 프로세스에 API 노출
// contextBridge.exposeInMainWorld('api', api);
