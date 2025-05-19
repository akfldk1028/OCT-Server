// // src/main/store/create.ts
// import { createStore } from 'zustand/vanilla';
// import { BrowserWindow, ipcMain } from 'electron';
// import { GuideStep } from '../../../common/types/overlay-types';
// import { AppState } from '../../../common/types/overlay-types';
// import { addScreenshotActions } from './screenshotActions';
// import { addOverlayActions } from './overlayActions';
// import { addShortcutActions } from './shortcutActions';
// import { addUpdaterActions } from './updaterActions';
// import { addIpcActions } from './ipcActions';
// import { addApiKeyActions } from '../apiKeyActions';
// import { runAgent } from './aiActions';

// // 스토어 생성
// export const store = createStore<AppState>((set, get) => {
//   // 기본 상태 객체 정의
//   const baseState = {
//     instructions: 'find flights from seattle to sf for next tuesday to thursday',
//     fullyAuto: true,
//     running: false,
//     runHistory: [],
//     isRunning: false,
//     isGuideMode: true,
//     error: null as string | null,
//     screenshotQueue: [] as string[],
//     extraScreenshotQueue: [] as string[],
//     activeView: 'queue' as 'queue' | 'solutions' | 'debug',
//     guideSteps: [] as GuideStep[],
//     overlayWindows: new Map<string, any>(),
//     activeSoftware: 'unknown',
//     updateAvailable: false,
//     updateDownloaded: false,
//     updateInfo: null as any,
//     updateError: null as string | null,

//     TEST_ACTION: (payload: any) => {
//       console.log('🤖👍 [메인 Overlay Store] TEST_ACTION 시작!', payload);
//       try {
//         const payloadString = JSON.stringify(payload, null, 2); // 보기 좋게 출력
//         set({ error: `OVERLAY TEST_ACTION CALLED: ${payloadString}` });
//         console.log('🤖👍 [메인 Overlay Store] TEST_ACTION 성공! 에러 상태 업데이트됨.');
//       } catch (e: any) {
//         console.error('🤖💥 [메인 Overlay Store] TEST_ACTION 중 오류 발생:', e);
//         set({ error: `OVERLAY TEST_ACTION FAILED TO STRINGIFY PAYLOAD: ${e.message}` });
//       }
//     },

//    SET_ERROR: (error: string | null) => set({ error }),
//    START: () => set({ running: true, error: null }),
//    STOP: () => set({ running: false }),
//    RUN_AGENT: async () => {
//     console.log('🤖 [메인 Overlay Store] RUN_AGENT 호출됨 (스토어 내부)');
//     return runAgent(set, get);
//    },
//    SET_INSTRUCTIONS: (instructions: string) => set({ instructions }),
//    SET_FULLY_AUTO: (fullyAuto: boolean) => {
//      set({ fullyAuto: fullyAuto ?? true });
//    },
//    CLEAR_HISTORY: () => set({ runHistory: [] }),

//     TOGGLE_GUIDE_MODE: (enabled?: boolean) => {
//       const newEnabled = enabled !== undefined ? enabled : !get().isGuideMode;
//       set({
//         isGuideMode: newEnabled,
//         fullyAuto: !newEnabled
//       });
//       if (!newEnabled) {
//         get().CLEAR_GUIDE_OVERLAYS();
//       }
//     },

//     PROCESS_GUIDE: async (payload: { software: string, question: string }) => {
//       let { software, question } = payload;
//       console.log('🤖 [메인 Overlay Store] PROCESS_GUIDE 호출됨!', { software, question, pid: process.pid, time: new Date().toISOString() });
//       try {
//         set({
//           instructions: question,
//           fullyAuto: !get().isGuideMode
//         });
//         if (get().fullyAuto) {
//             console.log('🤖 [메인 Overlay Store] 자동 모드에서 RUN_AGENT 호출 시도');
//             const runAgentResult = await get().RUN_AGENT();
//             console.log('🤖 [메인 Overlay Store] RUN_AGENT 결과:', runAgentResult);
//             return { success: true, result: runAgentResult };
//         } else {
//           if (!get().isGuideMode) {
//             return { success: false, error: 'Guide mode is disabled' };
//           }
//           if (!software || software === 'unknown') {
//             const activeWindow = await get().DETECT_ACTIVE_SOFTWARE();
//             software = activeWindow.software;
//           }
//           const mainWindow = BrowserWindow.getFocusedWindow();
//           if (!mainWindow)
//             return { success: false, error: 'No main window available' };
//           const hideWindow = () => mainWindow.hide();
//           const showWindow = () => mainWindow.show();
//           const screenshotPath = await get().TAKE_SCREENSHOT(
//             hideWindow,
//             showWindow,
//           );
//           const screenshotData = await get().GET_IMAGE_PREVIEW(screenshotPath);
//           await get().SHOW_GUIDE({
//             software,
//             question,
//             steps: [],
//           });
//           return { success: true };
//         }
//       } catch (error: any) {
//         console.error('Error processing guide in Overlay Store:', error);
//         set({ error: `가이드 처리 오류 (Overlay): ${error.message}` });
//         return { success: false, error: error.message };
//       }
//     },
//   };

