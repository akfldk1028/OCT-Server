// ShortcutsHelper.ts
// import Mousetrap from 'mousetrap';

// 단축키 타입 정의
export type ShortcutAction =
  | 'setGuideWindow'
  | 'resetWindow'
  | 'customGuide'
  | 'showGuide'
  | 'toggleMainWindow'
  | 'takeScreenshot';

// 단축키 정의
export interface Shortcut {
  keys: string[]; // 다양한 플랫폼을 위한 여러 키 조합 (예: ['ctrl+g', 'command+g'])
  action: ShortcutAction;
  description: string; // 사용자를 위한 설명
}

// 단축키 목록
export const SHORTCUTS: Shortcut[] = [
  {
    keys: ['ctrl+shift+g', 'command+shift+g'],
    action: 'setGuideWindow',
    description: '가이드 창 표시',
  },
  {
    keys: ['ctrl+shift+r', 'command+shift+r'],
    action: 'resetWindow',
    description: '창 초기화',
  },
  {
    keys: ['ctrl+alt+g', 'command+alt+g'],
    action: 'customGuide',
    description: '커스텀 가이드 요청',
  },
  {
    keys: ['ctrl+g', 'command+g'],
    action: 'showGuide',
    description: '기본 사용법 가이드 표시',
  },
  // 더 많은 단축키 추가...
];

// 단축키 액션 핸들러 타입
export type ShortcutHandler = (e?: ExtendedKeyboardEvent) => void;

// 단축키 액션 핸들러 맵
export interface ShortcutHandlerMap {
  [key: string]: ShortcutHandler;
}

// Mousetrap의 KeyboardEvent 확장 타입
export interface ExtendedKeyboardEvent extends KeyboardEvent {
  preventDefault: () => void;
}

// 단축키 매니저 클래스
export class ShortcutManager {
  private handlers: ShortcutHandlerMap = {};

  private initialized = false;

  // 단축키 핸들러 등록
  registerHandler(action: ShortcutAction, handler: ShortcutHandler): void {
    this.handlers[action] = handler;
  }

  // 여러 핸들러 한번에 등록
  registerHandlers(handlers: ShortcutHandlerMap): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // 단축키 초기화 및 바인딩
  initialize(): void {
    if (this.initialized) return;

    // SHORTCUTS.forEach((shortcut) => {
    //   if (this.handlers[shortcut.action]) {
    //     Mousetrap.bind(shortcut.keys, (e) => {
    //       if (e) e.preventDefault();
    //       this.handlers[shortcut.action](e as ExtendedKeyboardEvent);
    //       return false; // 기본 브라우저 동작 방지
    //     });
    //   }
    // });

    this.initialized = true;
  }

  // 단축키 핸들러 제거
  unregisterHandler(action: ShortcutAction): void {
    delete this.handlers[action];
  }

  // 단축키 핸들러 모두 제거 및 바인딩 해제
  cleanup(): void {
    // SHORTCUTS.forEach((shortcut) => {
    //   Mousetrap.unbind(shortcut.keys);
    // });
    // this.handlers = {};
    // this.initialized = false;
  }

  // 단축키 비활성화 (임시로)
  disable(): void {
  }

  // 단축키 재활성화
  enable(): void {
    if (this.initialized) {
      this.cleanup();
      this.initialize();
    }
  }

  // 단축키 목록 가져오기 (UI에 표시용)
  getShortcutList(): { keys: string; description: string }[] {
    return SHORTCUTS.map((shortcut) => ({
      keys: shortcut.keys.join(' 또는 '),
      description: shortcut.description,
    }));
  }
}

// 싱글톤 인스턴스
export const shortcutManager = new ShortcutManager();
