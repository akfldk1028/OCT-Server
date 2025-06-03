// main/services/mainMCPService.ts
import { ipcMain } from 'electron';
import { transportStore } from '@/main/stores/transport/transportStore';
import { clientStore } from '@/main/stores/client/clientStore';
import { sessionStore } from '@/main/stores/session/sessionStore';
import { roomStore } from '@/main/stores/room/roomStore';
import { mcpRegistryStore } from '@/main/stores/mcp/mcpRegistryStore';
import { contextBridge, ipcRenderer } from 'electron';
import {
  ClientCapabilities,
} from '@modelcontextprotocol/sdk/types.js';
/**
 * Main process에서 실행되는 MCP 서비스
 * Renderer와 IPC로 통신
 */

    // Transport 관련
    ipcMain.handle('transport:create', async (event, serverId: string, config: any) => {
      try {
        const transportId = await transportStore.getState().createTransport(serverId, config);
        console.log('[MainMCPService]', transportId);
        return { success: true, transportId };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('transport:close', async (event, transportId: string) => {
      try {
        await transportStore.getState().closeTransport(transportId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Client 관련
    ipcMain.handle('client:create', async (event, sessionId: string, name: string, capabilities?: any) => {
      try {
        console.log('##sessionId', sessionId);
        console.log('##name', name);
        console.log('##capabilities', capabilities);
        const clientId = clientStore.getState().createClient(sessionId, name, capabilities);
        return { success: true, clientId };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('client:connect', async (event, clientId: string, transportId: string) => {
      try {
        await clientStore.getState().connectClient(clientId, transportId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('client:sendRequest', async (event, clientId: string, request: any, schema: any) => {
      try {
        const response = await clientStore.getState().sendRequest(clientId, request, schema);
        return { success: true, response };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // MCP Registry 관련
    ipcMain.handle('mcpRegistry:registerServer', async (event, server: any) => {
      try {
        mcpRegistryStore.getState().registerServer(server);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('mcpRegistry:refreshTools', async (event, serverId: string) => {
      try {
        await mcpRegistryStore.getState().refreshTools(serverId);
        const tools = Array.from(mcpRegistryStore.getState().tools.values())
          .filter(t => t.serverId === serverId);
        return { success: true, tools };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('mcpRegistry:executeTool', async (event, toolName: string, args: any) => {
      try {
        const result = await mcpRegistryStore.getState().executeTool(toolName, args);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Room 관련 IPC 핸들러
    ipcMain.handle('room:create', async (event, name: string) => {
      try {
        const roomId = roomStore.getState().createRoom(name);
        return { success: true, roomId };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('room:delete', async (event, roomId: string) => {
      try {
        await roomStore.getState().deleteRoom(roomId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('room:get', (event, roomId: string) => {
      try {
        const room = roomStore.getState().getRoom(roomId);
        return { success: true, room };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('room:addSessionToRoom', (event, roomId: string, sessionId: string) => {
      try {
        roomStore.getState().addSessionToRoom(roomId, sessionId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('room:removeSessionFromRoom', (event, roomId: string, sessionId: string) => {
      try {
        roomStore.getState().removeSessionFromRoom(roomId, sessionId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('room:getRoomSessions', (event, roomId: string) => {
      try {
        const sessions = roomStore.getState().getRoomSessions(roomId);
        return { success: true, sessions };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Session 관련 IPC 핸들러
    ipcMain.handle('session:create', async (event, roomId: string) => {
      try {
        const sessionId = sessionStore.getState().createSession(roomId);
        return { success: true, sessionId };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('session:delete', async (event, sessionId: string) => {
      try {
        await sessionStore.getState().deleteSession(sessionId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('session:get', (event, sessionId: string) => {
      try {
        const session = sessionStore.getState().getSession(sessionId);
        return { success: true, session };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('session:addClientToSession', (event, sessionId: string, clientId: string) => {
      try {
        sessionStore.getState().addClientToSession(sessionId, clientId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('session:removeClientFromSession', (event, sessionId: string, clientId: string) => {
      try {
        sessionStore.getState().removeClientFromSession(sessionId, clientId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('session:setTransportId', (event, sessionId: string, transportId: string) => {
      try {
        sessionStore.getState().setTransportId(sessionId, transportId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('session:getSessionClients', (event, sessionId: string) => {
      try {
        const clients = sessionStore.getState().getSessionClients(sessionId);
        return { success: true, clients };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('session:updateSessionStatus', (event, sessionId: string, status: string) => {
      try {
        // 타입 안전하게 캐스팅
        const validStatus = ['active', 'inactive', 'error'] as const;
        if (!validStatus.includes(status as any)) {
          throw new Error('Invalid status value');
        }
        sessionStore.getState().updateSessionStatus(sessionId, status as 'active' | 'inactive' | 'error');
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // 통합 함수: MCP 서버 연결
    ipcMain.handle('mcp:connectServer', async (event, config: {
      name: string;
      command: string;
      args?: string[];
      roomId?: string;
    }) => {
      try {
        // 1. Room 생성 또는 사용
        const roomId = config.roomId || roomStore.getState().createRoom(config.name);

        // 2. Session 생성
        const sessionId = sessionStore.getState().createSession(roomId);

        // 3. Transport 생성
        const transportId = await transportStore.getState().createTransport(
          config.name,
          {
            transportType: 'stdio',
            command: config.command,
            args: config.args
          }
        );

        // 4. Client 생성 및 연결
        const clientId = clientStore.getState().createClient(
          sessionId,
          config.name,
          { sampling: {}, roots: { listChanged: true } }
        );

        await clientStore.getState().connectClient(clientId, transportId);

        // 5. Registry에 등록
        mcpRegistryStore.getState().registerServer({
          id: sessionId,
          name: config.name,
          clientId,
          capabilities: { tools: true, prompts: true },
          status: 'connected'
        });

        return {
          success: true,
          serverId: sessionId,
          clientId,
          transportId
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // 상태 조회
    ipcMain.handle('mcp:getStatus', async () => {
      const servers = Array.from(mcpRegistryStore.getState().servers.values());
      const tools = Array.from(mcpRegistryStore.getState().tools.values());
      const clients = Array.from(clientStore.getState().clients.values());

      return {
        servers: servers.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status
        })),
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          serverId: t.serverId
        })),
        activeClients: clients.filter(c => c.status === 'connected').length
      };
    });


// main.ts에 추가할 내용
export function setupMCPpreLoad() {
  console.log('MCP handlers setup complete');
}
// Main process에서 초기화
// export const mainMCPService = new MainMCPService();
// export type MCPAPI = typeof mcpAPI;



// // rendererMCPProxy.ts 스타일로 프록시 객체 작성
// export const mcpAPI = {
//   // Transport
//   createTransport: (serverId: string, config: Record<string, any>) => ipcRenderer.invoke('transport:create', serverId, config),
//   closeTransport: (transportId: string) => ipcRenderer.invoke('transport:close', transportId),

//   // Client
//   createClient: (sessionId: string, name: string, capabilities?: ClientCapabilities) => ipcRenderer.invoke('client:create', sessionId, name, capabilities),
//   connectClient: (clientId: string, transportId: string) => ipcRenderer.invoke('client:connect', clientId, transportId),
//   sendRequest: (clientId: string, request: any, schema: any) => ipcRenderer.invoke('client:sendRequest', clientId, request, schema),

//   // Registry
//   registerServer: (server: Record<string, any>) => ipcRenderer.invoke('mcpRegistry:registerServer', server),
//   refreshTools: (serverId: string) => ipcRenderer.invoke('mcpRegistry:refreshTools', serverId),
//   executeTool: (toolName: string, args: any) => ipcRenderer.invoke('mcpRegistry:executeTool', toolName, args),

//   // Room/Session
//   createRoom: (name: string) => ipcRenderer.invoke('room:create', name),
//   createSession: (roomId: string) => ipcRenderer.invoke('session:create', roomId),

//   // Integrated
//   connectMCPServer: (config: { name: string; command: string; args?: string[]; roomId?: string }) => ipcRenderer.invoke('mcp:connectServer', config),
//   getStatus: () => ipcRenderer.invoke('mcp:getStatus'),
// };

