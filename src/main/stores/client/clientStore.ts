// main/stores/client/clientStore.ts
import { createStore } from 'zustand/vanilla';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  ClientCapabilities,
  ServerCapabilities,
  InitializeResult,
  CallToolResult,
  ListResourcesResult,
  ListPromptsResult,
  ListToolsResult,
  ReadResourceResult,
  CompleteResult,
  Notification,
  Request,
  Result,
  CancelledNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  ProgressNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ClientState, MCPClient } from '@/main/stores/client/client-types';
import { v4 as uuidv4 } from 'uuid';

// Store 외부에 Client 인스턴스 관리
const clientInstances = new Map<string, Client>();

export const clientStore = createStore<ClientState>((set, get) => ({
  clients: {}, // Map → Record

  // Client 생성/삭제
  createClient: (payload) => {
    const { sessionId, name, capabilities } = payload;
    const id = 'Client-' + uuidv4();
    const client: MCPClient = {
      id,
      sessionId,
      name,
      status: 'disconnected',
      lastActivity: new Date().toISOString(),
      requestHistory: [],
      capabilities: capabilities || {
        sampling: {},
        roots: { listChanged: true },
        experimental: {},
      },
      notificationHandlers: {}, // Map → Record
    };

    // set((state) => ({
    //   clients: {
    //     ...state.clients,
    //     [id]: client,
    //   },
    // }));
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
        clients: {
          ...state.clients,
          [id]: client,
        },
      };
    });
    console.log(`👤 Client created: ${name} (${id})`);
    return id;
  },

  deleteClient: async (payload) => {
    const { clientId } = payload;

    // Map에서 client 가져오기
    const client = clientInstances.get(clientId);
    if (client) {
      await client.close();
      clientInstances.delete(clientId);
    }

    set((state) => {
      const { [clientId]: deleted, ...clients } = state.clients;
      return { clients };
    });
  },

  getClient: (payload) => {
    const { clientId } = payload;
    return get().clients[clientId];
  },

  disconnectClient: async (payload) => {
    const { clientId } = payload;

    // Map에서 client 가져오기
    const client = clientInstances.get(clientId);
    if (!client) return;

    try {
      await client.close();
      clientInstances.delete(clientId); // Map에서 제거

      set((state) => {
        const clientData = state.clients[clientId];
        if (!clientData) return state;

        return {
          clients: {
            ...state.clients,
            [clientId]: {
              ...clientData,
              status: 'disconnected',
              serverCapabilities: undefined,
            },
          },
        };
      });
    } catch (error) {
      console.error(`Error disconnecting client ${clientId}:`, error);
      get().updateClientStatus({
        clientId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Disconnect failed',
      });
    }
  },

  // 알림 핸들러 설정 - payload 방식
  setupNotificationHandlers: (payload) => {
    const { clientId, client } = payload;
    const mcpClient = get().clients[clientId];

    if (!mcpClient) return;

    // Client 인스턴스를 Map에 저장
    clientInstances.set(clientId, client);

    // Progress 알림
    client.setNotificationHandler(
      ProgressNotificationSchema,
      async (notification) => {
        console.log(`[${clientId}] Progress:`, notification.params);
        get().addNotificationToHistory({ clientId, type: 'progress', notification });
      },
    );

    // 로그 메시지
    client.setNotificationHandler(
      LoggingMessageNotificationSchema,
      async (notification) => {
        console.log(`[${clientId}] Log:`, notification.params);
        get().addNotificationToHistory({ clientId, type: 'log', notification });
      },
    );

    // 리소스 업데이트
    client.setNotificationHandler(
      ResourceUpdatedNotificationSchema,
      async (notification) => {
        console.log(`[${clientId}] Resource updated:`, notification.params);
        get().addNotificationToHistory({
          clientId,
          type: 'resource-updated',
          notification,
        });
      },
    );

    // 리소스 목록 변경
    client.setNotificationHandler(
      ResourceListChangedNotificationSchema,
      async (notification) => {
        console.log(`[${clientId}] Resource list changed`);
        get().addNotificationToHistory({
          clientId,
          type: 'resource-list-changed',
          notification,
        });
      },
    );

    // 도구 목록 변경
    client.setNotificationHandler(
      ToolListChangedNotificationSchema,
      async (notification) => {
        console.log(`[${clientId}] Tool list changed`);
        get().addNotificationToHistory({
          clientId,
          type: 'tool-list-changed',
          notification,
        });
      },
    );

    // 프롬프트 목록 변경
    client.setNotificationHandler(
      PromptListChangedNotificationSchema,
      async (notification) => {
        console.log(`[${clientId}] Prompt list changed`);
        get().addNotificationToHistory({
          clientId,
          type: 'prompt-list-changed',
          notification,
        });
      },
    );

    // 취소 알림
    client.setNotificationHandler(
      CancelledNotificationSchema,
      async (notification) => {
        console.log(`[${clientId}] Request cancelled:`, notification.params);
        get().addNotificationToHistory({ clientId, type: 'cancelled', notification });
      },
    );

    // Fallback 핸들러
    client.fallbackNotificationHandler = async (notification) => {
      console.log(`[${clientId}] Unknown notification:`, notification);
      get().addNotificationToHistory({ clientId, type: 'unknown', notification });
    };
  },

  // 요청/응답 - payload 방식
  sendRequest: async (payload) => {
    const { clientId, request, schema, options } = payload;
  
    console.log(`📤 sendRequest called for client: ${clientId}`);
    console.log('📋 Request details:', { method: request.method, params: request.params });
    
    const client = clientInstances.get(clientId);
    if (!client) {
      console.error(`❌ Client not found in Map: ${clientId}`);
      console.log('📦 Available clients:', Array.from(clientInstances.keys()));
      throw new Error('Client not connected');
    }
  
    try {
      get().updateLastActivity({ clientId });
  
      // ✅ schema가 필수 매개변수임
      const response = await client.request(request, schema, options);
      
      console.log('✅ Response received:', response);
      
      return response;
    } catch (error) {
      console.error('❌ Request failed:', error);
      throw error;
    }
  },
  // 알림 보내기
  sendNotification: async (payload) => {
    const { clientId, notification } = payload;

    // Map에서 client 가져오기
    const client = clientInstances.get(clientId);
    if (!client) throw new Error('Client not connected');

    try {
      await client.notification(notification);
      get().addNotificationToHistory({ clientId, type: 'sent', notification });
    } catch (error) {
      console.error(`Error sending notification from ${clientId}:`, error);
      throw error;
    }
  },

  // 커스텀 알림 핸들러 설정
  setNotificationHandler: (payload) => {
    const { clientId, method, handler } = payload;


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
        clients: {
          ...state.clients,
          [clientId]: {
            ...state.clients[clientId],
            notificationHandlers: {
              ...state.clients[clientId].notificationHandlers,
              [method]: handler,
            },
          },
        },
      };
    });

    // set((state) => {
    //   const client = state.clients[clientId];
    //   if (!client) return state;

    //   return {
    //     clients: {
    //       ...state.clients,
    //       [clientId]: {
    //         ...client,
    //         notificationHandlers: {
    //           ...client.notificationHandlers,
    //           [method]: handler,
    //         },
    //       },
    //     },
    //   };
    // });
  },

  // 상태 업데이트
  updateClientStatus: (payload) => {
    const { clientId, status, error } = payload;

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
        clients: {
          ...state.clients,
          [clientId]: {
            ...state.clients[clientId],
            status,
            ...(error !== undefined && { error }),
            lastActivity: new Date().toISOString(),
          },
        },
      };
    });

    // set((state) => {
    //   const client = state.clients[clientId];
    //   if (!client) return state;

    //   return {
    //     clients: {
    //       ...state.clients,
    //       [clientId]: {
    //         ...client,
    //         status,
    //         ...(error !== undefined && { error }),
    //         lastActivity: new Date().toISOString(),
    //       },
    //     },
    //   };
    // });
  },

  updateLastActivity: (payload) => {
    const { clientId } = payload;
    set((state) => {
      const client = state.clients[clientId];
      if (!client) return state;

      return {
        clients: {
          ...state.clients,
          [clientId]: {
            ...client,
            lastActivity: new Date().toISOString(),
          },
        },
      };
    });
  },

  addRequestToHistory: (payload) => {
    return
    // const { clientId, request, response, error } = payload;
    // set((state) => {
    //   const client = state.clients[clientId];
    //   if (!client || !client.requestHistory) return state;
    //
    //   const newHistory = [
    //     ...client.requestHistory,
    //     {
    //       type: 'request' as const,
    //       request,
    //       response,
    //       error,
    //       timestamp: new Date().toISOString(),
    //     },
    //   ];
    //
    //   // 최근 100개만 유지
    //   const trimmedHistory = newHistory.slice(-100);
    //
    //   return {
    //     clients: {
    //       ...state.clients,
    //       [clientId]: {
    //         ...client,
    //         requestHistory: trimmedHistory,
    //       },
    //     },
    //   };
    // });
  },

  addNotificationToHistory: (payload) => {
    return
    // const { clientId, type, notification } = payload;
    // set((state) => {
    //   const client = state.clients[clientId];
    //   if (!client || !client.requestHistory) return state;
    //
    //   const newHistory = [
    //     ...client.requestHistory,
    //     {
    //       type: 'notification' as const,
    //       notificationType: type,
    //       notification,
    //       timestamp: new Date().toISOString(),
    //     },
    //   ];
    //
    //   // 최근 100개만 유지
    //   const trimmedHistory = newHistory.slice(-100);
    //
    //   return {
    //     clients: {
    //       ...state.clients,
    //       [clientId]: {
    //         ...client,
    //         requestHistory: trimmedHistory,
    //       },
    //     },
    //   };
    // });
  },

  // 추가 헬퍼 메서드
  getAllClients: () => {
    return Object.values(get().clients);
  },

  getClientsBySession: (sessionId) => {
    return Object.values(get().clients).filter(
      client => client.sessionId === sessionId
    );
  },

  getConnectedClients: () => {
    return Object.values(get().clients).filter(
      client => client.status === 'connected'
    );
  },

  // Client 인스턴스 업데이트
  updateClient: (payload) => {
    const { clientId, updates } = payload;

    // Client 인스턴스와 다른 업데이트 분리
    const { client: clientInstance, ...otherUpdates } = updates;

    if (clientInstance) {
      // clientInstance가 실제 Client SDK의 인스턴스라고 가정합니다.
      // 타입 단언을 사용하여 Client 타입으로 명시합니다.
      clientInstances.set(clientId, clientInstance as Client<Request, Notification, Result>);
    }

    set((state) => {
      console.log('🔍 Setting state for store:', 'clientStore'); // store 이름 명시
      console.log('📦 State keys:', Object.keys(state));
      
      // 직렬화 불가능한 객체 찾기
      Object.entries(state).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
          if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
            // console.error(`❌ Non-serializable object found in ${key}:`, value.constructor.name);
          }
        }
      });
      
      const existingClientData = state.clients[clientId];
      if (!existingClientData) return state; // 해당 클라이언트 ID가 없으면 상태 변경 안 함

      return {
        clients: {
          ...state.clients,
          [clientId]: {
            ...existingClientData,
            ...otherUpdates, // 직렬화 가능한 업데이트만 병합
          },
        },
      };
    });
  },
}));
