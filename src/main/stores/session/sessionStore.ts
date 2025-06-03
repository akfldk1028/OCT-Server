// main/stores/session/sessionStore.ts
import { createStore } from 'zustand/vanilla';
import type { SessionState, Session } from '@/main/stores/session/session-types';
import { v4 as uuidv4 } from 'uuid';

export const sessionStore = createStore<SessionState>((set, get) => ({
  sessions: {},

  // Promise를 반환하도록 수정
  createSession: (payload) => {
    const { roomId } = payload;
    return new Promise<string>((resolve) => {
      const id = 'Session-' + uuidv4();
      const session: Session = {
        id,
        roomId,
        clients: [],
        createdAt: new Date().toISOString(),
        status: 'inactive',
      };

      set(state => ({
        sessions: {
          ...state.sessions,
          [id]: session,
        },
      }));

      console.log(`📡 Session created: ${id} for room ${roomId}`);
      
      // 상태가 업데이트된 후 ID 반환
      setTimeout(() => {
        resolve(id);
      }, 0);
    });
  },

  // 또는 더 안전한 방법: subscribe를 사용한 버전
  createSessionAsync: async (payload) => {
    const { roomId } = payload;
    const id = 'Session-' + uuidv4();
    const session: Session = {
      id,
      roomId,
      clients: [],
      createdAt: new Date().toISOString(),
      status: 'inactive',
    };

    return new Promise<string>((resolve) => {
      const unsubscribe = sessionStore.subscribe((state) => {
        if (state.sessions[id]) {
          unsubscribe();
          resolve(id);
        }
      });

      set(state => ({
        sessions: {
          ...state.sessions,
          [id]: session,
        },
      }));
    });
  },

  deleteSession: async (payload) => {
    const { sessionId } = payload;
    set(state => {
      const newSessions = { ...state.sessions };
      delete newSessions[sessionId];
      return { sessions: newSessions };
    });
  },

  getSession: (payload) => {
    const { sessionId } = payload;
    return get().sessions[sessionId];
  },

  addClientToSession: (payload) => {
    const { sessionId, clientId } = payload;
    set(state => {
      const session = state.sessions[sessionId];
      if (session && !session.clients.includes(clientId)) {
        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              clients: [...session.clients, clientId],
            },
          },
        };
      }
      return state;
    });
  },

  removeClientFromSession: (payload) => {
    const { sessionId, clientId } = payload;
    set(state => {
      const session = state.sessions[sessionId];
      if (session) {
        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              clients: session.clients.filter(id => id !== clientId),
            },
          },
        };
      }
      return state;
    });
  },

  setTransportId: (payload) => {
    const { sessionId, transportId } = payload;
    set(state => {
      const session = state.sessions[sessionId];
      if (session) {
        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              transportId,
              status: 'active',
            },
          },
        };
      }
      return state;
    });
  },

  getSessionClients: (payload) => {
    const { sessionId } = payload;
    const session = get().sessions[sessionId];
    return session ? session.clients : [];
  },

  updateSessionStatus: (payload) => {
    const { sessionId, status } = payload;
    set(state => {
      const session = state.sessions[sessionId];
      if (session) {
        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              status,
            },
          },
        };
      }
      return state;
    });
  },
}));