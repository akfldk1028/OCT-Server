// // src/main/mcp/connect/mcpStore.ts

// import { createStore } from 'zustand/vanilla';
// import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
// import { z } from 'zod';
// import { Notification, StdErrNotificationSchema } from '../../../renderer/lib/notificationTypes';

// // 임시 AI 모델 생성 함수
// function createAIModel(modelConfig: any) {
//   return {
//     sendPrompt: async (prompt: string) => {
//       return 'AI 응답 예시';
//     }
//   };
// }

// // 임시 인증 함수 (OAuth 등)
// async function authClient(authOptions: any) {
//   // 실제 서비스에 맞게 구현
//   return { authorized: true, token: 'dummy-token' };
// }

// // 임시 프록시 헬스체크 함수
// async function checkProxyHealth(proxyUrl: string) {
//   // 실제 서비스에 맞게 구현
//   // fetch(`${proxyUrl}/health`) 등
//   return { status: 'ok' };
// }

// type NotificationHandler = (notification: any) => Promise<void>;
// type StdErrHandler = (notification: any) => Promise<void>;
// type PendingRequestHandler = (request: any, resolve: any, reject: any) => void;

// type RoomState = {
//   sessionId: string;
//   clients: Record<string, MCPClientState>;
//   messages: any[];
// };

// type MCPClientState = {
//   id: string;
//   running: boolean;
//   error: string | null;
//   command: string;
//   args: string[];
//   env: Record<string, string>;
//   client: Client | null;
//   transport: StdioClientTransport | null;
//   aiModel: any | null;
//   capabilities?: any;
//   requestHistory?: { request: any; response?: any }[];
//   notificationHandler?: NotificationHandler;
//   stdErrHandler?: StdErrHandler;
//   pendingRequestHandler?: PendingRequestHandler;
//   authToken?: string;
// };

// type MCPStoreState = {
//   rooms: Record<string, RoomState>;
//   CREATE_ROOM: (sessionId?: string) => string;
//   ADD_CLIENT: (sessionId: string, clientId: string, command: string, args: string[], env: Record<string, string>) => void;
//   CONNECT_CLIENT: (sessionId: string, clientId: string, options?: any) => Promise<void>;
//   DISCONNECT_CLIENT: (sessionId: string, clientId: string) => Promise<void>;
//   SET_COMMAND: (sessionId: string, clientId: string, command: string, args: string[]) => void;
//   SET_ENV: (sessionId: string, clientId: string, env: Record<string, string>) => void;
//   SEND_MESSAGE: (sessionId: string, clientId: string, message: string) => Promise<any>;
//   CONNECT_AI_MODEL: (sessionId: string, clientId: string, modelConfig: any) => Promise<void>;
//   SEND_PROMPT_TO_MODEL: (sessionId: string, clientId: string, prompt: string) => Promise<any>;
//   CHECK_PROXY_HEALTH: (sessionId: string, proxyUrl: string) => Promise<any>;
//   AUTH_CLIENT: (sessionId: string, clientId: string, authOptions: any) => Promise<any>;
//   SET_NOTIFICATION_HANDLER: (sessionId: string, clientId: string, handler: NotificationHandler) => void;
//   SET_STDERR_HANDLER: (sessionId: string, clientId: string, handler: StdErrHandler) => void;
//   SET_PENDING_REQUEST_HANDLER: (sessionId: string, clientId: string, handler: PendingRequestHandler) => void;
//   MAKE_REQUEST: <T extends z.ZodType>(sessionId: string, clientId: string, request: any, schema: T, options?: any) => Promise<z.output<T>>;
// };

// export const mcpStore = createStore<MCPStoreState>((set, get) => ({
//   rooms: {},

//   CREATE_ROOM: (sessionId) => {
//     const id = sessionId || Math.random().toString(36).slice(2) + Date.now().toString(36);
//     set(state => ({
//       rooms: {
//         ...state.rooms,
//         [id]: {
//           sessionId: id,
//           clients: {},
//           messages: [],
//         }
//       }
//     }));
//     return id;
//   },

