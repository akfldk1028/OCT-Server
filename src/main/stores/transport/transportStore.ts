// main/stores/transport/transportStore.ts
import { createStore } from 'zustand/vanilla';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  TransportState,
  TransportSession,
} from './transport-types';

// Transport 인스턴스들을 별도로 관리 (직렬화되지 않음)
const activeTransports = new Map<string, Transport>();

function findActualExecutable(command: string, args: string[] = []) {
  if (process.platform === 'win32') {
    if (!command.endsWith('.cmd') && !command.endsWith('.exe')) {
      if (command === 'npx' || command === 'npm' || command === 'yarn') {
        command = `${command}.cmd`;
      } else {
        command = `${command}.exe`;
      }
    }
  }
  return { cmd: command, args };
}

export const transportStore = createStore<TransportState>((set, get) => ({
  sessions: {}, // activeTransports 제거

  createTransport: async (payload) => {
    const { serverId, config } = payload;
    const sessionId = `${serverId}-${uuidv4()}`;

    try {
      let transport: Transport;

      switch (config.transportType) {
        case 'stdio': {
          if (!config.command)
            throw new Error('Command required for stdio transport');

          const origArgs = config.args || [];
          const { cmd, args } = findActualExecutable(config.command, origArgs);

          const baseEnv: Record<string, string> = {};
          if (config.env) {
            for (const key in config.env) {
              if (typeof config.env[key] === 'string') {
                baseEnv[key] = config.env[key];
              }
            }
          }

          const processEnvFiltered: Record<string, string> = {};
          for (const key in process.env) {
            if (process.env[key] !== undefined) {
              processEnvFiltered[key] = process.env[key] as string;
            }
          }
          
          transport = new StdioClientTransport({
            command: cmd,
            args,
            env: { ...processEnvFiltered, ...baseEnv },
            stderr: 'pipe',
          });

          // Transport를 시작하지만 Client.connect()에서 다시 start()를 호출하지 않도록 주의
          // await transport.start(); // 이 부분을 제거!
          break;
        }

        case 'sse': {
          if (!config.url) throw new Error('URL required for SSE transport');

          transport = new SSEClientTransport(new URL(config.url), {
            eventSourceInit: {
              fetch: (url, init) =>
                fetch(url, { ...init, headers: config.headers }),
            },
            requestInit: {
              headers: config.headers,
            },
          });

          // await transport.start(); // 제거!
          break;
        }

        case 'streamable-http': {
          if (!config.url)
            throw new Error('URL required for streamable-http transport');

          transport = new StreamableHTTPClientTransport(new URL(config.url), {
            requestInit: {
              headers: config.headers,
            },
          });

          // await transport.start(); // 제거!
          break;
        }

        default:
          throw new Error(`Unknown transport type: ${config.transportType}`);
              }

      // Transport 인스턴스를 별도 Map에 저장
      activeTransports.set(sessionId, transport);
      // Transport 객체를 activeTransports에 저장 (직렬화되지 않는 별도 저장소)
      // set((state) => ({
      //   activeTransports: {
      //     ...state.activeTransports,
      //     [sessionId]: transport,
      //   },
      // }));

      // 세션 정보만 sessions에 저장 (직렬화 가능한 데이터만)
      // 세션 정보는 transport 없이 저장
      const session: TransportSession = {
        id: sessionId,
        serverId,
        transport: null as any, // ❌ 직렬화 불가, null로 저장
        transportType: config.transportType,
        status: 'connected',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };
              set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: session,
          },
        }));
      // // Transport 인스턴스는 activeTransports에만 저장
      // set((state) => ({
      //   activeTransports: {
      //     ...state.activeTransports,
      //     [sessionId]: transport, // ✅ 여기에만 저장
      //   },
      //   sessions: {
      //     ...state.sessions,
      //     [sessionId]: session, // ✅ 직렬화 가능한 정보만
      //   },
      // }));

      console.log(`✅ Transport created: ${sessionId} for server ${serverId}`);
      return sessionId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to create transport for ${serverId}:`, error);

      const session: TransportSession = {
        id: sessionId,
        serverId,
        transport: null as any,
        transportType: config.transportType,
        status: 'error',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        error: errorMessage,
      };


    // 각 store의 set 호출 전에 디버깅 추가
    set((state) => {
      console.log('🔍 Setting state for store:', 'clientStore'); // store 이름 명시
      console.log('📦 State keys:', Object.keys(state));
      
      // 직렬화 불가능한 객체 찾기
      Object.entries(state).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
          if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
            console.error(`❌ Non-serializable object found in ${key}:`, value.constructor.name);
          }
        }
      });
      
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: session,
        },
      };
    });

      // set((state) => ({
      //   sessions: {
      //     ...state.sessions,
      //     [sessionId]: session,
      //   },
      // }));

      throw error;
    }
  },

  closeTransport: async (payload) => {
    const { sessionId } = payload;
    const transport = activeTransports.get(sessionId);
    if (!transport) return;

    try {
      await transport.close();
      console.log(`✅ Transport closed: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Error closing transport ${sessionId}:`, error);
    }

    // Map에서 제거
    activeTransports.delete(sessionId);

    set((state) => {
      const session = state.sessions[sessionId];
      const updatedSession = session
        ? { ...session, status: 'disconnected' as const }
        : session;

      return {
        sessions: updatedSession
          ? { ...state.sessions, [sessionId]: updatedSession }
          : state.sessions,
      };
    });
  },

  closeAllTransports: async (payload) => {
    const { serverId } = payload || {};
    const sessions = Object.values(get().sessions);
    const targetSessions = serverId
      ? sessions.filter((s) => s.serverId === serverId)
      : sessions;

    console.log(
      `🛑 Closing ${targetSessions.length} transports${serverId ? ` for ${serverId}` : ''}`,
    );

    await Promise.all(
      targetSessions.map((session) => get().closeTransport({ sessionId: session.id })),
    );
  },

  getTransport: (payload) => {
    const { sessionId } = payload;
    return activeTransports.get(sessionId);
  },

  getServerTransports: (payload) => {
    const { serverId } = payload;
    return Object.values(get().sessions).filter(
      (session) => session.serverId === serverId,
    );
  },

  updateSessionStatus: (payload) => {
    const { sessionId, status, error } = payload;
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            status,
            lastActivity: new Date().toISOString(),
            ...(error !== undefined && { error }),
          },
        },
      };
    });
  },

  updateLastActivity: (payload) => {
    const { sessionId } = payload;
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            lastActivity: new Date().toISOString(),
          },
        },
      };
    });
  },

  checkTransportHealth: async (payload) => {
    const { sessionId } = payload;
    const transport = activeTransports.get(sessionId);
    if (!transport) return false;

    try {
      // Transport에 따라 다른 헬스체크 로직
      return true;
    } catch {
      return false;
    }
  },

  cleanupStaleTransports: async () => {
    const now = new Date();
    const staleThreshold = 30 * 60 * 1000; // 30분

    const staleSessions = Object.values(get().sessions).filter(
      (session) => {
        const lastActivity = new Date(session.lastActivity);
        const age = now.getTime() - lastActivity.getTime();
        return age > staleThreshold && session.status === 'disconnected';
      },
    );

    console.log(`🧹 Cleaning up ${staleSessions.length} stale transports`);

    await Promise.all(
      staleSessions.map((session) => get().closeTransport({ sessionId: session.id })),
    );

    set((state) => {
      const sessions = { ...state.sessions };
      staleSessions.forEach((session) => {
        delete sessions[session.id];
      });
      return { sessions };
    });
  },
}));