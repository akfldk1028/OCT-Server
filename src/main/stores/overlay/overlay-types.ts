// src/common/types/overlay-types.ts
import { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { BrowserWindow } from 'electron';

export interface OverlayState {
  // 기본 앱 상태
  instructions: string;            // 첫 번째 모듈 속성 추가
  fullyAuto: boolean;             // 첫 번째 모듈 속성 추가
  running: boolean;               // 첫 번째 모듈 속성 추가
  runHistory: BetaMessageParam[]; // 공통으로 사용할 대화 히스토리
  
  isRunning: boolean;
  isGuideMode: boolean;
  error: string | null;

  // 스크린샷 관련 상태 및 액션
  screenshotQueue: string[];
  extraScreenshotQueue: string[];
  activeView: 'queue' | 'solutions' | 'debug';
  SET_VIEW: (view: 'queue' | 'solutions' | 'debug') => void;
  TAKE_SCREENSHOT: (
    hideWindow: () => void,
    showWindow: () => void,
  ) => Promise<string>;
  GET_IMAGE_PREVIEW: (filepath: string) => Promise<string>;
  DELETE_SCREENSHOT: (
    filepath: string,
  ) => Promise<{ success: boolean; error?: string }>;
  CLEAR_QUEUES: () => void;

  // AI 관련 상태 및 액션
  apiKey: string | null;
  apiKeySource: string;
  SET_API_KEY: (key: string, source?: string) => void;
  IS_API_KEY_SET: () => boolean;
  INIT_API_KEY: () => void;
  GET_API_KEY_STATUS: () => { isSet: boolean; source: string };
  GENERATE_GUIDE: (
    software: string,
    question: string,
    screenshotData?: string,
  ) => Promise<any>;
//   PROCESS_GUIDE: (payload) => processGuide(set, get, payload),
  // 첫 번째 모듈 액션들
//   RUN_AGENT: () => Promise<void>;
  STOP_RUN: () => void;
  SET_INSTRUCTIONS: (instructions: string) => void;
  SET_FULLY_AUTO: (fullyAuto?: boolean) => void;
  CLEAR_HISTORY: () => void;

  PROCESS_GUIDE: (payload: { software: string, question: string }) => Promise<any>;
  SET_INSTRUCTIONS_OVERLAY: (payload: { software: string, question: string }) => void;
  // 오버레이 관련 상태 및 액션
  guideSteps: GuideStep[];
  overlayWindows: Map<string, any>;
  activeSoftware: string;
  SHOW_GUIDE: (guideData: any) => Promise<{ success: boolean; error?: string }>;
  CLEAR_GUIDE_OVERLAYS: () => Promise<void>;
  DETECT_ACTIVE_SOFTWARE: () => Promise<{
    processName: string;
    windowTitle: string;
    id: number;
    software: string;
  }>;

  // 단축키 관련 액션
  SET_MAIN_WINDOW: (window: BrowserWindow | null) => void;
  REGISTER_SHORTCUTS: () => void;
  MOVE_WINDOW_LEFT: () => void;
  MOVE_WINDOW_RIGHT: () => void;
  MOVE_WINDOW_UP: () => void;
  MOVE_WINDOW_DOWN: () => void;
  TOGGLE_MAIN_WINDOW: () => void;

  // 업데이터 관련 상태 및 액션
  updateAvailable: boolean;
  updateDownloaded: boolean;
  updateInfo: any;
  updateError: string | null;
  INIT_AUTO_UPDATER: () => void;
  CHECK_FOR_UPDATES: () => void;
  START_UPDATE: () => Promise<{ success: boolean; error?: string }>;
  INSTALL_UPDATE: () => void;
  RUN_AGENT_OVERLAY: () => Promise<any>;
  // IPC 핸들러 관련 액션
  INIT_IPC_HANDLERS: () => void;

  // 기본 액션
  START_APP: () => void;
  STOP_APP: () => void;
  TOGGLE_GUIDE_MODE: (enabled?: boolean) => void;
  [key: string]: any;

}



// 가이드 단계 타입
export interface GuideStep {
  id: string;
  stepNumber?: string;
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  shortcut?: string;
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
}