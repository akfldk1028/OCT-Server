import type { TransportState } from '@/main/stores/transport/transport-types';
import type { RoomState } from '@/main/stores/room/room-types';
import type { SessionState } from '@/main/stores/session/session-types';
import type { ClientState } from '@/main/stores/client/client-types';
import type { ProxyState } from '@/main/stores/proxy/proxy-types';
import type { OpenRouterState } from '@/main/stores/openrouter/openrouter-type';
import type { MCPRegistryState } from '@/main/stores/mcp/mcpRegistry-type';
import type { OverlayState } from '@/main/stores/overlay/overlay-types';
import type { ChatState } from '@/main/stores/chat/chat-types';
import { MCPProxyState } from '@/main/stores/renderProxy/rendererMCPProxy-type';
import type { MCPCoordinatorState } from '@/main/stores/integration/ai-mcp-coordinator';
import { InstallerState } from '@/main/stores/install/installer-types';
import { AgentState } from '@/main/stores/orchestrator/agent-types';
import { WorkflowState } from '@/renderer/features/server/types/server-types';
import { WindowState } from '@/main/stores/window/windowStore';

export interface CombinedState {
  // root: AppState;
  transport: TransportState;
  room: RoomState;
  session: SessionState;
  client: ClientState;
  proxy: ProxyState;
  open_router: OpenRouterState;
  mcp_registry: MCPRegistryState;
  chat: ChatState;
  mcp_coordinator: MCPCoordinatorState;
  installer: Omit<InstallerState, 'dispatch'>; // dispatch 제외
  // agentOrchestrator: AgentState;
  workflow: WorkflowState; // 추가
  overlay: OverlayState;
  window: WindowState;
  [key: string]: any; // 이 한 줄 추가!
}
