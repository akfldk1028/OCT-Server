// main/stores/proxy/proxy-types.ts
import {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";

export interface ProxyConnection {
  id: string;
  clientTransport: Transport;
  serverTransport: Transport;
  status: 'active' | 'closed';
  createdAt: string;
}

export interface ProxyState {
  connections: Record<string, ProxyConnection>;

  createProxy: (clientTransport: Transport, serverTransport: Transport) => string;
  closeProxy: (proxyId: string) => Promise<void>;
  getProxy: (proxyId: string) => ProxyConnection | undefined;
}
