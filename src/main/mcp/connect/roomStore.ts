// // src/main/mcp/connect/roomStore.ts

// import { createStore } from 'zustand/vanilla';
// import { mcpStore } from './mcpActions';

// type RoomStoreType = {
//   [sessionId: string]: ReturnType<typeof mcpStore>;
// };

// export const roomStore: RoomStoreType = {};

// // 방(세션) 생성
// export function createRoom(sessionId?: string) {
//   const id = sessionId || generateSessionId();
//   if (!roomStore[id]) {
//     roomStore[id] = mcpStore(); // 각 방마다 독립적인 mcpStore 인스턴스
//   }
//   return id;
// }

// // 유틸: 세션ID 생성
// function generateSessionId() {
//   return Math.random().toString(36).slice(2) + Date.now().toString(36);
// }

// export function addClientToRoom(sessionId: string, clientId: string, command: string, args: string[], env: Record<string, string>) {
//     if (!roomStore[sessionId]) throw new Error('방이 존재하지 않습니다');
//     roomStore[sessionId].getState().CREATE_CLIENT(clientId, command, args, env);
//   }
  
//   // 예시: 방의 클라이언트 연결
//   export async function connectClientInRoom(sessionId: string, clientId: string) {
//     if (!roomStore[sessionId]) throw new Error('방이 존재하지 않습니다');
//     await roomStore[sessionId].getState().CONNECT_CLIENT(clientId);
//   }
  
//   // 예시: 방의 클라이언트에 메시지 보내기
//   export async function sendMessageInRoom(sessionId: string, clientId: string, message: string) {
//     if (!roomStore[sessionId]) throw new Error('방이 존재하지 않습니다');
//     return await roomStore[sessionId].getState().SEND_MESSAGE(clientId, message);
//   }