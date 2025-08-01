// preload.js (올바른 수정 버전)
// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// import { preloadZustandBridge } from 'zutron/preload';
import { preloadBridge } from '@zubridge/electron/preload';
import { workflowAPI } from './preload-workflow';
import { overlayAPI } from './preload-overlay';

// import type { AppState as OverlayState } from '../common/types/overlay-types';
// import type { AppState as AnthropicState } from '../common/types/action-types';

import {CombinedState} from "@/common/types/root-types";

export type Channels =
  | 'ipc-example'
  | 'startServer'
  | 'stopServer'
  | 'getServers'
  | 'getConfigSummaries'
  | 'serversUpdated'
  | 'installServer'
  | 'installResult'
  | 'installProgress'
  | 'uninstallServer'
  | 'uninstallResult'
  | 'uninstallProgress'
  | 'server-start-result'
  | 'server-stop-result'
  | 'server-log'
  | 'connect-to-claude'
  | 'disconnect-from-claude'
  | 'is-connected-to-claude'
  | 'get-claude-connected-servers'
  | 'ask-claude-connection'
  | 'confirm-claude-connection'
  | 'claude-connection-result'
  | 'connect-to-claude-desktop'
  // MCP 서버 헬스 체크 및 세션 관련 채널 추가
  | 'mcp:checkHealth'
  | 'mcp:getSessionId'
  | 'mcp:healthUpdate'
  // 워크플로우 관련 채널 추가
  | 'workflow:execute'
  | 'workflow:executeNode'
  | 'workflow:progress'
  | 'workflow:complete'
  | 'mcp-workflow:tool-call'
  // ...기존 채널
  | 'set-guide-window'
  | 'reset-window'
  // 🌲 커스텀 타이틀바 윈도우 컨트롤 채널들 추가
  | 'minimize-window'
  | 'maximize-window'
  | 'close-window'
  | 'show-window'
  // 🔥 Window-Specific Overlay 채널들 추가
  | 'get-screen-access'
  | 'open-screen-security'
  | 'refresh-available-windows'
  | 'select-target-window'
  | 'attach-to-window'
  | 'detach-from-window'
  | 'capture-target-window'
  | 'update-attach-position'
  | 'get-all-windows'
  | 'find-window-by-title'
  | 'toggle-window-mode'
  | 'get-available-windows'
  | 'select-window-by-id'
  // 🔥 개발자 도구 관련 채널들 추가
  | 'devtools:open'
  | 'devtools:close'
  | 'devtools:toggle'
  | 'devtools:status'
  | 'auth:social-login';


const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    // invoke: (channel: Channels, ...args: unknown[]) =>
    //   ipcRenderer.invoke(channel, ...args),
    invoke: (channel: string, ...args: any[]) => {
      const validChannels = [
        'window-at-point',
        'mcp:connect',
        'mcp:disconnect',
        'mcp:sendMessage',
        'room:create',
        'session:create',
        'transport:create',
        'transport:close',
        'client:create',
        'client:connect',
        'client:sendRequest',
        'mcpRegistry:registerServer',
        'mcpRegistry:refreshTools',
        'mcpRegistry:executeTool',
        'mcp:connectServer',
        'mcp:getStatus',
        'workflow:execute',
        'workflow:executeNode',
        // 🌲 커스텀 타이틀바 윈도우 컨트롤 채널들 추가
        'minimize-window',
        'maximize-window',
        'close-window',
        'show-window',
        // 🔥 Window-Specific Overlay IPC 채널들 추가
        'get-screen-access',
        'open-screen-security',
        'refresh-available-windows',
        'select-target-window',
        'attach-to-window',
        'detach-from-window',
        'capture-target-window',
        'update-attach-position',
        'get-all-windows',
        'find-window-by-title',
        'toggle-window-mode',
        'get-available-windows',
        'select-window-by-id',
        // 🔥 새로운 창 선택 모드 채널들 추가
        'window:start-selection-mode',
        'window:attach-to-target',
        'window:detach-from-target',
        // 🔥 개발자 도구 관련 채널들 추가
        'devtools:open',
        'devtools:close',
        'devtools:toggle',
        'devtools:status',
        'auth:social-login',
        'auth:logout',
        'auth:get-session'

      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      throw new Error(`Invalid channel: ${channel}`);
    },
  },
  serverManager: {
    getStatus() {
      return ipcRenderer.invoke('server:getStatus');
    },
    startServer(name: string) {
      return ipcRenderer.invoke('server:start', name);
    },
    stopServer(name: string) {
      return ipcRenderer.invoke('server:stop', name);
    },
    getAllServers() {
      return ipcRenderer.invoke('server:getAllServers');
    },
  },

  // MCP 서버 관련 기능 추가
  mcpManager: {
    // MCP 서버 상태 확인 (헬스 체크)
    checkHealth(serverUrl: string = 'http://localhost:4303') {
      return ipcRenderer.invoke('mcp:checkHealth', serverUrl);
    },

    // 헬스 체크 상태 변경 구독
    onHealthUpdate(callback: (data: any) => void) {
      const subscription = (_event: IpcRendererEvent, data: any) =>
        callback(data);
      ipcRenderer.on('mcp:healthUpdate', subscription);
      return () => {
        ipcRenderer.removeListener('mcp:healthUpdate', subscription);
      };
    },

    // 세션 ID 가져오기
    getSessionId(serverUrl: string = 'http://localhost:4303') {
      return ipcRenderer.invoke('mcp:getSessionId', serverUrl);
    },
  },

  // 🔥 개발자 도구 관련 기능 추가
  devTools: {
    // 개발자 도구 열기
    open() {
      return ipcRenderer.invoke('devtools:open');
    },

    // 개발자 도구 닫기
    close() {
      return ipcRenderer.invoke('devtools:close');
    },

    // 개발자 도구 토글 (열려있으면 닫고, 닫혀있으면 열기)
    toggle() {
      return ipcRenderer.invoke('devtools:toggle');
    },

    // 개발자 도구 상태 확인
    getStatus() {
      return ipcRenderer.invoke('devtools:status');
    },
  },
};

