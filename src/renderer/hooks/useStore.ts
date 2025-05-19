// import { createUseStore } from '@zubridge/electron';
// import type { AppState } from '../../common/types/action-types';

// // 전역 window.zubridge.handlers에 연결된 훅 생성
// export const useStore = createUseStore<AppState>();
// export const useDispatch = () => window.zubridge.useDispatch<AppState>();



import { createUseStore } from '@zubridge/electron';
import type { RootState } from '../../common/types/root-types';


export const useStore = createUseStore<RootState>();

// Antropic store (action slice)는 window.anthropicZutron 브릿지를 사용합니다.
// export const useActionStore = createUseStore<ActionAppState>(
  // TS가 window에 없는 속성이라 에러나면 any 캐스트
  // (window as any).anthropicZutron,
// );

// // Overlay store는 window.overlayZutron 브릿지를 사용합니다.
// export const useOverlayStore = createUseStore<OverlayAppState>(
//   (window as any).overlayZutron,
// );
