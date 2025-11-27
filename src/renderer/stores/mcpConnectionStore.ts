// ===== 실시간 MCP 연결 상태 관리 스토어 =====
// renderer/stores/mcpConnectionStore.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface MCPServerConnection {
  serverId: string;
  serverName: string;
  clientType: 'claude-desktop' | 'openai-api' | 'vscode-extension' | 'cursor-extension';
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'retrying';
  lastConnected?: Date;
  lastError?: string;
  connectionId?: string;
  capabilities?: string[];
  retryCount: number;
  maxRetries: number;
}

export interface WorkflowProgress {
  executionId: string;
  workflowName?: string;
  totalServers: number;
  connectedServers: number;
  runningServers: number;
  completedServers: number;
  failedServers: number;
  currentLevel: number;
  totalLevels: number;
  startTime: Date;
  estimatedEndTime?: Date;
  status: 'idle' | 'starting' | 'running' | 'completed' | 'failed' | 'paused';
}

export interface MCPConnectionStats {
  totalConnections: number;
  activeConnections: number;
  clientStats: Record<string, { connected: number; total: number }>;
  averageConnectionTime: number;
  successRate: number;
  lastUpdateTime: Date;
}

interface MCPConnectionStore {
  // State
  connections: Record<string, MCPServerConnection>;
  workflowProgress: Record<string, WorkflowProgress>;
  globalStats: MCPConnectionStats;
  isAutoRetryEnabled: boolean;

  // Actions - MCP 연결 관리
  addConnection: (connection: MCPServerConnection) => void;
  updateConnectionStatus: (serverId: string, status: MCPServerConnection['status'], error?: string) => void;
  removeConnection: (serverId: string) => void;

  // Actions - 워크플로우 진행 상황
  startWorkflowProgress: (executionId: string, progress: Omit<WorkflowProgress, 'executionId'>) => void;
  updateWorkflowProgress: (executionId: string, updates: Partial<WorkflowProgress>) => void;
  completeWorkflowProgress: (executionId: string, success: boolean) => void;

  // Actions - 자동 재시도
  enableAutoRetry: (serverId: string) => void;
  disableAutoRetry: (serverId: string) => void;
  retryConnection: (serverId: string) => Promise<boolean>;

  // Actions - 통계 업데이트
  updateGlobalStats: () => void;

  // Getters
  getConnectionsByClient: (clientType: string) => MCPServerConnection[];
  getConnectedServers: () => MCPServerConnection[];
  getFailedConnections: () => MCPServerConnection[];
  getWorkflowProgress: (executionId: string) => WorkflowProgress | undefined;
  getActiveWorkflows: () => WorkflowProgress[];

  // Actions - 배치 작업
  connectMultipleServers: (serverIds: string[]) => Promise<void>;
  disconnectAllServers: () => Promise<void>;

  // Actions - 설정
  setAutoRetry: (enabled: boolean) => void;
}

