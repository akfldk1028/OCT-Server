import { AppState as OverlayState } from './overlay-types';
import { AppState as AnthropicState } from './action-types';

export type RootState = OverlayState & AnthropicState
