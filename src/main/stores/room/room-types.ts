// common/types/room-types.ts
export interface Room {
  id: string;
  name: string;
  createdAt: string; // ← 이렇게!
  sessions: string[]; // session IDs
  metadata?: Record<string, any>;
}

export interface RoomState {
  rooms: Record<string, Room>;

  // Room 관리 - Promise 반환
  createRoom: (name?: string) => Promise<string>;
  deleteRoom: (roomId: string) => Promise<void>;
  getRoom: (roomId: string) => Room | undefined;

  // Session 관리
  addSessionToRoom: (roomId: string, sessionId: string) => void;
  removeSessionFromRoom: (roomId: string, sessionId: string) => void;
  getRoomSessions: (roomId: string) => string[];
}

