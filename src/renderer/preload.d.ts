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
  }
}

export {};
