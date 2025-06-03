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
      try {
        console.log(
          `🔗 Connecting MCP server ${serverId} to session ${sessionId}`,
        );
    
        // 이미 연결되어 있는지 확인
        if (get().isServerConnectedToSession({ sessionId, serverId })) {
          console.log(`Already connected: ${serverId} to session ${sessionId}`);
          return '';
        }
    
        // 1. MCP Registry에서 서버 정보 가져오기
        const server = mcpRegistryStore.getState().servers[serverId];
        if (!server) throw new Error(`Server ${serverId} not found`);
    
        // 2. Transport 생성
        console.log('🚀 Creating transport...');
        const transportSessionId = await transportStore
          .getState()
          .createTransport({
            serverId,
            config: {
              transportType: server.transportType,
              command: server.command,
              args: server.args,
              env: server.env,
              url: server.url,
            },
          });
    
        // 3. Client 생성
        const clientId = clientStore.getState().createClient({
          sessionId,
          name: `${sessionId}-${serverId}`,
          capabilities: {
            sampling: {},
            roots: { listChanged: true },
            experimental: {},
          },
        });
    
        // 4. Transport 가져오기
        const transport = transportStore.getState().getTransport({ sessionId: transportSessionId });
        if (!transport) throw new Error('Transport not found');
    
        // 5. Client 인스턴스 생성 및 연결
        const client = new Client(
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
        await client.connect(transport);
        console.log('✅ Client connected to transport');
    
        // 🔑 핵심: setupNotificationHandlers를 통해 client 인스턴스 저장
        clientStore.getState().setupNotificationHandlers({ clientId, client });
    
        // Store에는 직렬화 가능한 데이터만 저장
        clientStore.getState().updateClientStatus({
          clientId,
          status: 'connected',
          error: undefined,
        });
    
        // serverCapabilities 저장
        clientStore.getState().updateClient({
          clientId,
          updates: {
            serverCapabilities: client.getServerCapabilities?.() || {},
          },
        });
    
        // 6. ✨ mcpRegistryStore에 서버 정보 업데이트 (clientId 추가)
        mcpRegistryStore.getState().registerServer({
          ...server,
          clientId,
          status: 'connected',
        });
    
        // 7. 바인딩 정보 저장
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
    

        // 각 store의 set 호출 전에 디버깅 추가
          set((state) => {
            console.log('🔍 Setting state for store:', 'clientStore'); // store 이름 명시
            console.log('📦 State keys:', Object.keys(state));
            
            // 직렬화 불가능한 객체 찾기
            Object.entries(state).forEach(([key, value]) => {
              if (value && typeof value === 'object') {
                if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
                  console.error(`❌ Non-serializable object found in ${key}:`, value.constructor.name);
                }
              }
            });
            
            return {
              sessionBindings: {
                ...state.sessionBindings,
                [sessionId]: [...(state.sessionBindings[sessionId] || []), binding],
              },
            };
          });
        // set((state) => ({
        //   sessionBindings: {
        //     ...state.sessionBindings,
        //     [sessionId]: [...(state.sessionBindings[sessionId] || []), binding],
        //   },
        // }));

        

        
        // 8. ✨ mcpRegistryStore를 통해 capabilities 발견
        console.log('🔧 Discovering server capabilities...');
        const capabilities = await mcpRegistryStore
          .getState()
          .discoverServerCapabilities(serverId);
        
        console.log(
          `✅ Discovered ${capabilities.tools.length} tools, ${capabilities.prompts.length} prompts`,
        );
    
        // 9. ChatStore에 활성 도구 업데이트
        const config = chatStore.getState().getConfig(sessionId);
        if (config && capabilities.tools.length > 0) {
          const newActiveTools = [
            ...new Set([
              ...(config.activeTools || []),
              ...capabilities.tools.map(t => t.name),
            ]),
          ];
          
          chatStore.getState().updateConfig({
            sessionId,
            config: {
              activeTools: newActiveTools,
            },
          });
          
          console.log(
            '🛠️ [chatStore.configs] activeTools 업데이트 후:',
            chatStore.getState().configs[sessionId],
          );
        }
    
        console.log(`✅ MCP connected: ${serverId} to session ${sessionId}`);
        return bindingId;
      } catch (error) {
        console.error(`❌ Failed to connect MCP:`, error);
    
        // 에러 바인딩 저장
        const bindingId = `Binding-${uuidv4()}`;
        set((state) => ({
          sessionBindings: {
            ...state.sessionBindings,
            [sessionId]: [
              ...(state.sessionBindings[sessionId] || []),
              {
                id: bindingId,
                sessionId,
                serverId,
                clientId: '',
                transportSessionId: '',
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }));
    
        throw error;
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
      const tools: RegisteredTool[] = [];
    
      for (const binding of bindings.filter(b => b.status === 'active')) {
        const serverTools = mcpRegistryStore
          .getState()
          .getServerTools(binding.serverId);
        tools.push(...serverTools);
      }
    
      return tools;
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