//   ADD_CLIENT: (sessionId, clientId, command, args, env) => {
//     set(state => ({
//       rooms: {
//         ...state.rooms,
//         [sessionId]: {
//           ...state.rooms[sessionId],
//           clients: {
//             ...state.rooms[sessionId].clients,
//             [clientId]: {
//               id: clientId,
//               running: false,
//               error: null,
//               command,
//               args,
//               env,
//               client: null,
//               transport: null,
//               aiModel: null,
//               capabilities: null,
//               requestHistory: [],
//             }
//           }
//         }
//       }
//     }));
//   },

//   CONNECT_CLIENT: async (sessionId, clientId, options) => {
//     const state = get().rooms[sessionId].clients[clientId];
//     if (!state || state.running) return;
//     // 인증/프록시 헬스체크 등 options에서 처리 가능
//     // 예: await get().CHECK_PROXY_HEALTH(sessionId, options.proxyUrl)
//     // 예: const auth = await get().AUTH_CLIENT(sessionId, clientId, options.authOptions)
//     const transport = new StdioClientTransport({
//       command: state.command,
//       args: state.args,
//       env: state.env,
//     });
//     const client = new Client({ name: clientId, version: '1.0.0' }, { capabilities: {} });
//     // 알림 핸들러 등록
//     if (state.notificationHandler) client.fallbackNotificationHandler = state.notificationHandler;
//     if (state.stdErrHandler) client.setNotificationHandler(StdErrNotificationSchema, state.stdErrHandler);
//     // 기타 핸들러 등록 등
//     await client.connect(transport);
//     set(s => ({
//       rooms: {
//         ...s.rooms,
//         [sessionId]: {
//           ...s.rooms[sessionId],
//           clients: {
//             ...s.rooms[sessionId].clients,
//             [clientId]: {
//               ...s.rooms[sessionId].clients[clientId],
//               client,
//               transport,
//               running: true,
//               error: null,
//               capabilities: client.getServerCapabilities ? client.getServerCapabilities() : null,
//             }
//           }
//         }
//       }
//     }));
//   },

//   DISCONNECT_CLIENT: async (sessionId, clientId) => {
//     const state = get().rooms[sessionId].clients[clientId];
//     if (!state || !state.running) return;
//     await state.client?.close();
//     set(s => ({
//       rooms: {
//         ...s.rooms,
//         [sessionId]: {
//           ...s.rooms[sessionId],
//           clients: {
//             ...s.rooms[sessionId].clients,
//             [clientId]: {
//               ...s.rooms[sessionId].clients[clientId],
//               client: null,
//               transport: null,
//               running: false,
//             }
//           }
//         }
//       }
//     }));
//   },

//   SET_COMMAND: (sessionId, clientId, command, args) => {
//     set(state => ({
//       rooms: {
//         ...state.rooms,
//         [sessionId]: {
//           ...state.rooms[sessionId],
//           clients: {
//             ...state.rooms[sessionId].clients,
//             [clientId]: {
//               ...state.rooms[sessionId].clients[clientId],
//               command,
//               args,
//             }
//           }
//         }
//       }
//     }));
//   },

//   SET_ENV: (sessionId, clientId, env) => {
//     set(state => ({
//       rooms: {
//         ...state.rooms,
//         [sessionId]: {
//           ...state.rooms[sessionId],
//           clients: {
//             ...state.rooms[sessionId].clients,
//             [clientId]: {
//               ...state.rooms[sessionId].clients[clientId],
//               env,
//             }
//           }
//         }
//       }
//     }));
//   },

//   SEND_MESSAGE: async (sessionId, clientId, message) => {
//     const state = get().rooms[sessionId].clients[clientId];
//     if (!state || !state.client) throw new Error('Not connected');
//     // 실제 요청/스키마에 맞게 구현
//     return await state.client.request({ method: 'tools/list' }, ListToolsResultSchema);
//   },

//   CONNECT_AI_MODEL: async (sessionId, clientId, modelConfig) => {
//     set(s => ({
//       rooms: {
//         ...s.rooms,
//         [sessionId]: {
//           ...s.rooms[sessionId],
//           clients: {
//             ...s.rooms[sessionId].clients,
//             [clientId]: {
//               ...s.rooms[sessionId].clients[clientId],
//               aiModel: createAIModel(modelConfig),
//             }
//           }
//         }
//       }
//     }));
//   },