export const useMCPConnectionStore = create<MCPConnectionStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        connections: {},
        workflowProgress: {},
        globalStats: {
          totalConnections: 0,
          activeConnections: 0,
          clientStats: {},
          averageConnectionTime: 0,
          successRate: 100,
          lastUpdateTime: new Date()
        },
        isAutoRetryEnabled: true,

        // MCP 연결 관리
        addConnection: (connection) => {
          set((state) => ({
            connections: {
              ...state.connections,
              [connection.serverId]: {
                ...connection,
                retryCount: 0,
                maxRetries: 3
              }
            }
          }));
          get().updateGlobalStats();
        },

        updateConnectionStatus: (serverId, status, error) => {
          set((state) => {
            const existing = state.connections[serverId];
            if (!existing) return state;

            const updated = {
              ...existing,
              status,
              ...(error && { lastError: error }),
              ...(status === 'connected' && { lastConnected: new Date(), lastError: undefined }),
              ...(status === 'retrying' && { retryCount: existing.retryCount + 1 })
            };

            return {
              connections: {
                ...state.connections,
                [serverId]: updated
              }
            };
          });
          get().updateGlobalStats();
        },

        removeConnection: (serverId) => {
          set((state) => {
            const { [serverId]: removed, ...rest } = state.connections;
            return { connections: rest };
          });
          get().updateGlobalStats();
        },

        // 워크플로우 진행 상황
        startWorkflowProgress: (executionId, progress) => {
          set((state) => ({
            workflowProgress: {
              ...state.workflowProgress,
              [executionId]: {
                ...progress,
                executionId,
                status: 'starting',
                startTime: new Date()
              }
            }
          }));
        },

        updateWorkflowProgress: (executionId, updates) => {
          set((state) => {
            const existing = state.workflowProgress[executionId];
            if (!existing) return state;

            return {
              workflowProgress: {
                ...state.workflowProgress,
                [executionId]: {
                  ...existing,
                  ...updates
                }
              }
            };
          });
        },

        completeWorkflowProgress: (executionId, success) => {
          set((state) => {
            const existing = state.workflowProgress[executionId];
            if (!existing) return state;

            return {
              workflowProgress: {
                ...state.workflowProgress,
                [executionId]: {
                  ...existing,
                  status: success ? 'completed' : 'failed',
                  estimatedEndTime: new Date()
                }
              }
            };
          });
        },

        // 자동 재시도
        enableAutoRetry: (serverId) => {
          const connection = get().connections[serverId];
          if (connection && connection.status === 'error' && connection.retryCount < connection.maxRetries) {
            get().retryConnection(serverId);
          }
        },

        disableAutoRetry: (serverId) => {
          // 특정 서버의 자동 재시도 비활성화 로직
          console.log(`Auto-retry disabled for server: ${serverId}`);
        },

        retryConnection: async (serverId) => {
          const connection = get().connections[serverId];
          if (!connection || connection.retryCount >= connection.maxRetries) {
            return false;
          }

          get().updateConnectionStatus(serverId, 'retrying');

          try {
            // 여기서 실제 재연결 로직 호출
            // 예: window.api.mcp.reconnectServer(serverId)

            // 임시로 2초 후 성공으로 가정
            setTimeout(() => {
              get().updateConnectionStatus(serverId, 'connected');
            }, 2000);

            return true;
          } catch (error) {
            get().updateConnectionStatus(serverId, 'error', error instanceof Error ? error.message : 'Retry failed');
            return false;
          }
        },

        // 통계 업데이트
        updateGlobalStats: () => {
          const connections = Object.values(get().connections);
          const activeConnections = connections.filter(c => c.status === 'connected').length;
          const totalConnections = connections.length;

          // 클라이언트별 통계
          const clientStats: Record<string, { connected: number; total: number }> = {};
          connections.forEach(conn => {
            if (!clientStats[conn.clientType]) {
              clientStats[conn.clientType] = { connected: 0, total: 0 };
            }
            clientStats[conn.clientType].total++;
            if (conn.status === 'connected') {
              clientStats[conn.clientType].connected++;
            }
          });

          // 성공률 계산
          const successRate = totalConnections > 0 ? (activeConnections / totalConnections) * 100 : 100;

          set((state) => ({
            globalStats: {
              ...state.globalStats,
              totalConnections,
              activeConnections,
              clientStats,
              successRate,
              lastUpdateTime: new Date()
            }
          }));
        },

        // Getters
        getConnectionsByClient: (clientType) => {
          return Object.values(get().connections).filter(c => c.clientType === clientType);
        },

        getConnectedServers: () => {
          return Object.values(get().connections).filter(c => c.status === 'connected');
        },

        getFailedConnections: () => {
          return Object.values(get().connections).filter(c => c.status === 'error');
        },

        getWorkflowProgress: (executionId) => {
          return get().workflowProgress[executionId];
        },

        getActiveWorkflows: () => {
          return Object.values(get().workflowProgress).filter(w => w.status === 'running');
        },

        // 배치 작업
        connectMultipleServers: async (serverIds) => {
          for (const serverId of serverIds) {
            get().updateConnectionStatus(serverId, 'connecting');
          }

          // 실제 연결 로직은 워크플로우 엔진에서 처리
          console.log(`Batch connecting ${serverIds.length} servers`);
        },

        disconnectAllServers: async () => {
          const connections = Object.values(get().connections);
          for (const conn of connections) {
            get().updateConnectionStatus(conn.serverId, 'disconnected');
          }
          console.log(`Disconnected ${connections.length} servers`);
        },

        // 설정
        setAutoRetry: (enabled) => {
          set({ isAutoRetryEnabled: enabled });
        }

      }),
      {
        name: 'mcp-connection-store',
        partialize: (state) => ({
          // 연결 정보와 설정만 영속화, 진행 상황은 세션 한정
          connections: state.connections,
          isAutoRetryEnabled: state.isAutoRetryEnabled
        })
      }
    ),
    { name: 'MCP Connection Store' }
  )
);