// 사용자 역할 확인 (메인 프로세스에서 전달받거나 환경 변수로 설정)
const isAdmin = process.env.USER_ROLE === 'admin';

if (isAdmin) {
  // 관리자용 환경 변수 노출 (모든 키 포함)
  contextBridge.exposeInMainWorld('electronEnv', {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // 관리자만 접근 가능
  });
  console.log('Admin environment variables exposed');
} else {
  // 일반 사용자용 환경 변수 노출 (제한된 키)
  contextBridge.exposeInMainWorld('electronEnv', {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    // service_role_key는 포함하지 않음
  });
  console.log('Regular user environment variables exposed');
}

// IPC 통신 설정 (electronHandler의 invoke 메서드 재사용)
contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (channel: string, data: any) => ipcRenderer.send(channel, data),
  onMessage: (channel: string, func: (...args: any[]) => void) => {
    const subscription = (event: any, ...args: any[]) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  // 🔥 electronHandler의 invoke 메서드 재사용 (중복 제거)
  invoke: electronHandler.ipcRenderer.invoke,
  // 🔥 Auth 세션 업데이트 리스너 추가
  onAuthSessionUpdated: (callback: (data: { user: any; session: any }) => void) => {
    const subscription = (event: any, data: { user: any; session: any }) => callback(data);
    ipcRenderer.on('auth:session-updated', subscription);
    return () => ipcRenderer.removeListener('auth:session-updated', subscription);
  },
  // 🔥 로그아웃 리스너 추가
  onLoggedOut: (callback: () => void) => {
    const subscription = (event: any) => callback();
    ipcRenderer.on('auth:logged-out', subscription);
    return () => ipcRenderer.removeListener('auth:logged-out', subscription);
  },
  // 역할 확인용 API 추가
  isAdmin: () => isAdmin,
  // 관리자 기능 요청 메서드 (메인 프로세스에서 처리)
  requestAdminOperation: (operation: any, params: any) =>
    ipcRenderer.invoke('admin-operation', operation, params),
});

// ResizeObserver 경고 무시
window.addEventListener('error', (event) => {
  if (
    typeof event.message === 'string' &&
    event.message.includes('ResizeObserver loop completed')
  ) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});


// Electron API 정의
const api = {

  ...workflowAPI,
  workflow: workflowAPI,


  getWindowAtPoint: (x: number, y: number) =>
    ipcRenderer.invoke('window-at-point', {x, y}),

  // 🔥 Window Selection API 추가
  startWindowSelectionMode: () =>
    ipcRenderer.invoke('window:start-selection-mode'),

  attachToTargetWindow: (windowInfo: any) =>
    ipcRenderer.invoke('window:attach-to-target', windowInfo),

  detachFromTargetWindow: () =>
    ipcRenderer.invoke('window:detach-from-target'),

  // 오버레이 API 병합
  // overlay: overlayAPI,
};


// const { handlers } = preloadBridge<RootState>();
const { handlers } = preloadBridge<CombinedState>();



contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('zubridge', handlers);

contextBridge.exposeInMainWorld('overlayAPI', {
  sendMessage: (channel: string, ...args: any[]) =>
    ipcRenderer.send(channel, ...args),
  onMessage: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
});

export type ElectronHandler = typeof electronHandler;
export type Api = typeof api;
