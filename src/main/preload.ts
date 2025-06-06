// preload.js (올바른 수정 버전)
// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// import { preloadZustandBridge } from 'zutron/preload';
import { preloadBridge } from '@zubridge/electron/preload';
import { workflowAPI } from './preload-workflow';
import { overlayAPI } from './preload-overlay';
import { mcpAPI } from './stores/renderProxy/rendererMCPProxy-preload';

import type { AppState as OverlayState } from '../common/types/overlay-types';
import type { AppState as AnthropicState } from '../common/types/action-types';

import type { RootState } from '../common/types/root-types';
import {CombinedState} from "@/common/types/root-types";
import { MainMCPService } from './stores/renderProxy/rendererMCPProxy-preload';

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
  | 'reset-window';

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
        'mcp:getStatus'
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

// IPC 통신 설정
contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (channel: string, data: any) => ipcRenderer.send(channel, data),
  onMessage: (channel: string, func: (...args: any[]) => void) => {
    const subscription = (event: any, ...args: any[]) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
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

// 타입 정의
interface ServerInfo {
  id: string;
  name: string;
  status: 'stopped' | 'running' | 'error' | 'starting' | 'stopping';
  type: string;
  host?: string;
  port?: number;
  sessionId?: string;
  activeSessions?: number;
  config?: {
    command?: string;
    args?: string[];
    transportType?: 'stdio' | 'sse' | 'streamable-http';
    sseUrl?: string;
    env?: Record<string, string>;
  };
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  lastError?: string;
}

// Electron API 정의
const api = {
  // 서버 관리
  getServerStatus: async (): Promise<ServerInfo[]> => {
    return ipcRenderer.invoke('server:getStatus');
  },

  // 서버 전체 설정 정보 가져오기
  getFullConfigs: async (): Promise<ServerInfo[]> => {
    return ipcRenderer.invoke('server:getFullConfigs');
  },

  startServer: async (
    serverId: string,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('server:start', serverId);
  },

  stopServer: async (
    serverId: string,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('server:stop', serverId);
  },

  restartServer: async (
    serverId: string,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('server:restart', serverId);
  },

  installServer: async (
    name: string,
    command: string,
    envVars?: Record<string, string>,
  ): Promise<{ success: boolean; message?: string }> => {
    return electronHandler.ipcRenderer.invoke(
      'installServer',
      name,
      command,
      envVars,
    );
  },

  // 멀티 서버 관리
  startMultipleServers: async (
    serverConfigs: Array<{ serverName: string; config: any }>,
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ serverName: string; status: string; error?: string }>;
  }> => {
    return ipcRenderer.invoke('server:startMultiple', serverConfigs);
  },

  stopMultipleServers: async (
    serverNames: string[],
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ serverName: string; status: string; error?: string }>;
  }> => {
    return ipcRenderer.invoke('server:stopMultiple', serverNames);
  },

  // MCP 특화 기능
  getMcpSessionId: async (config: any): Promise<string | null> => {
    return ipcRenderer.invoke('mcp:getSessionId', config);
  },

  connectToMcpServer: async (
    serverName: string,
    config: any,
    transportType?: 'stdio' | 'sse' | 'streamable-http',
  ): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> => {
    return ipcRenderer.invoke('mcp:connect', serverName, config, transportType);
  },

  disconnectFromMcpServer: async (sessionId: string): Promise<boolean> => {
    return ipcRenderer.invoke('mcp:disconnect', sessionId);
  },

  getActiveSessions: async (serverName?: string): Promise<any[]> => {
    console.log('getActiveSessions #');
    return ipcRenderer.invoke('mcp:getActiveSessions', serverName);
  },

  // 서버 설정 관리
  addServerConfig: async (serverConfig: {
    name: string;
    command: string;
    args: string[];
    transportType: 'stdio' | 'sse' | 'streamable-http';
    env?: Record<string, string>;
  }): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('server:addConfig', serverConfig);
  },

  updateServerConfig: async (
    serverId: string,
    config: any,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('server:updateConfig', serverId, config);
  },

  removeServerConfig: async (
    serverId: string,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('server:removeConfig', serverId);
  },

  // 서버 로그 및 모니터링
  getServerLogs: async (
    serverId: string,
    lines?: number,
  ): Promise<string[]> => {
    return ipcRenderer.invoke('server:getLogs', serverId, lines);
  },

  subscribeToServerLogs: (
    serverId: string,
    callback: (log: {
      timestamp: string;
      level: string;
      message: string;
    }) => void,
  ) => {
    ipcRenderer.on(`server:logs:${serverId}`, (_, log) => callback(log));
    return () => ipcRenderer.removeAllListeners(`server:logs:${serverId}`);
  },

  // 글로벌 설정
  getGlobalConfig: async (): Promise<any> => {
    return ipcRenderer.invoke('config:get');
  },

  setGlobalConfig: async (
    config: any,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('config:set', config);
  },

  // 유틸리티
  openServerDirectory: async (serverId: string): Promise<void> => {
    return ipcRenderer.invoke('server:openDirectory', serverId);
  },

  exportServerConfig: async (
    serverId: string,
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    return ipcRenderer.invoke('server:exportConfig', serverId);
  },

  importServerConfig: async (
    configData: any,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('server:importConfig', configData);
  },

  // 파일 시스템 작업
  selectDirectory: async (): Promise<{
    canceled: boolean;
    filePath?: string;
  }> => {
    return ipcRenderer.invoke('dialog:selectDirectory');
  },

  selectFile: async (
    filters?: Array<{ name: string; extensions: string[] }>,
  ): Promise<{ canceled: boolean; filePath?: string }> => {
    return ipcRenderer.invoke('dialog:selectFile', filters);
  },

  saveFile: async (
    defaultPath?: string,
    data?: any,
  ): Promise<{ canceled: boolean; filePath?: string }> => {
    return ipcRenderer.invoke('dialog:saveFile', defaultPath, data);
  },

  // 메시지 및 알림
  showNotification: (title: string, body: string, icon?: string): void => {
    ipcRenderer.send('notification:show', { title, body, icon });
  },

  showDialog: async (options: {
    type?: 'info' | 'warning' | 'error' | 'question';
    title?: string;
    message: string;
    detail?: string;
    buttons?: string[];
    defaultId?: number;
    cancelId?: number;
  }): Promise<{ response: number; checkboxChecked?: boolean }> => {
    return ipcRenderer.invoke('dialog:show', options);
  },

  // 개발자 도구
  openDevTools: (): void => {
    ipcRenderer.send('dev:openDevTools');
  },

  reloadApp: (): void => {
    ipcRenderer.send('app:reload');
  },

  // 앱 상태 관리
  getAppVersion: async (): Promise<string> => {
    return ipcRenderer.invoke('app:getVersion');
  },

  checkForUpdates: async (): Promise<{
    available: boolean;
    version?: string;
    downloadUrl?: string;
  }> => {
    return ipcRenderer.invoke('app:checkForUpdates');
  },

  downloadUpdate: async (): Promise<{
    success: boolean;
    filePath?: string;
    message?: string;
  }> => {
    return ipcRenderer.invoke('app:downloadUpdate');
  },

  installUpdate: async (
    filePath: string,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('app:installUpdate', filePath);
  },

  // 이벤트 리스너
  onServerStatusChange: (
    callback: (data: {
      serverId: string;
      status: string;
      lastError?: string;
    }) => void,
  ) => {
    ipcRenderer.on('server:statusChange', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('server:statusChange');
  },

  onMcpSessionChange: (
    callback: (data: {
      serverName: string;
      sessionId: string;
      status: string;
    }) => void,
  ) => {
    ipcRenderer.on('mcp:sessionChange', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('mcp:sessionChange');
  },

  onAppUpdate: (
    callback: (data: {
      status: 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
      message?: string;
    }) => void,
  ) => {
    ipcRenderer.on('app:updateStatus', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('app:updateStatus');
  },

  // 진행률 추적
  onProgress: (
    callback: (data: {
      serverId: string;
      operation: string;
      percent: number;
      status: string;
    }) => void,
  ) => {
    ipcRenderer.on('server:progress', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('server:progress');
  },

  // 메모리 모니터링
  getMemoryUsage: async (): Promise<{
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  }> => {
    return ipcRenderer.invoke('system:getMemoryUsage');
  },

  getCpuUsage: async (): Promise<number> => {
    return ipcRenderer.invoke('system:getCpuUsage');
  },

  // 플러그인 시스템 (확장 기능)
  loadPlugin: async (
    pluginPath: string,
  ): Promise<{ success: boolean; plugin?: any; message?: string }> => {
    return ipcRenderer.invoke('plugin:load', pluginPath);
  },

  unloadPlugin: async (
    pluginId: string,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('plugin:unload', pluginId);
  },

  getLoadedPlugins: async (): Promise<
    Array<{ id: string; name: string; version: string; enabled: boolean }>
  > => {
    return ipcRenderer.invoke('plugin:list');
  },

  // 디버깅 및 로깅
  log: (
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: any,
  ): void => {
    ipcRenderer.send('log', {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  },

  getAppLogs: async (lines?: number): Promise<string[]> => {
    return ipcRenderer.invoke('log:getAppLogs', lines);
  },

  clearLogs: async (): Promise<void> => {
    return ipcRenderer.invoke('log:clear');
  },

  // 백업 및 복원
  createBackup: async (): Promise<{
    success: boolean;
    backupPath?: string;
    message?: string;
  }> => {
    return ipcRenderer.invoke('backup:create');
  },

  restoreBackup: async (
    backupPath: string,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('backup:restore', backupPath);
  },

  listBackups: async (): Promise<
    Array<{ name: string; size: number; createdAt: string }>
  > => {
    return ipcRenderer.invoke('backup:list');
  },

  // 실험적 기능 플래그
  getFeatureFlags: async (): Promise<Record<string, boolean>> => {
    return ipcRenderer.invoke('feature:getFlags');
  },

  setFeatureFlag: async (
    flag: string,
    enabled: boolean,
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('feature:setFlag', flag, enabled);
  },

  // 세션 관련 API
  saveServerSession: async (
    serverId: string,
    sessionInfo: {
      sessionId: string;
      lastConnected: Date;
      transportType: 'stdio' | 'sse' | 'streamable-http';
      commandType: string;
      active?: boolean;
    },
  ): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('server:saveSession', serverId, sessionInfo);
  },

  getServerSession: async (
    serverId: string,
  ): Promise<{
    sessionId?: string;
    lastConnected?: string;
    transportType?: 'stdio' | 'sse' | 'streamable-http';
    active?: boolean;
  } | null> => {
    return ipcRenderer.invoke('server:getSession', serverId);
  },

  validateSession: async (
    sessionId: string,
  ): Promise<{
    valid: boolean;
    active?: boolean;
    message?: string;
  }> => {
    return ipcRenderer.invoke('server:validateSession', sessionId);
  },

  cleanupSessions: async (): Promise<{
    cleaned: number;
    remaining: number;
  }> => {
    return ipcRenderer.invoke('server:cleanupSessions');
  },

  ...workflowAPI,
  workflow: workflowAPI,

  // 오버레이 API 병합
  // overlay: overlayAPI,
};

// Claude Desktop 관련 API
const claudeManager = {
  getAllServers: () => ipcRenderer.invoke('claude:getAllServers'),
  removeServer: (serverName: string) =>
    ipcRenderer.invoke('claude:removeServer', serverName),
};


// const { handlers } = preloadBridge<RootState>();
const { handlers } = preloadBridge<CombinedState>();



contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('claudeAPI', claudeManager);
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
