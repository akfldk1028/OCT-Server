// main/stores/mcp/mcpRegistryStore.ts
import { createStore } from 'zustand/vanilla';
import {
  Tool,
  Prompt,
  Resource,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourcesResultSchema,
  ListPromptsResultSchema,
  ListToolsResultSchema,
  CallToolRequestSchema,
  CallToolResultSchema,
  GetPromptRequestSchema,
  GetPromptResultSchema,
  ReadResourceRequestSchema,
  ReadResourceResultSchema,
  ReadResourceResult,
  ListToolsResult,
  ListPromptsResult,
  ListResourcesResult,
} from '@modelcontextprotocol/sdk/types.js';
import { clientStore } from '../client/clientStore';
import { DEFAULT_MCP_SERVERS } from './defaultServers';
import {
  MCPRegistryState,
  RegisteredPrompt,
  RegisteredResource,
  RegisteredTool,
  MCPServer,
} from './mcpRegistry-type';

export const mcpRegistryStore = createStore<MCPRegistryState>((set, get) => ({
  // Initial State - Map과 Set을 Record와 배열로 변경
  servers: {},
  tools: {},
  prompts: {},
  resources: {},
  toolCategories: ['general', 'data', 'web', 'system', 'development'],
  promptCategories: ['general', 'coding', 'writing', 'analysis'],

  // Initialize Default Servers
  initializeDefaultServers: () => {
    console.log('🚀 Initializing default MCP servers...');

    DEFAULT_MCP_SERVERS.forEach(serverConfig => {
      const server: MCPServer = {
        id: serverConfig.id,
        name: serverConfig.name,
        description: serverConfig.description,
        transportType: serverConfig.transportType,
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env || {},
        // url: serverConfig.url,
        capabilities: serverConfig.capabilities,
        autoConnect: serverConfig.autoConnect,
        clientId: '',
        status: 'disconnected',
      };

      set(state => ({
        servers: {
          ...state.servers,
          [server.id]: server,
        },
      }));

      console.log(`✅ Registered: ${server.name}`);
    });
},

  // Register Server
  registerServer: (server) => {
    set((state) => ({
      servers: {
        ...state.servers,
        [server.id]: server,
      },
    }));
    
    // 연결되면 자동으로 도구/프롬프트 발견
    if (server.status === 'connected' && server.clientId) {
      get().discoverServerCapabilities(server.id).catch(console.error);
    }
  },

  // Unregister Server
  unregisterServer: (serverId) => {
    set((state) => {
      const { [serverId]: deletedServer, ...servers } = state.servers;

      // Remove associated tools, prompts, resources
      const tools = { ...state.tools };
      const prompts = { ...state.prompts };
      const resources = { ...state.resources };

      Object.entries(tools).forEach(([name, tool]) => {
        if (tool.serverId === serverId) delete tools[name];
      });

      Object.entries(prompts).forEach(([name, prompt]) => {
        if (prompt.serverId === serverId) delete prompts[name];
      });

      Object.entries(resources).forEach(([uri, resource]) => {
        if (resource.serverId === serverId) delete resources[uri];
      });

      return { servers, tools, prompts, resources };
    });
  },

  // Update Server Status
  updateServerStatus: (serverId, status) => {
    set((state) => ({
      servers: {
        ...state.servers,
        [serverId]: {
          ...state.servers[serverId],
          status,
        },
      },
    }));
  },

  // Discover Server Capabilities
  // 서버의 capabilities 발견 및 등록
  discoverServerCapabilities: async (serverId) => {
    const server = get().servers[serverId];
    if (!server || !server.clientId) throw new Error('Server not found or not connected');

    try {
      // 1. Tools 가져오기
      if (server.capabilities.tools) {
        const toolsResponse = await clientStore.getState().sendRequest({
          clientId: server.clientId,
          request: { 
            method: 'tools/list',
            params: {}
          },
          schema: ListToolsResultSchema, // 응답 스키마 사용
          options: { timeout: 5000 }
        });

        // mcpRegistryStore에 도구 등록
        toolsResponse.tools.forEach((tool: Tool) => {
          console.log(`🔍 원본 Tool 데이터:`, tool); // 디버깅용
          console.log(`🔍 Tool inputSchema:`, tool.inputSchema); // 스키마 확인
          
          const registered: RegisteredTool = {
            ...tool,
            serverId,
            serverName: server.name,
            category: 'general',
            usage: { count: 0 },
          };
          
          console.log(`✅ 등록된 Tool:`, registered); // 등록 후 확인
          
          set((state) => ({
            tools: {
              ...state.tools,
              [tool.name]: registered,
            },
          }));
        });

        console.log(`🔧 Registered ${toolsResponse.tools.length} tools from ${server.name}`);
      }

      // 2. Prompts 가져오기
      if (server.capabilities.prompts) {
        const promptsResponse = await clientStore.getState().sendRequest({
          clientId: server.clientId,
          request: { method: 'prompts/list', params: {} },
          schema: ListPromptsResultSchema, // 응답 스키마 사용
        });

        // mcpRegistryStore에 프롬프트 등록
        promptsResponse.prompts.forEach((prompt: Prompt) => {
          const registered: RegisteredPrompt = {
            ...prompt,
            serverId,
            serverName: server.name,
            category: 'general',
          };
          
          set((state) => ({
            prompts: {
              ...state.prompts,
              [prompt.name]: registered,
            },
          }));
        });

        console.log(`📝 Registered ${promptsResponse.prompts.length} prompts from ${server.name}`);
      }


        // 3. Resources 가져오기

      const resources: RegisteredResource[] = [];
      if (server.capabilities.resources) {
        try {
          const resourcesResponse = await clientStore.getState().sendRequest({
            clientId: server.clientId,
            request: { method: 'resources/list', params: {} },
            schema: ListResourcesResultSchema, // 응답 스키마 사용
          });
    
          resourcesResponse.resources.forEach((resource: Resource) => {
            const registered: RegisteredResource = {
              ...resource,
              serverId,
              serverName: server.name,
            };
            
            set((state) => ({
              resources: {
                ...state.resources,
                [resource.uri]: registered,
              },
            }));
            
            resources.push(registered);
          });
    
          console.log(`📄 Registered ${resourcesResponse.resources.length} resources from ${server.name}`);
        } catch (error) {
          console.error(`Failed to get resources for ${serverId}:`, error);
        }
      }
// 실제 구현에서는
    return {
      tools: get().getServerTools(serverId),  // ✅ RegisteredTool[] 반환
      prompts: Object.values(get().prompts).filter(p => p.serverId === serverId), // ✅ RegisteredPrompt[] 반환
      resources: Object.values(get().resources).filter(r => r.serverId === serverId), // ✅ RegisteredResource[] 반환
    };
    } catch (error) {
      console.error(`Failed to discover capabilities for ${serverId}:`, error);
      throw error;
    }
  },

  // Refresh Tools
  refreshTools: async (serverId) => {
    const server = get().servers[serverId];
    if (!server || !clientStore.getState().getClient({ clientId: server.clientId })) return;

    try {
      const response = await clientStore.getState().sendRequest<ListToolsResult>({
        clientId: server.clientId,
        request: {
          method: 'tools/list',
          params: {},
        },
        schema: ListToolsResultSchema,
      });

      set((state) => {
        const tools = { ...state.tools };

        // Remove old tools from this server
        Object.entries(tools).forEach(([name, tool]) => {
          if (tool.serverId === serverId) delete tools[name];
        });

        // Add new tools
        response.tools.forEach((tool: Tool) => {
          const registered: RegisteredTool = {
            ...tool,
            serverId,
            serverName: server.name,
            category: 'general',
            usage: {
              count: 0,
            },
          };
          tools[tool.name] = registered;
        });

        return { tools };
      });

      console.log(
        `🔧 Refreshed ${response.tools.length} tools from ${server.name}`,
      );
    } catch (error) {
      console.error(`Failed to refresh tools for ${serverId}:`, error);
      throw error;
    }
  },

  // Execute Tool
  executeTool: async (toolName, args) => {
    console.log(`🚀 [mcpRegistryStore.executeTool] 호출됨!`);
    console.log(`🔧 toolName: ${toolName}`);
    console.log(`📦 args:`, args);
    
    const tool = get().tools[toolName];
    if (!tool) {
      console.error(`❌ Tool not found in registry: ${toolName}`);
      console.log(`📋 Available tools:`, Object.keys(get().tools));
      throw new Error(`Tool not found: ${toolName}`);
    }

    console.log(`✅ Tool found:`, tool);
    
    const server = get().servers[tool.serverId];
    if (!server) {
      console.error(`❌ Server not found: ${tool.serverId}`);
      console.log(`📋 Available servers:`, Object.keys(get().servers));
      throw new Error('Server not found');
    }

    console.log(`✅ Server found:`, server);
    console.log(`🔗 Using clientId: ${server.clientId}`);

    const startTime = Date.now();

    try {
      console.log(`📤 Sending request to clientStore.sendRequest...`);
      console.log(`📋 Request details:`, {
        clientId: server.clientId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        }
      });
      
      const result = await clientStore.getState().sendRequest({
        clientId: server.clientId,
        request: {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },  
        },
        schema: CallToolResultSchema, // ✅ 응답 스키마 사용
      });
      
      console.log(`📨 Raw result from sendRequest:`, result);

      // Update usage stats
      const latency = Date.now() - startTime;
      set((state) => {
        const tool = state.tools[toolName];
        if (tool && tool.usage) {
          return {
            tools: {
              ...state.tools,
              [toolName]: {
                ...tool,
                usage: {
                  count: tool.usage.count + 1,
                  lastUsed: new Date().toISOString(),
                  averageLatency: tool.usage.averageLatency
                    ? (tool.usage.averageLatency * tool.usage.count + latency) /
                      (tool.usage.count + 1)
                    : latency,
                },
              },
            },
          };
        }
        return state;
      });

      return result;
    } catch (error) {
      console.error(`Failed to execute tool ${toolName}:`, error);
      throw error;
    }
  },

  // Get Tools by Category
  getToolsByCategory: (category) => {
    return Object.values(get().tools).filter(
      (tool) => tool.category === category,
    );
  },

  // Get Server Tools
  getServerTools: (serverId) => {
    return Object.values(get().tools).filter(
      (tool) => tool.serverId === serverId,
    );
  },

  // Search Tools
  searchTools: (query) => {
    const lowerQuery = query.toLowerCase();
    return Object.values(get().tools).filter(
      (tool) =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description?.toLowerCase().includes(lowerQuery),
    );
  },

  // Refresh Prompts
  refreshPrompts: async (serverId) => {
    const server = get().servers[serverId];
    if (!server || !clientStore.getState().getClient({ clientId: server.clientId })) return;

    try {
      const response = await clientStore.getState().sendRequest<ListPromptsResult>({
        clientId: server.clientId,
        request: {
          method: 'prompts/list',
          params: {},
        },
        schema: ListPromptsResultSchema,
      });

      set((state) => {
        const prompts = { ...state.prompts };

        // Remove old prompts from this server
        Object.entries(prompts).forEach(([name, prompt]) => {
          if (prompt.serverId === serverId) delete prompts[name];
        });

        // Add new prompts
        response.prompts.forEach((prompt: Prompt) => {
          const registered: RegisteredPrompt = {
            ...prompt,
            serverId,
            serverName: server.name,
            category: 'general',
          };
          prompts[prompt.name] = registered;
        });

        return { prompts };
      });

      console.log(
        `📝 Refreshed ${response.prompts.length} prompts from ${server.name}`,
      );
    } catch (error) {
      console.error(`Failed to refresh prompts for ${serverId}:`, error);
      throw error;
    }
  },

  // Get Prompt - SDK 표준 반환
  getPrompt: async (promptName, args) => {
    const prompt = get().prompts[promptName];
    if (!prompt) throw new Error(`Prompt not found: ${promptName}`);

    const server = get().servers[prompt.serverId];
    if (!server) throw new Error('Server not found');

    try {
      const response = await clientStore.getState().sendRequest({
        clientId: server.clientId,
        request: {
          method: 'prompts/get',
          params: { name: promptName, arguments: args },
        },
        schema: GetPromptResultSchema, // ✅ 응답 스키마 사용
      });

      // ✅ SDK 표준: GetPromptResult 객체 그대로 반환
      return response;
    } catch (error) {
      console.error(`Failed to get prompt ${promptName}:`, error);
      throw error;
    }
  },

  // Get Prompts by Category
  getPromptsByCategory: (category) => {
    return Object.values(get().prompts).filter(
      (prompt) => prompt.category === category,
    );
  },

  // Refresh Resources
  refreshResources: async (serverId) => {
    const server = get().servers[serverId];
    if (!server || !clientStore.getState().getClient({ clientId: server.clientId })) return;

    try {
      const response = await clientStore.getState().sendRequest<ListResourcesResult>({
        clientId: server.clientId,
        request: {
          method: 'resources/list',
          params: {},
        },
        schema: ListResourcesResultSchema,
      });

      set((state) => {
        const resources = { ...state.resources };

        // Remove old resources from this server
        Object.entries(resources).forEach(([uri, resource]) => {
          if (resource.serverId === serverId) delete resources[uri];
        });

        // Add new resources
        response.resources.forEach((resource: Resource) => {
          const registered: RegisteredResource = {
            ...resource,
            serverId,
            serverName: server.name,
          };
          resources[resource.uri] = registered;
        });

        return { resources };
      });

      console.log(
        `📄 Refreshed ${response.resources.length} resources from ${server.name}`,
      );
    } catch (error) {
      console.error(`Failed to refresh resources for ${serverId}:`, error);
      throw error;
    }
  },

  // Read Resource - SDK 표준 반환
  readResource: async (resourceUri) => {
    const resource = get().resources[resourceUri];
    if (!resource) throw new Error(`Resource not found: ${resourceUri}`);

    const server = get().servers[resource.serverId];
    if (!server) throw new Error('Server not found');

    try {
      const response = await clientStore.getState().sendRequest({
        clientId: server.clientId,
        request: {
          method: 'resources/read',
          params: { uri: resourceUri },
        },
        schema: ReadResourceResultSchema, // ✅ 응답 스키마 사용
      });

      // ✅ SDK 표준: ReadResourceResult 객체 그대로 반환
      return response;
    } catch (error) {
      console.error(`Failed to read resource ${resourceUri}:`, error);
      throw error;
    }
  },

  // Refresh All Servers
  refreshAllServers: async () => {
    const servers = Object.values(get().servers);

    await Promise.all(
      servers.map((server) =>
        get().discoverServerCapabilities(server.id).catch(console.error),
      ),
    );
  },

  // Utilities
  getServer: (serverId) => get().servers[serverId],
  getTool: (toolName) => get().tools[toolName],
  getPromptInfo: (promptName) => get().prompts[promptName],
  getResource: (resourceUri) => get().resources[resourceUri],

  // Get Tool Usage Stats - Map 대신 Record 반환
  getToolUsageStats: () => {
    const stats: Record<string, { count: number; averageLatency: number }> = {};

    Object.entries(get().tools).forEach(([name, tool]) => {
      if (tool.usage && tool.usage.count > 0) {
        stats[name] = {
          count: tool.usage.count,
          averageLatency: tool.usage.averageLatency || 0,
        };
      }
    });

    return stats;
  },
}));
