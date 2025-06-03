// machines/mcp-chat-machine.ts
import { createMachine, assign, sendTo, spawn } from 'xstate';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Context 타입 정의
interface MCPChatContext {
  client: Client | null;
  transport: StdioClientTransport | null;
  isConnected: boolean;
  messages: ChatMessage[];
  activeServer: string | null;
  availableTools: Tool[];
  error: string | null;
  pendingMessage: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  timestamp: string;
  metadata?: {
    serverId?: string;
    toolName?: string;
    toolArgs?: any;
    toolResult?: any;
  };
}

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

// 이벤트 타입 정의
type MCPChatEvent =
  | { type: 'CONNECT'; serverId: string; command: string; args?: string[] }
  | { type: 'DISCONNECT' }
  | { type: 'SEND_MESSAGE'; content: string }
  | { type: 'CALL_TOOL'; toolName: string; args: any }
  | { type: 'CONNECTION_SUCCESS'; tools: Tool[] }
  | { type: 'CONNECTION_ERROR'; error: string }
  | { type: 'TOOL_RESPONSE'; result: any }
  | { type: 'AI_RESPONSE'; content: string };

// MCP Chat State Machine
export const mcpChatMachine = createMachine<MCPChatContext, MCPChatEvent>({
  id: 'mcpChat',
  initial: 'disconnected',
  context: {
    client: null,
    transport: null,
    isConnected: false,
    messages: [],
    activeServer: null,
    availableTools: [],
    error: null,
    pendingMessage: null,
  },
  states: {
    disconnected: {
      on: {
        CONNECT: {
          target: 'connecting',
          actions: assign({
            activeServer: (_, event) => event.serverId,
            error: null,
          }),
        },
      },
    },
    connecting: {
      invoke: {
        src: 'connectToServer',
        onDone: {
          target: 'connected',
          actions: assign({
            isConnected: true,
            client: (_, event) => event.data.client,
            transport: (_, event) => event.data.transport,
            availableTools: (_, event) => event.data.tools,
          }),
        },
        onError: {
          target: 'disconnected',
          actions: assign({
            error: (_, event) => event.data.message,
          }),
        },
      },
    },
    connected: {
      on: {
        DISCONNECT: {
          target: 'disconnecting',
        },
        SEND_MESSAGE: {
          target: 'processingMessage',
          actions: assign({
            pendingMessage: (_, event) => event.content,
            messages: (context, event) => [
              ...context.messages,
              {
                id: `msg-${Date.now()}`,
                content: event.content,
                role: 'user',
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        },
      },
    },
    processingMessage: {
      invoke: {
        src: 'processUserMessage',
        onDone: {
          target: 'waitingForAI',
          actions: 'determineToolsToCall',
        },
        onError: {
          target: 'connected',
          actions: assign({
            error: (_, event) => event.data.message,
          }),
        },
      },
    },
    waitingForAI: {
      invoke: {
        src: 'getAIResponse',
        onDone: {
          target: 'connected',
          actions: assign({
            messages: (context, event) => [
              ...context.messages,
              {
                id: `msg-${Date.now()}`,
                content: event.data.content,
                role: 'assistant',
                timestamp: new Date().toISOString(),
                metadata: event.data.metadata,
              },
            ],
            pendingMessage: null,
          }),
        },
        onError: {
          target: 'connected',
          actions: assign({
            error: (_, event) => event.data.message,
          }),
        },
      },
    },
    disconnecting: {
      invoke: {
        src: 'disconnectFromServer',
        onDone: {
          target: 'disconnected',
          actions: assign({
            client: null,
            transport: null,
            isConnected: false,
            activeServer: null,
            availableTools: [],
          }),
        },
      },
    },
  },
});

// Service implementations
export const mcpChatServices = {
  connectToServer: async (context: MCPChatContext, event: any) => {
    const { command, args = [] } = event;

    const transport = new StdioClientTransport({
      command,
      args,
    });

    const client = new Client(
      {
        name: 'mcp-chat-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    // Get available tools
    const toolsResponse = await client.request({
      method: 'tools/list',
    });

    return {
      client,
      transport,
      tools: toolsResponse.tools || [],
    };
  },

  processUserMessage: async (context: MCPChatContext, event: any) => {
    // 여기서 사용자 메시지를 분석하여 필요한 도구를 결정
    const { pendingMessage } = context;

    // 간단한 의도 분석 (실제로는 더 복잡한 NLP 처리 필요)
    const toolsToCall = analyzeMessageIntent(pendingMessage, context.availableTools);

    return { toolsToCall };
  },

  getAIResponse: async (context: MCPChatContext, event: any) => {
    const { client, pendingMessage } = context;

    // 도구 호출이 필요한 경우
    if (event.data?.toolsToCall?.length > 0) {
      const toolResults = [];

      for (const tool of event.data.toolsToCall) {
        const result = await client.request({
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: tool.args,
          },
        });

        toolResults.push({
          tool: tool.name,
          result: result.content,
        });
      }

      // AI 응답 생성 (실제로는 LLM API 호출)
      const aiResponse = await generateAIResponse(pendingMessage, toolResults);

      return {
        content: aiResponse,
        metadata: {
          toolsUsed: event.data.toolsToCall,
          toolResults,
        },
      };
    }

    // 도구 호출이 필요 없는 경우
    const aiResponse = await generateAIResponse(pendingMessage);
    return { content: aiResponse };
  },

  disconnectFromServer: async (context: MCPChatContext) => {
    if (context.client) {
      await context.client.close();
    }
  },
};

// Helper functions
function analyzeMessageIntent(message: string, availableTools: Tool[]) {
  // 간단한 키워드 기반 분석 (실제로는 더 정교한 방법 필요)
  const toolsToCall = [];

  for (const tool of availableTools) {
    if (message.toLowerCase().includes(tool.name.toLowerCase())) {
      toolsToCall.push({
        name: tool.name,
        args: {}, // 실제로는 메시지에서 파라미터 추출 필요
      });
    }
  }

  return toolsToCall;
}

async function generateAIResponse(message: string, toolResults?: any[]) {
  // 실제로는 OpenAI, Claude 등의 API 호출
  // 여기서는 예시 응답
  if (toolResults && toolResults.length > 0) {
    return `도구를 사용하여 다음과 같은 결과를 얻었습니다: ${JSON.stringify(toolResults)}`;
  }

  return `"${message}"에 대한 AI 응답입니다.`;
}