//   return {
//     ...baseState,
//     ...addScreenshotActions(set, get),
//     ...addApiKeyActions(set, get),
//     ...addOverlayActions(set, get),
//     ...addShortcutActions(set, get),
//     ...addUpdaterActions(set, get),
//     ...addIpcActions(set, get),
//   } as unknown as AppState;
// });


// src/main/store/create.ts
// src/main/store/create.ts
import { createStore } from 'zustand/vanilla'
import type { AppState as OverlayState, GuideStep } from '../../../common/types/overlay-types'
import type { AppState as AnthropicState }          from '../../../common/types/action-types'
import { BrowserWindow } from 'electron'

import { addScreenshotActions } from './screenshotActions'
import { addOverlayActions }    from './overlayActions'
import { addShortcutActions }   from './shortcutActions'
import { addUpdaterActions }    from './updaterActions'
import { addIpcActions }        from './ipcActions'
import { addApiKeyActions }     from '../apiKeyActions'
import { runAgent as overlayRunAgent, processGuide }    from './aiActions'
import { runAgent as anthropicRunAgent }  from '../antropic/runAgent'
import { RootState } from '@/common/types/root-types'
// OverlayState와 AnthropicState를 합친 타입

// 상태 생성
export const store = createStore<RootState>((set, get) => ({
  // === Overlay & Anthropic 공통 초기 상태 ===
  instructions:       '',
  fullyAuto:          false,
  running:            false,
  error:              null,
  runHistory:         [] as any[],

  // === Overlay 전용 초기 상태 ===
  isRunning:          false,
  isGuideMode:        true,
  screenshotQueue:    [] as string[],
  extraScreenshotQueue: [] as string[],
  activeView:         'queue' as 'queue' | 'solutions' | 'debug',
  guideSteps:         [] as GuideStep[],
  overlayWindows:     new Map<string, any>(),
  activeSoftware:     'unknown',
  updateAvailable:    false,
  updateDownloaded:   false,
  updateInfo:         null,
  updateError:        null,

  // === Anthropic 전용 초기 상태 ===
  apiKey:             null,
  apiKeySource:       '',

  // === Overlay Actions ===
  ...addScreenshotActions(set, get),
  ...addApiKeyActions(set, get),
  ...addOverlayActions(set, get),
  ...addShortcutActions(set, get),
  ...addUpdaterActions(set, get),
  ...addIpcActions(set, get),

  RUN_AGENT_OVERLAY: async () => overlayRunAgent(set, get),
  RUN_AGENT_AUTO: async () => anthropicRunAgent(set, get),

  // === Anthropic Actions ===
  SET_INSTRUCTIONS: (instructions: string) => set({ instructions }),
  SET_INSTRUCTIONS_OVERLAY: (payload) => {
    const { software, question } = payload;
    // 두 값을 분리하여 각각 상태에 저장
    set({ 
      instructions: question,
      activeSoftware: software 
    });
  },


  SET_FULLY_AUTO: (fullyAuto) => {
    // renamed from SET_HUMAN_SUPERVISED
    set({ fullyAuto: fullyAuto ?? true }); // changed default to true
  },
  CLEAR_HISTORY:    () => set({ runHistory: [] }),
  PROCESS_GUIDE: (payload) => processGuide(set, get, payload),  // === 기타 Overlay 함수 필드 ===
  SET_VIEW:           (view) => set({ activeView: view }),
  TAKE_SCREENSHOT:    async (hide, show) => {/* 구현 */ return ''},
  GET_IMAGE_PREVIEW:  async (path) => {/* 구현 */ return ''},
  DELETE_SCREENSHOT:  async (path) => ({ success: true }),
  CLEAR_QUEUES:       () => set({ screenshotQueue: [], extraScreenshotQueue: [] }),

  GENERATE_GUIDE:     async (software, question, screenshotData) => ({}),
  STOP_RUN:           () => set({ running: false }),
  TOGGLE_GUIDE_MODE:  (enabled) => set(state => ({ isGuideMode: enabled ?? !state.isGuideMode })),
//   SHOW_GUIDE:         async (data) => ({ success: true }),
  CLEAR_GUIDE_OVERLAYS: async () => {},
  DETECT_ACTIVE_SOFTWARE: async () => ({ processName: '', windowTitle: '', id: 0, software: '' }),
  SET_MAIN_WINDOW:    (window: BrowserWindow | null) => {},
  REGISTER_SHORTCUTS: () => {},
  MOVE_WINDOW_LEFT:   () => {},
  MOVE_WINDOW_RIGHT:  () => {},
  MOVE_WINDOW_UP:     () => {},
  MOVE_WINDOW_DOWN:   () => {},
  TOGGLE_MAIN_WINDOW: () => {},
  INIT_AUTO_UPDATER:  () => {},
  CHECK_FOR_UPDATES:  () => {},
  START_UPDATE:       async () => ({ success: true }),
  INSTALL_UPDATE:     () => {},
  INIT_IPC_HANDLERS:  () => {},
  START_APP:          () => {},
  STOP_APP:           () => {},
}))
