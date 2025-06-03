// main/stores/room/roomStore.ts
import { createStore } from 'zustand/vanilla';
import type { RoomState, Room } from '@/main/stores/room/room-types';
import { v4 as uuidv4 } from 'uuid';

export const roomStore = createStore<RoomState>((set, get) => ({
  rooms: {},
  
  // Promise를 반환하도록 수정
  createRoom: (payload) => {
    const { name } = payload;
    return new Promise<string>((resolve) => {
      const id = 'Room-' + uuidv4();
      const room: Room = {
        id,
        name: name || `Room ${id.slice(0, 8)}`,
        createdAt: new Date().toISOString(), // ← 이렇게!
        sessions: [],
      };

      set((state) => ({
        ...state,
        rooms: {
          ...state.rooms,
          [id]: room
        }
      }));
      
      console.log(`1️⃣ Room created: ${room.name} (${id})`);
      
      // 상태가 업데이트된 후 ID 반환
      setTimeout(() => {
        resolve(id);
      }, 0);
    });
  },

  // 또는 더 안전한 방법: subscribe를 사용한 버전
  createRoomAsync: async (payload) => {
    const { name } = payload;
    const id = 'Room-' + uuidv4();
    const room: Room = {
      id,
      name: name || `Room ${id.slice(0, 8)}`,
      createdAt: new Date(),
      sessions: [],
    };

    // Promise로 감싸서 상태 업데이트 확인
    return new Promise<string>((resolve) => {
      const unsubscribe = roomStore.subscribe((state) => {
        if (state.rooms[id]) {
          unsubscribe();
          resolve(id);
        }
      });

      // 상태 업데이트
      set((state) => ({
        ...state,
        rooms: {
          ...state.rooms,
          [id]: room
        }
      }));
    });
  },

  deleteRoom: async (payload) => {
    const { roomId } = payload;
    set((state) => {
      const { [roomId]: deleted, ...newRooms } = state.rooms;
      return { rooms: newRooms };
    });
  },

  getRoom: (roomId) => {
    return get().rooms[roomId];
  },

  addSessionToRoom: (payload) => {
    const { roomId, sessionId } = payload;

    console.log(`🏠🏠🏠🏠 Session added to Room: ${sessionId} in ${roomId}`);
    set((state) => {
      const room = state.rooms[roomId];
      console.log('🏠const room = state.rooms[roomId]; ', room);
      if (room && !room.sessions.includes(sessionId)) {
        return {
          rooms: {
            ...state.rooms,
            [roomId]: {
              ...room,
              sessions: [...room.sessions, sessionId]
            }
          }
        };
      }
      return state;
    });
    console.log('🏠 Session added to Room: ', get().rooms);
  },

  removeSessionFromRoom: (payload) => {
    const { roomId, sessionId } = payload;
    set((state) => {
      const room = state.rooms[roomId];
      if (room) {
        return {
          rooms: {
            ...state.rooms,
            [roomId]: {
              ...room,
              sessions: room.sessions.filter((id) => id !== sessionId)
            }
          }
        };
      }
      return state;
    });
  },

  getRoomSessions: (payload) => {
    const { roomId } = payload;
    const room = get().rooms[roomId];
    return room?.sessions || [];
  },

  getAllRooms: () => {
    return Object.values(get().rooms);
  },

  getRoomIds: () => {
    return Object.keys(get().rooms);
  },

  getRoomCount: () => {
    return Object.keys(get().rooms).length;
  },

  updateRoom: (payload) => {
    const { roomId, updates } = payload;
    set((state) => {
      const room = state.rooms[roomId];
      if (room) {
        return {
          rooms: {
            ...state.rooms,
            [roomId]: {
              ...room,
              ...updates
            }
          }
        };
      }
      return state;
    });
  }
}));