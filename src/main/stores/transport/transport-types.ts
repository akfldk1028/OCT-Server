// main/stores/transport/transport-types.ts
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export interface TransportSession {
  id: string;
  serverId: string;
  transport: Transport; // 실제로는 null로 저장됨
  transportType: 'stdio' | 'sse' | 'streamable-http';
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string; // Date → string
  lastActivity: string; // Date → string
  error?: string;
}

export interface TransportConfig {
  transportType: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface TransportState {
  sessions: Record<string, TransportSession>;
  // activeTransports: Record<string, Transport>; // 제거 - 직렬화 불가

  // Actions - 모두 payload 방식으로
  createTransport: (payload: { serverId: string; config: TransportConfig }) => Promise<string>;
  closeTransport: (payload: { sessionId: string }) => Promise<void>;
  closeAllTransports: (payload?: { serverId?: string }) => Promise<void>;
  
  // Getters
  getTransport: (payload: { sessionId: string }) => Transport | undefined;
  getServerTransports: (payload: { serverId: string }) => TransportSession[];
  
  // Updates
  updateSessionStatus: (payload: { sessionId: string; status: TransportSession['status']; error?: string }) => void;
  updateLastActivity: (payload: { sessionId: string }) => void;
  
  // Maintenance
  checkTransportHealth: (payload: { sessionId: string }) => Promise<boolean>;
  cleanupStaleTransports: () => Promise<void>;
}