//   SEND_PROMPT_TO_MODEL: async (sessionId, clientId, prompt) => { 
//     const state = get().rooms[sessionId].clients[clientId];
//     if (!state || !state.aiModel) throw new Error('AI 모델 미연결');
//     return await state.aiModel.sendPrompt(prompt);
//   },

//   // 프록시 헬스체크
//   CHECK_PROXY_HEALTH: async (sessionId, proxyUrl) => {
//     return await checkProxyHealth(proxyUrl);
//   },

//   // 인증 (OAuth 등)
//   AUTH_CLIENT: async (sessionId, clientId, authOptions) => {
//     const result = await authClient(authOptions);
//     set(state => ({
//       rooms: {
//         ...state.rooms,
//         [sessionId]: {
//           ...state.rooms[sessionId],
//           clients: {
//             ...state.rooms[sessionId].clients,
//             [clientId]: {
//               ...state.rooms[sessionId].clients[clientId],
//               authToken: result.token,
//             }
//           }
//         }
//       }
//     }));
//     return result;
//   },

//   // 알림 핸들러 등록
//   SET_NOTIFICATION_HANDLER: (sessionId, clientId, handler) => {
//     set(state => ({
//       rooms: {
//         ...state.rooms,
//         [sessionId]: {
//           ...state.rooms[sessionId],
//           clients: {
//             ...state.rooms[sessionId].clients,
//             [clientId]: {
//               ...state.rooms[sessionId].clients[clientId],
//               notificationHandler: handler,
//             }
//           }
//         }
//       }
//     }));
//   },

//   SET_STDERR_HANDLER: (sessionId, clientId, handler) => {
//     set(state => ({
//       rooms: {
//         ...state.rooms,
//         [sessionId]: {
//           ...state.rooms[sessionId],
//           clients: {
//             ...state.rooms[sessionId].clients,
//             [clientId]: {
//               ...state.rooms[sessionId].clients[clientId],
//               stdErrHandler: handler,
//             }
//           }
//         }
//       }
//     }));
//   },

//   SET_PENDING_REQUEST_HANDLER: (sessionId, clientId, handler) => {
//     set(state => ({
//       rooms: {
//         ...state.rooms,
//         [sessionId]: {
//           ...state.rooms[sessionId],
//           clients: {
//             ...state.rooms[sessionId].clients,
//             [clientId]: {
//               ...state.rooms[sessionId].clients[clientId],
//               pendingRequestHandler: handler,
//             }
//           }
//         }
//       }
//     }));
//   },

//   // zod 스키마 기반 요청/응답
//   MAKE_REQUEST: async (sessionId, clientId, request, schema, options) => {
//     const state = get().rooms[sessionId].clients[clientId];
//     if (!state || !state.client) throw new Error('Not connected');
//     try {
//       const response = await state.client.request(request, schema, options);
//       set(s => {
//         const prev = s.rooms[sessionId].clients[clientId].requestHistory || [];
//         return {
//           rooms: {
//             ...s.rooms,
//             [sessionId]: {
//               ...s.rooms[sessionId],
//               clients: {
//                 ...s.rooms[sessionId].clients,
//                 [clientId]: {
//                   ...s.rooms[sessionId].clients[clientId],
//                   requestHistory: [...prev, { request, response }],
//                 }
//               }
//             }
//           }
//         };
//       });
//       return response;
//     } catch (e) {
//       set(s => {
//         const prev = s.rooms[sessionId].clients[clientId].requestHistory || [];
//         return {
//           rooms: {
//             ...s.rooms,
//             [sessionId]: {
//               ...s.rooms[sessionId],
//               clients: {
//                 ...s.rooms[sessionId].clients,
//                 [clientId]: {
//                   ...s.rooms[sessionId].clients[clientId],
//                   requestHistory: [...prev, { request, error: e }],
//                   error: e instanceof Error ? e.message : String(e),
//                 }
//               }
//             }
//           }
//         };
//       });
//       throw e;
//     }
//   },
// }));