// main/stores/chat/chatStore.ts
import { createStore } from 'zustand/vanilla';
import { v4 as uuidv4 } from 'uuid';
import { openrouterStore } from '../openrouter/openrouterStore';
import type { ChatState, ChatMessage, ChatConfig } from './chat-types';
import { AIMessage, ToolCall } from '../openrouter/openrouter-type';
import { mcpCoordinatorStore } from '../integration/ai-mcp-coordinator';
import { mcpRegistryStore } from '../mcp/mcpRegistryStore';

const DEFAULT_CONFIG: ChatConfig = {
  model: 'openai/gpt-4',
  temperature: 0.7,
  activeTools: [],
};

export const chatStore = createStore<ChatState>((set, get) => ({
  messages: {},
  configs: {},
  streamingMessages: {},

  // 세션 초기화
  initializeSession: async (payload) => {
    const { sessionId, config } = payload;
    console.log('💬 Initializing chat session:', sessionId);

    // 1. 채팅 설정 초기화
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: state.messages[sessionId] || [],
      },
      configs: {
        ...state.configs,
        [sessionId]: {
          ...DEFAULT_CONFIG,
          ...config,
        },
      },
    }));


    // 기본 MCP 서버들 연결
    try {
      // 기본 MCP 서버들 연결
      const registry = mcpRegistryStore.getState();
      if (Object.keys(registry.servers).length === 0) {
        registry.initializeDefaultServers();
      }
      
      // // Everything Server 자동 연결
      // const coordinator = mcpCoordinatorStore.getState();
      // const everythingServer = Object.values(registry.servers).find(
      //   s => s.id === 'server-everything'
      // );
      
      // if (everythingServer && !coordinator.isServerConnectedToSession({ sessionId, serverId: everythingServer.id })) {
      //   await coordinator.connectMCPToSession({ sessionId, serverId: everythingServer.id });
      // }
      
      console.log(`✅💬 Chat initialized with MCP for session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to initialize MCP servers:', error);
    }

    // 2. 자동으로 기본 MCP 서버들 연결
    // const AUTO_CONNECT_SERVERS = ['server-everything']; // 자동 연결할 서버 ID들
    
    // for (const serverId of AUTO_CONNECT_SERVERS) {
    //   try {
    //     console.log(`🤖 Auto-connecting MCP server: ${serverId}`);
    //     await mcpCoordinatorStore.getState().connectMCPToSession(sessionId, serverId);
    //     console.log(`✅ Auto-connected: ${serverId}`);
    //   } catch (error) {
    //     console.error(`❌ Failed to auto-connect ${serverId}:`, error);
    //   }
    // }

    console.log(`✅💬 Chat initialized with MCP for session: ${sessionId}`);
  },


  sendMessage: async (payload) => {
    const { sessionId, content } = payload;
    const config = get().configs[sessionId];
    if (!config) {
      throw new Error(`Session ${sessionId} not initialized`);
    }

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: 'Message-' + uuidv4(),
      sessionId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), userMessage],
      },
    }));

    try {
      // MCP 도구 정보 가져오기
      const mcpTools = await mcpCoordinatorStore
        .getState()
        .getSessionTools(sessionId);

      // OpenRouter용 도구 포맷으로 변환
      const tools =
        mcpTools.length > 0
          ? mcpTools.map((tool) => ({
              type: 'function' as const,
              function: {
                name: tool.name,
                description: tool.description,
                parameters: {}, // MCP 도구는 파라미터 스키마를 별도로 가져와야 함
              },
            }))
          : undefined;

      // AI 메시지 준비 (content가 string인 것만 포함)
      const messages = get().messages[sessionId] || [];
      const aiMessages: AIMessage[] = messages
        .filter(
          (msg) => typeof msg.content === 'string' && msg.content !== null,
        )
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          toolCallId: msg.metadata?.toolCallId,
        }));

      // OpenRouter 호출
      const startTime = Date.now();
      const response = await openrouterStore.getState().createCompletion({
        model: config.model,
        messages: aiMessages,
        tools,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        sessionId, // 세션별 사용량 추적
      });

      const duration = Date.now() - startTime;

      // AI 응답 추가
      const assistantMessage: ChatMessage = {
        id: 'Message-' + uuidv4(),
        sessionId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        metadata: {
          model: config.model,
          duration,
          tokens: response.usage?.total_tokens,
        },
      };

      set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: [...state.messages[sessionId], assistantMessage],
        },
      }));

      // 도구 호출 처리
      if (response.toolCalls && response.toolCalls.length > 0) {
        await get().handleToolCalls({
          sessionId,
          toolCalls: response.toolCalls,
        });
      }
    } catch (error) {
      console.error('Send message error:', error);

      const errorMessage: ChatMessage = {
        id: 'Message-' + uuidv4(),
        sessionId,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: [...state.messages[sessionId], errorMessage],
        },
      }));

      throw error;
    }
  },

  // 스트리밍 메시지
  sendStreamingMessage: async (payload) => {
    const { sessionId, content } = payload;
    console.log('💬 [sendStreamingMessage] 호출됨!');
    console.log('🆔 sessionId:', sessionId);
    console.log('📝 content:', content);
    const config = get().configs[sessionId];
    if (!config) {
      console.error('❌ [sendStreamingMessage] config 없음!');
      throw new Error(`Session ${sessionId} not initialized`);
    }

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: 'Message-' + uuidv4(),
      sessionId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    console.log('👤 사용자 메시지 추가:', userMessage);

    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), userMessage],
      },
    }));

    const assistantMessageId = 'Message-' + uuidv4();
    let fullContent = '';

    try {
      // 스트리밍 시작
      console.log('🤖 [sendStreamingMessage] 스트리밍 시작!');
      set((state) => ({
        streamingMessages: {
          ...state.streamingMessages,
          [sessionId]: '',
        },
        messages: {
          ...state.messages,
          [sessionId]: [
            ...state.messages[sessionId],
            {
              id: assistantMessageId,
              sessionId,
              role: 'assistant' as const,
              content: '',
              timestamp: new Date().toISOString(),
              metadata: { model: config.model },
            },
          ],
        },
      }));

      // OpenRouter 스트리밍 (content가 string인 것만 포함)
      const messages = get().messages[sessionId] || [];
      const aiMessages: AIMessage[] = messages
        .slice(0, -1)
        .filter(
          (msg) => typeof msg.content === 'string' && msg.content !== null,
        )
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      console.log('📤 OpenRouter로 보낼 aiMessages:', aiMessages);

      const stream = openrouterStore.getState().createStreamingCompletion({
        model: config.model,
        messages: aiMessages,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        sessionId,
        content,
        onChunk: (chunk) => {
          if (chunk.type === 'content' && chunk.content) {
            fullContent += chunk.content;
            console.log('🟦 스트리밍 청크 수신:', chunk.content);
            // 실시간 업데이트
            set((state) => ({
              streamingMessages: {
                ...state.streamingMessages,
                [sessionId]: fullContent,
              },
              messages: {
                ...state.messages,
                [sessionId]: state.messages[sessionId].map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: fullContent }
                    : msg,
                ),
              },
            }));
          }
        },
      });

      // 전체 청크를 합쳐서 fullContent로 저장
      let chunkCount = 0;
      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.content) {
          chunkCount++;
          // 이미 onChunk에서 처리함
        }
      }

      // 스트리밍 완료
      console.log('✅ [sendStreamingMessage] 스트리밍 완료!');
      set((state) => ({
        streamingMessages: {
          ...state.streamingMessages,
          [sessionId]: '',
        },
      }));

      // 최종 assistant 메시지 content를 업데이트
      set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: state.messages[sessionId].map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullContent }
              : msg,
          ),
        },
      }));
      return fullContent;
    } catch (error) {
      console.error('❌ [sendStreamingMessage] 스트리밍 에러:', error);
      throw error;
    }
  },

  // 세션 클리어
  clearSession: (payload) => {
    const { sessionId } = payload;
    console.log('💬 [clearSession] 호출됨!');
    console.log('🆔 sessionId:', sessionId);
    set((state) => {
      const { [sessionId]: deletedMessages, ...messages } = state.messages;
      const { [sessionId]: deletedConfig, ...configs } = state.configs;
      const { [sessionId]: deletedStreaming, ...streamingMessages } =
        state.streamingMessages;

      return { messages, configs, streamingMessages };
    });
  },

  // 설정 업데이트
  updateConfig: (payload) => {
    const { sessionId, config } = payload;
    console.log('🚀 [chatStore] updateConfig 호출!');
    console.log('⚙️ config:', config);
    set((state) => ({
      configs: {
        ...state.configs,
        [sessionId]: {
          ...state.configs[sessionId],
          ...config,
        },
      },
    }));
    console.log('🔄 [chatStore] updateConfig 완료!');
    console.log('🔄 sessionId:', sessionId);
    console.log('🔄 config:', config);
  },

  // Getters
  getMessages: (sessionId) => {
    return get().messages[sessionId] || [];
  },

  getConfig: (sessionId) => {
    return get().configs[sessionId];
  },

  // MCP 도구 실행 핸들러
  handleToolCalls: async (payload) => {
    const { sessionId, toolCalls } = payload;
    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        // MCP를 통해 도구 실행
        const result = await mcpCoordinatorStore
          .getState()
          .executeToolForSession(sessionId, toolCall.function.name, args);
        // 도구 결과 메시지 추가
        const toolMessage: ChatMessage = {
          id: uuidv4(),
          sessionId,
          role: 'tool',
          content:
            typeof result.content === 'string'
              ? result.content
              : JSON.stringify(result.content, null, 2),
          timestamp: new Date().toISOString(),
          metadata: {
            toolName: toolCall.function.name,
            toolCallId: toolCall.id,
          },
        };
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: [...state.messages[sessionId], toolMessage],
          },
        }));
        // AI가 도구 결과를 바탕으로 응답 생성
        await get().sendMessage({ sessionId, content: '' });
      } catch (error) {
        console.error(
          `Tool execution failed: ${toolCall.function.name}`,
          error,
        );
        const errorMessage: ChatMessage = {
          id: 'Message-' + uuidv4(),
          sessionId,
          role: 'system',
          content: `Tool error (${toolCall.function.name}): ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: [...state.messages[sessionId], errorMessage],
          },
        }));
      }
    }
  },
}));
