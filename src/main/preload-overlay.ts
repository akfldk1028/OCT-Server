// preload-overlay.ts
import { ipcRenderer } from 'electron';

// 오버레이 API 정의
export const overlayAPI = {
  // 소프트웨어 가이드 표시
  showSoftwareGuide: async (guideData: any): Promise<{ success: boolean; error?: string }> => {
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
  toggleGuideMode: async (enabled: boolean): Promise<{
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
  requestSoftwareGuide: async (software: string, question: string): Promise<any> => {
    return ipcRenderer.invoke('process-software-guide', { software, question });
  },

  // 오버레이 위치 업데이트 (윈도우 이동 시)
  updateOverlayPositions: async (windowBounds: any): Promise<void> => {
    return ipcRenderer.invoke('update-overlay-positions', windowBounds);
  }
};

export type OverlayAPI = typeof overlayAPI;
