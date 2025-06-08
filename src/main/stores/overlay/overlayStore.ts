
import { createStore } from 'zustand/vanilla';
import { BrowserWindow } from 'electron';
import type {
  OverlayState,
  GuideStep,
} from './overlay-types';
import type { AnthropicState } from './Anthropic-types';
import { addScreenshotActions } from '../../computer/overlay/screenshotActions';
import { addOverlayActions } from '../../computer/overlay/overlayActions';
import { addShortcutActions } from '../../computer/overlay/shortcutActions';
import { addUpdaterActions } from '../../computer/overlay/updaterActions';
import { addIpcActions } from '../../computer/overlay/ipcActions';
import { addApiKeyActions } from '../../computer/apiKeyActions';
import { runAgent as overlayRunAgent, processGuide } from '../../computer/overlay/aiActions';
import { runAgent as anthropicRunAgent } from '../../computer/antropic/runAgent';

type LocalAppState = OverlayState & AnthropicState;

// 상태 생성
export const overlayStore = createStore<LocalAppState>((set, get) => ({
  // === Overlay & Anthropic 공통 초기 상태 ===
  
  instructions: '',
  fullyAuto: false,
  running: false,
  error: null,
  runHistory: [] as any[],

  // === Overlay 전용 초기 상태 ===
  isRunning: false,
  isGuideMode: true,
  screenshotQueue: [] as string[],
  extraScreenshotQueue: [] as string[],
  activeView: 'queue' as 'queue' | 'solutions' | 'debug',
  guideSteps: [] as GuideStep[],
  overlayWindows: new Map<string, any>(),
  activeSoftware: 'unknown',
  updateAvailable: false,
  updateDownloaded: false,
  updateInfo: null,
  updateError: null,

  // === Anthropic 전용 초기 상태 ===
  apiKey: null,
  apiKeySource: '',

  // === Overlay Actions ===
  ...addScreenshotActions(set, get),
  ...addApiKeyActions(set, get),
  ...addOverlayActions(set, get),
  ...addShortcutActions(set, get),
  ...addUpdaterActions(set, get),
  ...addIpcActions(set, get),

  RUN_AGENT_OVERLAY: async () => overlayRunAgent(set as any, get as any),
  RUN_AGENT_AUTO: async () => anthropicRunAgent(set as any, get as any),

  // === Anthropic Actions ===
  SET_INSTRUCTIONS: (instructions: string) => set({ instructions }),
  SET_INSTRUCTIONS_OVERLAY: (payload) => {
    const { software, question } = payload;
    // 두 값을 분리하여 각각 상태에 저장
    set({
      instructions: question,
      activeSoftware: software,
    });
  },

  SET_FULLY_AUTO: (fullyAuto) => {
    // renamed from SET_HUMAN_SUPERVISED
    set({ fullyAuto: fullyAuto ?? true }); // changed default to true
  },
  CLEAR_HISTORY: () => set({ runHistory: [] }),
  PROCESS_GUIDE: (payload: any) => processGuide(set as any, get as any, payload), // === 기타 Overlay 함수 필드 ===
  // 기타 함수들은 addScreenshotActions에서 실제 구현 사용

  STOP_RUN: () => set({ running: false }),
  TOGGLE_GUIDE_MODE: (enabled) =>
    set((state) => ({ isGuideMode: enabled ?? !state.isGuideMode })),
  
  // 🔥 필수 인터페이스 준수를 위한 기본 구현들 (실제 구현은 Actions에서 override)
  GENERATE_GUIDE: async (software: string, question: string, screenshotData?: string) => ({}),
  START_APP: () => {},
  STOP_APP: () => {},
}));


