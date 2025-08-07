import { ElectronHandler, Api } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    /** 통합 API (workflow, overlay 등 병합된 함수들) */
    api: Api;
    /** Claude 데스크탑 통합 API */
    claudeAPI: ClaudeAPI;
    /** Overlay UI 상태용 Zutron 브릿지 */
    overlayZutron: any;
    /** Anthropic 액션 상태용 Zutron 브릿지 */
    anthropicZutron: any;
    overlay: any;
    workflow: any;
    /** 일렉트론 API (IPC 통신) */
    electronAPI: {
      sendMessage: (channel: string, data: any) => void;
      onMessage: (channel: string, func: (...args: any[]) => void) => () => void;
      onAuthSessionUpdated: (callback: (data: { user: any; session: any }) => void) => () => void;
      onLoggedOut: (callback: () => void) => () => void;
      isAdmin: () => boolean;
      requestAdminOperation: (operation: any, params: any) => Promise<any>;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
    /** 일렉트론 환경 변수 */
    electronEnv: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
      supabaseServiceRoleKey?: string;
    };
  }
}

export {};
