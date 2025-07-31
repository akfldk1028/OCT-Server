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
import { installerStore } from './install/installerStore';
import { agentOrchestratorStore } from './orchestrator/agentOrchestratorStore';
import { workflowStore } from './workflow/workflowStore';
import { overlayStore } from './overlay/overlayStore';
import { windowStore } from './window/windowStore';
import { updateStore } from './update/updateStore';


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
  installer: installerStore.getState(),
  workflow: workflowStore.getState(),
  overlay: overlayStore.getState(),
  window: windowStore.getState(),
  update: updateStore.getState(),
  // agentOrchestrator: agentOrchestratorStore.getState(),
}));

// 각 store 구독해서 combined store 업데이트
// rootStore.subscribe((state) => {
//   combinedStore.setState((prev) => ({ ...prev, root: state }));
// });

overlayStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, overlay: state }));
});

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

installerStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, installer: state }));
});
workflowStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, workflow: state }));
});
windowStore.subscribe((state) => {
  combinedStore.setState((prev) => ({ ...prev, window: state }));
});
// agentOrchestratorStore.subscribe((state) => {
//   combinedStore.setState((prev) => ({ ...prev, agentOrchestrator: state }));
// });
