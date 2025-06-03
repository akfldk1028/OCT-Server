// main/stores/proxy/proxyStore.ts
import { createStore } from 'zustand/vanilla';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { v4 as uuidv4 } from 'uuid';
import type { ProxyState, ProxyConnection } from './proxy-types';

export const proxyStore = createStore<ProxyState>((set, get) => ({
  connections: {},

  createProxy: (clientTransport, serverTransport) => {
    const id = uuidv4();

    let clientClosed = false;
    let serverClosed = false;

    // 메시지 프록시 설정
    clientTransport.onmessage = (message) => {
      serverTransport
        .send(message)
        .catch((error) => console.error('Error sending to server:', error));
    };

    serverTransport.onmessage = (message) => {
      clientTransport
        .send(message)
        .catch((error) => console.error('Error sending to client:', error));
    };

    // 연결 종료 처리
    clientTransport.onclose = () => {
      if (serverClosed) return;
      clientClosed = true;
      serverTransport
        .close()
        .catch((error) =>
          console.error('Error closing server transport:', error),
        );
      get().closeProxy(id);
    };

    serverTransport.onclose = () => {
      if (clientClosed) return;
      serverClosed = true;
      clientTransport
        .close()
        .catch((error) =>
          console.error('Error closing client transport:', error),
        );
      get().closeProxy(id);
    };

    // 에러 핸들러
    clientTransport.onerror = (error) => {
      console.error('Client transport error:', error);
    };

    serverTransport.onerror = (error) => {
      console.error('Server transport error:', error);
    };

    const connection: ProxyConnection = {
      id,
      clientTransport,
      serverTransport,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      connections: { ...state.connections, [id]: connection },
    }));

    console.log(`🔗 Proxy created: ${id}`);
    return id;
  },

  closeProxy: async (proxyId) => {
    const connection = get().connections[proxyId];
    if (!connection) return;

    try {
      await Promise.all([
        connection.clientTransport.close(),
        connection.serverTransport.close(),
      ]);
    } catch (error) {
      console.error(`Error closing proxy ${proxyId}:`, error);
    }

    set((state) => {
      const newConnections = { ...state.connections };
      if (newConnections[proxyId]) {
        newConnections[proxyId] = {
          ...newConnections[proxyId],
          status: 'closed',
        };
      }
      return { connections: newConnections };
    });
  },

  getProxy: (proxyId) => {
    return get().connections[proxyId];
  },
}));
