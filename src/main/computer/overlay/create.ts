// // src/main/store/create.ts
// // src/main/store/create.ts
// import { createStore } from 'zustand/vanilla';
// import { BrowserWindow } from 'electron';
// import type {
//   AppState as OverlayState,
//   GuideStep,
// } from '../../../common/types/overlay-types';
// import type { AppState as AnthropicState } from '../../../common/types/action-types';

// import { addScreenshotActions } from './screenshotActions';
// import { addOverlayActions } from './overlayActions';
// import { addShortcutActions } from './shortcutActions';
// import { addUpdaterActions } from './updaterActions';
// import { addIpcActions } from './ipcActions';
// import { addApiKeyActions } from '../apiKeyActions';
// import { runAgent as overlayRunAgent, processGuide } from './aiActions';
// import { runAgent as anthropicRunAgent } from '../antropic/runAgent';

// // OverlayState와 AnthropicState를 합친 타입
// type LocalAppState = OverlayState & AnthropicState;

// // 상태 생성
// export const store = createStore<LocalAppState>((set, get) => ({
//   // === Overlay & Anthropic 공통 초기 상태 ===
  
//   instructions: '',
//   fullyAuto: false,
//   running: false,
//   error: null,
//   runHistory: [] as any[],

//   // === Overlay 전용 초기 상태 ===
//   isRunning: false,
//   isGuideMode: true,
//   screenshotQueue: [] as string[],
//   extraScreenshotQueue: [] as string[],
//   activeView: 'queue' as 'queue' | 'solutions' | 'debug',
//   guideSteps: [] as GuideStep[],
//   overlayWindows: new Map<string, any>(),
//   activeSoftware: 'unknown',
//   updateAvailable: false,
//   updateDownloaded: false,
//   updateInfo: null,
//   updateError: null,

//   // === Anthropic 전용 초기 상태 ===
//   apiKey: null,
//   apiKeySource: '',

//   // === Overlay Actions ===
//   ...addScreenshotActions(set, get),
//   ...addApiKeyActions(set, get),
//   ...addOverlayActions(set, get),
//   ...addShortcutActions(set, get),
//   ...addUpdaterActions(set, get),
//   ...addIpcActions(set, get),

//   RUN_AGENT_OVERLAY: async () => overlayRunAgent(set as any, get as any),
//   RUN_AGENT_AUTO: async () => anthropicRunAgent(set as any, get as any),

//   // === Anthropic Actions ===
//   SET_INSTRUCTIONS: (instructions: string) => set({ instructions }),
//   SET_INSTRUCTIONS_OVERLAY: (payload) => {
//     const { software, question } = payload;
//     // 두 값을 분리하여 각각 상태에 저장
//     set({
//       instructions: question,
//       activeSoftware: software,
//     });
//   },

//   SET_FULLY_AUTO: (fullyAuto) => {
//     // renamed from SET_HUMAN_SUPERVISED
//     set({ fullyAuto: fullyAuto ?? true }); // changed default to true
//   },
//   CLEAR_HISTORY: () => set({ runHistory: [] }),
//   PROCESS_GUIDE: (payload: any) => processGuide(set as any, get as any, payload), // === 기타 Overlay 함수 필드 ===
//   SET_VIEW: (view) => set({ activeView: view }),
//   TAKE_SCREENSHOT: async (hide, show) => {
//     /* 구현 */ return '';
//   },
//   GET_IMAGE_PREVIEW: async (path) => {
//     /* 구현 */ return '';
//   },
//   DELETE_SCREENSHOT: async (path) => ({ success: true }),
//   CLEAR_QUEUES: () => set({ screenshotQueue: [], extraScreenshotQueue: [] }),

//   GENERATE_GUIDE: async (software, question, screenshotData) => ({}),
//   STOP_RUN: () => set({ running: false }),
//   TOGGLE_GUIDE_MODE: (enabled) =>
//     set((state) => ({ isGuideMode: enabled ?? !state.isGuideMode })),
//   //   SHOW_GUIDE:         async (data) => ({ success: true }),
//   CLEAR_GUIDE_OVERLAYS: async () => {},
//   DETECT_ACTIVE_SOFTWARE: async () => ({
//     processName: '',
//     windowTitle: '',
//     id: 0,
//     software: '',
//   }),
//   SET_MAIN_WINDOW: (window: BrowserWindow | null) => {},
//   REGISTER_SHORTCUTS: () => {},

//   TOGGLE_MAIN_WINDOW: () => {},
//   INIT_AUTO_UPDATER: () => {},
//   CHECK_FOR_UPDATES: () => {},
//   START_UPDATE: async () => ({ success: true }),
//   INSTALL_UPDATE: () => {},
//   INIT_IPC_HANDLERS: () => {},
//   START_APP: () => {},
//   STOP_APP: () => {},
// }));


