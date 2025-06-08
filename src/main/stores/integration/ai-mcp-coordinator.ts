// main/stores/integration/ai-mcp-coordinator.ts
import { createStore } from 'zustand/vanilla';
import { v4 as uuidv4 } from 'uuid';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { mcpRegistryStore } from '../mcp/mcpRegistryStore';
import { transportStore } from '../transport/transportStore';
import { clientStore } from '../client/clientStore';
import { chatStore } from '../chat/chatStore';
import { RegisteredTool } from '../mcp/mcpRegistry-type';

interface MCPBinding {
  id: string;
  sessionId: string;
  serverId: string;
  clientId: string;
  transportSessionId: string;
  status: 'active' | 'inactive' | 'error';
  error?: string;
  createdAt: string;
}

export interface MCPCoordinatorState {
  sessionBindings: Record<string, MCPBinding[]>;
  activeToolCalls: Record<
    string,
    {
      sessionId: string;
      toolName: string;
      startTime: string;
      status: 'running' | 'completed' | 'failed';
    }
  >;

  // Actions
  connectMCPToSession: (payload: {
    sessionId: string;
    serverId: string;
  }) => Promise<string>;
  disconnectMCPFromSession: (payload: {
    sessionId: string;
    bindingId: string;
  }) => Promise<void>;
  executeToolForSession: (payload: {
    sessionId: string;
    toolName: string;
    args: any;
  }) => Promise<any>;
  getSessionTools: (payload: {
    sessionId: string;
  }) => Promise<RegisteredTool[]>;
  cleanupSession: (payload: { sessionId: string }) => Promise<void>;
  // Getters
  getSessionBindings: (payload: { sessionId: string }) => MCPBinding[];
  isServerConnectedToSession: (payload: {
    sessionId: string;
    serverId: string;
  }) => boolean;
  pingMCPServer: (payload: {
    sessionId: string;
    serverId: string;
  }) => Promise<{ success: boolean; latency: number }>;
}

