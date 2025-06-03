// main/stores/combinedStore.ts
import { createStore } from 'zustand/vanilla';
import { CombinedState } from '@/common/types/root-types';
// import { store as rootStore } from '../computer/overlay/create';
import { transportStore } from './transport/transportStore';
import { roomStore } from './room/roomStore';
import { sessionStore } from './session/sessionStore';
import { clientStore } from './client/clientStore';
import { proxyStore } from './proxy/proxyStore';
import { openrouterStore } from './openrouter/openrouterStore';
import { mcpRegistryStore } from './mcp/mcpRegistryStore';
import { chatStore } from './chat/chatStore';
import { rendererMCPProxy } from './renderProxy/rendererMCPProxy';
import { mcpCoordinatorStore } from './integration/ai-mcp-coordinator';
export const combinedStore = createStore<CombinedState>((set, get) => ({
  // root: rootStore.getState(),
  transport: transportStore.getState(),
  room: roomStore.getState(),
  session: sessionStore.getState(),
  client: clientStore.getState(),
  proxy: proxyStore.getState(),
  open_router: openrouterStore.getState(),
  mcp_registry: mcpRegistryStore.getState(),
  chat: chatStore.getState(),
  mcp_coordinator: mcpCoordinatorStore.getState(),

}));

// 각 store 구독해서 combined store 업데이트
// rootStore.subscribe((state) => {
//   combinedStore.setState((prev) => ({ ...prev, root: state }));
// });

transportStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, transport: state }));
});

roomStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, room: state }));
});

sessionStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, session: state }));
});

clientStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, client: state }));
});

proxyStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, proxy: state }));
});

openrouterStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, open_router: state }));
});

mcpRegistryStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, mcp_registry: state }));
});

chatStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, chat: state }));
});

mcpCoordinatorStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, mcp_coordinator: state }));
});