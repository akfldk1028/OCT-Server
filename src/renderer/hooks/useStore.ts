// import { createUseStore } from '@zubridge/electron';
// import type { AppState } from '../../common/types/action-types';

// // 전역 window.zubridge.handlers에 연결된 훅 생성
// export const useStore = createUseStore<AppState>();
// export const useDispatch = () => window.zubridge.useDispatch<AppState>();



// import { createUseStore } from '@zubridge/electron';
// import type { RootState } from '../../common/types/root-types';
//
//
// export const useStore = createUseStore<RootState>();


// src/renderer/hooks/useStore.ts
import type { CombinedState } from '../../common/types/root-types';
import { isElectron } from '../utils/environment';

let useStore: () => CombinedState;
let useDispatch: <T>() => any;

if (isElectron()) {
  const { createUseStore, useDispatch: _useDispatch } = require('@zubridge/electron');
  useStore = (createUseStore as () => () => CombinedState)();
  useDispatch = _useDispatch;

  
} else {
  // 웹 환경에선 더미 훅—절대 createUseStore 호출 안 함
  useStore = () => {
    console.warn('useStore called in web environment');
    return {} as CombinedState;
  };
  useDispatch = () => {
    console.warn('useDispatch called in web environment');
    return () => {};
  };
}
export function useDispatch_new<T>() {
  const stores = useStore();
  return (action: { type: string; payload?: any }): T => {
    const [slice, method] = action.type.split('.') as [keyof typeof stores, string];
    const storeSlice = stores[slice];
    if (!storeSlice || typeof (storeSlice as any)[method] !== 'function') {
      throw new Error(`Unknown action ${action.type}`);
    }
    // 🔑 반드시 결과를 return 해줘야 dispatchRoom/dispatchSession이 ID를 돌려받습니다.
    return (storeSlice as any)[method](action.payload) as T;
  };
}
export { useStore, useDispatch };


