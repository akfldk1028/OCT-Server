// renderer/stores/rendererMCPProxy.ts
import { createStore } from 'zustand/vanilla';
import { MCPProxyState } from './rendererMCPProxy-type';

export const rendererMCPProxy = createStore<MCPProxyState>((set, get) => ({
  servers: new Map(),
  tools: new Map(),

  // Transport
  createTransport: async (serverId, config) => {
    const result = await window.electron.ipcRenderer.invoke('transport:create', serverId, config);
    if (!result.success) throw new Error(result.error);
    return result.transportId;
  },

  closeTransport: async (transportId) => {
    const result = await window.electron.ipcRenderer.invoke('transport:close', transportId);
    if (!result.success) throw new Error(result.error);
  },

  // Client
  createClient: async (sessionId, name, capabilities) => {
    const result = await window.electron.ipcRenderer.invoke('client:create', sessionId, name, capabilities);
    if (!result.success) throw new Error(result.error);
    return result.clientId;
  },

  connectClient: async (clientId, transportId) => {
    const result = await window.electron.ipcRenderer.invoke('client:connect', clientId, transportId);
    if (!result.success) throw new Error(result.error);
  },

  sendRequest: async (clientId, request, schema) => {
    const result = await window.electron.ipcRenderer.invoke('client:sendRequest', clientId, request, schema);
    if (!result.success) throw new Error(result.error);
    return result.response;
  },

  // Registry
  registerServer: async (server) => {
    const result = await window.electron.ipcRenderer.invoke('mcpRegistry:registerServer', server);
    if (!result.success) throw new Error(result.error);

    // Update local cache
    set(state => ({
      servers: new Map(state.servers).set(server.id, server)
    }));
  },

  refreshTools: async (serverId) => {
    const result = await window.electron.ipcRenderer.invoke('mcpRegistry:refreshTools', serverId);
    if (!result.success) throw new Error(result.error);

    // Update local cache
    set(state => {
      const tools = new Map(state.tools);
      result.tools.forEach((tool: any) => {
        tools.set(tool.name, tool);
      });
      return { tools };
    });

    return result.tools;
  },

  executeTool: async (toolName, args) => {
    const result = await window.electron.ipcRenderer.invoke('mcpRegistry:executeTool', toolName, args);
    if (!result.success) throw new Error(result.error);
    return result.result;
  },

  // Room/Session
  createRoom: async (name) => {
    const result = await window.electron.ipcRenderer.invoke('room:create', name);
    if (!result.success) throw new Error(result.error);
    return result.roomId;
  },

  createSession: async (roomId) => {
    const result = await window.electron.ipcRenderer.invoke('session:create', roomId);
    if (!result.success) throw new Error(result.error);
    return result.sessionId;
  },

  // Integrated
  connectMCPServer: async (config) => {
    const result = await window.electron.ipcRenderer.invoke('mcp:connectServer', config);
    if (!result.success) throw new Error(result.error);

    // Refresh local cache
    await get().getStatus();

    return result;
  },

  getStatus: async () => {
    const status = await window.electron.ipcRenderer.invoke('mcp:getStatus');

    // Update local cache
    set(state => {
      const servers = new Map();
      const tools = new Map();

      status.servers.forEach((s: any) => servers.set(s.id, s));
      status.tools.forEach((t: any) => tools.set(t.name, t));

      return { servers, tools };
    });

    return status;
  }
}));
