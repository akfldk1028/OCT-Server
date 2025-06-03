// // src/main/mcp/connect/mcpStore.ts

// import { createStore } from 'zustand/vanilla';
// import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

// // 임시 AI 모델 생성 함수
// function createAIModel(modelConfig: any) {
//   return {
//     sendPrompt: async (prompt: string) => {
//       return 'AI 응답 예시';
//     }
//   };
// }

// type RoomState = {
//   sessionId: string;
//   clients: Record<string, MCPClientState>;
//   messages: any[];
//   // 기타 방별 상태
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
//   aiModel: any | null; // AI 모델 핸들러(예: OpenAI, Anthropic 등)
// };

// type MCPStoreState = {
//   rooms: Record<string, RoomState>;
//   CREATE_ROOM: (sessionId?: string) => string;
//   ADD_CLIENT: (sessionId: string, clientId: string, command: string, args: string[], env: Record<string, string>) => void;
//   CONNECT_CLIENT: (sessionId: string, clientId: string) => Promise<void>;
//   DISCONNECT_CLIENT: (sessionId: string, clientId: string) => Promise<void>;
//   SET_COMMAND: (sessionId: string, clientId: string, command: string, args: string[]) => void;
//   SET_ENV: (sessionId: string, clientId: string, env: Record<string, string>) => void;
//   SEND_MESSAGE: (sessionId: string, clientId: string, message: string) => Promise<any>;
//   CONNECT_AI_MODEL: (sessionId: string, clientId: string, modelConfig: any) => Promise<void>;
//   SEND_PROMPT_TO_MODEL: (sessionId: string, clientId: string, prompt: string) => Promise<any>;
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
//             }
//           }
//         }
//       }
//     }));
//   },

//   CONNECT_CLIENT: async (sessionId, clientId) => {
//     const state = get().rooms[sessionId].clients[clientId];
//     if (!state || state.running) return;
//     const transport = new StdioClientTransport({
//       command: state.command,
//       args: state.args,
//       env: state.env,
//     });
//     const client = new Client({ name: clientId, version: '1.0.0' }, { capabilities: {} });
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
// }));