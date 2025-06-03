// common/types/session-types.ts
export interface Session {
  id: string;
  roomId: string;
  transportId?: string; // transport session ID
  clients: string[]; // client IDs
  createdAt: string;
  status: 'active' | 'inactive' | 'error';
}

// common/types/session-types.ts
export interface SessionState {
  sessions: Record<string, Session>;

  // Promise 반환
  createSession: (payload: { roomId: string }) => Promise<string>;
  deleteSession: (payload: { sessionId: string }) => Promise<void>;
  getSession: (sessionId: string) => Session | undefined;

  addClientToSession: (sessionId: string, clientId: string) => void;
  removeClientFromSession: (sessionId: string, clientId: string) => void;
  getSessionClients: (sessionId: string) => string[];

  setTransportId: (sessionId: string, transportId: string) => void;
  updateSessionStatus: (sessionId: string, status: Session['status']) => void;
}