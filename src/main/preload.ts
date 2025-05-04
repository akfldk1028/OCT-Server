// preload.js
// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */

// 일반 사용자용 앱 빌드:
//
// USER_ROLE=user npm run build
//
// 관리자용 앱 빌드:
//
// USER_ROLE=admin npm run build


import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

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
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

// 사용자 역할에 기반한 환경 변수 노출
// 이 부분은 메인 프로세스에서 사용자 역할 정보를 받아야 함
console.log('Preloading environment variables based on user role...');

// 사용자 역할 확인 (메인 프로세스에서 전달받거나 환경 변수로 설정)
const isAdmin = process.env.USER_ROLE === 'admin';

if (isAdmin) {
  // 관리자용 환경 변수 노출 (모든 키 포함)
  contextBridge.exposeInMainWorld('electronEnv', {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY // 관리자만 접근 가능
  });
  console.log('Admin environment variables exposed');
} else {
  // 일반 사용자용 환경 변수 노출 (제한된 키)
  contextBridge.exposeInMainWorld('electronEnv', {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    // service_role_key는 포함하지 않음
  });
  console.log('Regular user environment variables exposed');
}

// IPC 통신 설정
contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, func) => {
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  // 역할 확인용 API 추가
  isAdmin: () => isAdmin,
  // 관리자 기능 요청 메서드 (메인 프로세스에서 처리)
  requestAdminOperation: (operation, params) =>
    ipcRenderer.invoke('admin-operation', operation, params)
});

// ResizeObserver 경고 무시
window.addEventListener('error', (event) => {
  if (typeof event.message === 'string' && event.message.includes('ResizeObserver loop completed')) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});