export const mcpCoordinatorStore = createStore<MCPCoordinatorState>(
  (set, get) => ({
    sessionBindings: {},
    activeToolCalls: {},

    connectMCPToSession: async (payload) => {
      const { sessionId, serverId } = payload;
      let client = null;
      let transport = null;
      let clientId = '';
      let transportSessionId = '';
      
      try {
        console.log(`🔗 Connecting MCP server ${serverId} to session ${sessionId}`);
    
        // 이미 연결되어 있는지 확인
        if (get().isServerConnectedToSession({ sessionId, serverId })) {
          console.log(`Already connected: ${serverId} to session ${sessionId}`);
          const existingBinding = get().getSessionBindings({ sessionId })
            .find(b => b.serverId === serverId && b.status === 'active');
          return existingBinding?.id || '';
        }
    
        // 1. MCP Registry에서 서버 정보 가져오기
        const server = mcpRegistryStore.getState().servers[serverId];
        if (!server) {
          throw new Error(`Server ${serverId} not found in registry`);
        }
        
        console.log('🖥️ [MCP-Coordinator] 서버 정보:', {
          name: server.name,
          command: server.command,
          args: server.args,
          transportType: server.transportType
        });

        // 2. Transport 생성 (에러 처리 강화)
        console.log('🚀 Creating transport...');
        try {
          transportSessionId = await transportStore.getState().createTransport({
            serverId,
            config: {
              transportType: server.transportType,
              command: server.command,
              args: server.args,
              env: server.env,
              url: server.url,
            },
          });
          console.log(`✅ Transport created: ${transportSessionId} for server ${serverId}`);
        } catch (transportError) {
          console.error('❌ Transport 생성 실패:', transportError);
          throw new Error(`Transport creation failed: ${transportError instanceof Error ? transportError.message : 'Unknown error'}`);
        }

        // 3. Client 생성 (에러 처리 강화)
        try {
          clientId = clientStore.getState().createClient({
            sessionId,
            name: `${sessionId}-${serverId}`,
            capabilities: {
              sampling: {},
              roots: { listChanged: true },
              experimental: {},
            },
          });
          console.log(`👤 Client created: ${sessionId}-${serverId} (${clientId})`);
        } catch (clientError) {
          console.error('❌ Client 생성 실패:', clientError);
          throw new Error(`Client creation failed: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`);
        }

        // 4. Transport 가져오기
        transport = transportStore.getState().getTransport({ sessionId: transportSessionId });
        if (!transport) {
          throw new Error('Transport not found after creation');
        }

        // 5. Client 인스턴스 생성 및 연결 (타임아웃 추가)
        client = new Client(
          {
            name: `${sessionId}-${serverId}`,
            version: '1.0.0',
          },
          {
            capabilities: {
              sampling: {},
              roots: { listChanged: true },
              experimental: {},
            },
          },
        );

        console.log('🔌 Connecting client to transport...');
        
        // 🔥 연결 타임아웃 추가 (5초)
        const connectPromise = client.connect(transport);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000);
        });
        
        await Promise.race([connectPromise, timeoutPromise]);
        console.log('✅ Client connected to transport');

        // 6. setupNotificationHandlers를 통해 client 인스턴스 저장 (에러 처리)
        try {
          clientStore.getState().setupNotificationHandlers({ clientId, client });
          console.log('📡 Notification handlers setup complete');
        } catch (handlerError) {
          console.warn('⚠️ Notification handlers setup failed, continuing:', handlerError);
          // 핸들러 설정 실패는 치명적이지 않으므로 계속 진행
        }

        // 7. Store 상태 업데이트 (직렬화 안전)
        try {
          clientStore.getState().updateClientStatus({
            clientId,
            status: 'connected',
            error: undefined,
          });

          // serverCapabilities 저장 (안전한 방식)
          const serverCapabilities = client.getServerCapabilities?.() || {};
          clientStore.getState().updateClient({
            clientId,
            updates: {
              serverCapabilities: JSON.parse(JSON.stringify(serverCapabilities)), // 깊은 복사로 안전하게
            },
          });
          
          console.log('📊 Client status updated to connected');
        } catch (updateError) {
          console.warn('⚠️ Client status update failed:', updateError);
        }

        // 8. mcpRegistryStore에 서버 정보 업데이트 (clientId 추가)
        try {
          mcpRegistryStore.getState().registerServer({
            ...server,
            clientId,
            status: 'connected',
          });
          console.log('🔧 Registry server status updated');
        } catch (registryError) {
          console.warn('⚠️ Registry update failed:', registryError);
        }

        // 9. 바인딩 정보 저장
        const bindingId = `Binding-${uuidv4()}`;
        const binding: MCPBinding = {
          id: bindingId,
          sessionId,
          serverId,
          clientId,
          transportSessionId,
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        // 상태 업데이트 (안전하게)
        try {
          set((state) => ({
            sessionBindings: {
              ...state.sessionBindings,
              [sessionId]: [...(state.sessionBindings[sessionId] || []), binding],
            },
          }));
          
          console.log(`🎉 MCP connection successful: ${server.name} → Session ${sessionId}`);
          return bindingId;
          
        } catch (stateError) {
          console.error('❌ State update failed:', stateError);
          throw new Error(`State update failed: ${stateError instanceof Error ? stateError.message : 'Unknown error'}`);
        }

      } catch (error) {
        console.error(`❌ Failed to connect MCP: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // 정리 작업 (중요!)
        try {
          if (client) {
            await client.close();
            console.log('🧹 Client closed during cleanup');
          }
        } catch (closeError) {
          console.warn('⚠️ Client cleanup failed:', closeError);
        }
        
        try {
          if (clientId) {
            clientStore.getState().updateClientStatus({
              clientId,
              status: 'error',
              error: error instanceof Error ? error.message : 'Connection failed',
            });
          }
        } catch (cleanupError) {
          console.warn('⚠️ Client status cleanup failed:', cleanupError);
        }
        
        try {
          if (transportSessionId) {
            await transportStore.getState().closeTransport({ sessionId: transportSessionId });
            console.log('🧹 Transport closed during cleanup');
          }
        } catch (transportCleanupError) {
          console.warn('⚠️ Transport cleanup failed:', transportCleanupError);
        }

        // 에러를 다시 던지지 않고 빈 문자열 반환 (연결 실패를 허용)
        console.log('🔄 Connection failed, but continuing...');
        return '';
      }
    },

    disconnectMCPFromSession: async (payload) => {
      const { sessionId, bindingId } = payload;
      const bindings = get().sessionBindings[sessionId] || [];
      const binding = bindings.find((b) => b.id === bindingId);
      if (!binding || binding.status !== 'active') return;

      try {
        // Client 연결 해제
        await (clientStore.getState().disconnectClient as any)({
          clientId: binding.clientId,
        });
        await (clientStore.getState().deleteClient as any)({
          clientId: binding.clientId,
        });

        // Transport 종료
        await transportStore
          .getState()
          .closeTransport({ sessionId: binding.transportSessionId });

        // 바인딩 상태 업데이트
        set((state) => ({
          sessionBindings: {
            ...state.sessionBindings,
            [sessionId]: state.sessionBindings[sessionId].map((b) =>
              b.id === bindingId ? { ...b, status: 'inactive' as const } : b,
            ),
          },
        }));

        // 🔄 바인딩 클린업: inactive, error 바인딩 제거
        set((state) => ({
          sessionBindings: {
            ...state.sessionBindings,
            [sessionId]: (state.sessionBindings[sessionId] || []).filter(
              (b) => b.status === 'active',
            ),
          },
        }));

        // ChatStore에서 도구 제거
        const tools = mcpRegistryStore
          .getState()
          .getServerTools(binding.serverId);
        const config = chatStore.getState().getConfig(sessionId);
        if (config) {
          chatStore.getState().updateConfig({
            sessionId,
            config: {
              activeTools: (config.activeTools || []).filter(
                (t: string) => !tools.some((tool: any) => tool.name === t),
              ),
            },
          });
        }

        console.log(
          `✅ MCP disconnected: ${binding.serverId} from session ${sessionId}`,
        );
      } catch (error) {
        console.error(`Failed to disconnect MCP:`, error);
        throw error;
      }
    },

    // 도구 실행 - mcpRegistryStore 활용
    executeToolForSession: async (payload) => {
      const { sessionId, toolName, args } = payload;
      
      console.log(`🚀 [mcp_coordinator.executeToolForSession] 호출됨!`);
      console.log(`📋 sessionId: ${sessionId}`);
      console.log(`🔧 toolName: ${toolName}`);
      console.log(`📦 args:`, args);
      
      // 도구가 등록되어 있는지 확인
      const tool = mcpRegistryStore.getState().getTool(toolName);
      if (!tool) {
        console.error(`❌ Tool not found in registry: ${toolName}`);
        throw new Error(`Tool ${toolName} not found in registry`);
      }
      
      console.log(`✅ Tool found:`, tool);
      console.log(`🔗 Tool server: ${tool.serverId} (${tool.serverName})`);
      
      // mcpRegistryStore의 executeTool 사용
      console.log(`📤 Calling mcpRegistryStore.executeTool...`);
      const result = await mcpRegistryStore.getState().executeTool(toolName, args);
      console.log(`📨 Result from mcpRegistryStore.executeTool:`, result);
      
      return result;
    },

    getSessionTools: async (payload) => {
      const { sessionId } = payload;
      const bindings = get().sessionBindings[sessionId] || [];
      const allTools: RegisteredTool[] = [];
    
      for (const binding of bindings.filter(b => b.status === 'active')) {
        const serverTools = mcpRegistryStore
          .getState()
          .getServerTools(binding.serverId);
        allTools.push(...serverTools);
      }
    
      // 🔥 도구 이름 중복 제거 - 첫 번째로 등록된 도구만 유지
      const uniqueTools: RegisteredTool[] = [];
      const seenToolNames = new Set<string>();
      
      for (const tool of allTools) {
        if (!seenToolNames.has(tool.name)) {
          seenToolNames.add(tool.name);
          uniqueTools.push(tool);
        } else {
          console.warn(`⚠️ [getSessionTools] 중복된 도구 이름 발견, 건너뛰기: ${tool.name} (서버: ${tool.serverName})`);
        }
      }
      
      console.log(`🔧 [getSessionTools] 전체 도구: ${allTools.length}개, 중복 제거 후: ${uniqueTools.length}개`);
      return uniqueTools;
    },
    
    cleanupSession: async (payload) => {
      const { sessionId } = payload;
      const bindings = get().sessionBindings[sessionId] || [];

      // 모든 활성 연결 해제
      await Promise.all(
        bindings
          .filter((b) => b.status === 'active')
          .map((b) =>
            get().disconnectMCPFromSession({ sessionId, bindingId: b.id }),
          ),
      );

      // 바인딩 정보 삭제
      set((state) => {
        const { [sessionId]: removed, ...sessionBindings } =
          state.sessionBindings;
        return { sessionBindings };
      });

      console.log(`🧹 Session cleaned up: ${sessionId}`);
    },

    getSessionBindings: (payload) => {
      const { sessionId } = payload;
      return get().sessionBindings[sessionId] || [];
    },

    isServerConnectedToSession: (payload) => {
      const { sessionId, serverId } = payload;
      const bindings = get().sessionBindings[sessionId] || [];
      return bindings.some(
        (b) => b.serverId === serverId && b.status === 'active',
      );
    },

    // Ping 메서드 추가
    pingMCPServer: async (payload: { sessionId: string; serverId: string }) => {
      const { sessionId, serverId } = payload;
      const bindings = get().sessionBindings[sessionId] || [];
      const binding = bindings.find(
        (b) => b.serverId === serverId && b.status === 'active',
      );

      if (!binding) throw new Error('Server not connected');

      try {
        const startTime = Date.now();

        // 간단한 도구 목록 요청으로 ping 테스트
        await clientStore.getState().sendRequest({
          clientId: binding.clientId,
          request: { method: 'tools/list', params: {} },
          schema: ListToolsResultSchema, // 응답 스키마 사용
          options: { timeout: 5000 }
        });

        const latency = Date.now() - startTime;

        console.log(`🏓 Ping successful: ${serverId} - ${latency}ms`);
        return { success: true, latency };
      } catch (error) {
        console.error(`❌ Ping failed: ${serverId}`, error);

        // 연결 실패시 상태 업데이트
        set((state) => ({
          sessionBindings: {
            ...state.sessionBindings,
            [sessionId]: state.sessionBindings[sessionId].map((b) =>
              b.id === binding.id
                ? { ...b, status: 'error' as const, error: 'Ping failed' }
                : b,
            ),
          },
        }));

        throw error;
      }
    },
  }),
);
