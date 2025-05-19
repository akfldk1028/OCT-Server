import { store } from './create';
import { AppState } from '@/common/types/overlay-types';

// 스토어 타입 정의
export type Subscribe = (
  listener: (state: AppState, prevState: AppState) => void,
) => () => void;
export type Handlers = Record<string, () => void>;

export type Store = {
  getState: () => AppState;
  getInitialState: () => AppState;
  setState: (stateSetter: (state: AppState) => AppState) => void;
  subscribe: Subscribe;
};
