// main/stores/client/client-types.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  ClientCapabilities,
  ServerCapabilities,
  Notification,
  Request,
  Result,
} from '@modelcontextprotocol/sdk/types.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';

export interface MCPClient {
  id: string;
  sessionId: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  client?: Client<Request, Notification, Result>;
  serverCapabilities?: ServerCapabilities;
  capabilities: ClientCapabilities;
  lastActivity: string;
  error?: string;
  instructions?: string;
  requestHistory: Array<{
    type: 'request' | 'notification';
    request?: any;
    response?: any;
    notification?: any;
    notificationType?: string;
    error?: any;
    timestamp: string;
  }>;
  notificationHandlers: Record<string, (notification: any) => Promise<void>>; // Map → Record
}

export interface ClientState {
  clients: Record<string, MCPClient>; // Map → Record

  // Client 관리 - 모두 payload 방식으로
  createClient: (payload: {
    sessionId: string;
    name: string;
    capabilities?: ClientCapabilities;
  }) => string;
  
  deleteClient: (payload: { clientId: string }) => Promise<void>;
  
  getClient: (payload: { clientId: string }) => MCPClient | undefined;

  // 연결 관리
  disconnectClient: (payload: { clientId: string }) => Promise<void>;

  // 알림 핸들러
  setupNotificationHandlers: (payload: {
    clientId: string;
    client: Client<Request, Notification, Result>;
  }) => void;
  
  setNotificationHandler: (payload: {
    clientId: string;
    method: string;
    handler: (notification: any) => Promise<void>;
  }) => void;

  // 요청/응답
  sendRequest: <T = any>(payload: {
    clientId: string;
    request: {
      method: string;
      params?: any;
    };
    schema: any;
    options?: RequestOptions;
  }) => Promise<T>;
  
  sendNotification: (payload: {
    clientId: string;
    notification: any;
  }) => Promise<void>;

  // 상태 업데이트
  updateClientStatus: (payload: {
    clientId: string;
    status: MCPClient['status'];
    error?: string;
  }) => void;
  
  updateLastActivity: (payload: { clientId: string }) => void;

  // 히스토리 - payload 방식으로 수정
  addRequestToHistory: (payload: {
    clientId: string;
    request: any;
    response?: any;
    error?: any;
  }) => void;
  
  addNotificationToHistory: (payload: {
    clientId: string;
    type: string;
    notification: any;
  }) => void;

  // 추가 헬퍼 메서드
  getAllClients: () => MCPClient[];
  getClientsBySession: (sessionId: string) => MCPClient[];
  getConnectedClients: () => MCPClient[];
  
  // Client 업데이트
  updateClient: (payload: {
    clientId: string;
    updates: Partial<MCPClient & { client?: Client<Request, Notification, Result> }>;
  }) => void;
}