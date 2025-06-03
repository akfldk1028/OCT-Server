// main/stores/chat/chatStore.ts
import { createStore } from 'zustand/vanilla';
import { v4 as uuidv4 } from 'uuid';
import { openrouterStore } from '../openrouter/openrouterStore';
import type { ChatState, ChatMessage, ChatConfig } from './chat-types';
import { AIMessage, ToolCall } from '../openrouter/openrouter-type';
import { mcpCoordinatorStore } from '../integration/ai-mcp-coordinator';
import { mcpRegistryStore } from '../mcp/mcpRegistryStore';
import { processPrompts, processResources, extractToolText, formatToolExecutionResult, formatToolExecutionError } from './chat-helper';
import type { 
  GetPromptResult, 
  ReadResourceResult, 
  CallToolResult 
} from '@modelcontextprotocol/sdk/types.js';

const DEFAULT_CONFIG: ChatConfig = {
  model: 'openai/gpt-4',
  temperature: 0.7,
  activeTools: [],
};

export const chatStore = createStore<ChatState>((set, get) => ({
  messages: {},
  configs: {},
  streamingMessages: {},

  // 🏷️ 선택된 태그들을 처리해서 도구, 프롬프트, 리소스 정보 반환
  processSelectedTags: async (sessionId: string, selectedTags: any[]) => {
    let tools = undefined;
    let systemPrompts = '';
    let resourceContents = '';
    
    if (selectedTags.length === 0) {
      console.log('📝 No tags selected - AI will respond normally without tools');
      return { tools, systemPrompts, resourceContents };
    }

    console.log('🏷️ Processing selected tags for AI tools...');
    
    // 1. 🔧 도구 처리
    const selectedToolNames = selectedTags
      .filter(tag => tag.type === 'tool')
      .map(tag => tag.name);
      
    console.log('🔧 Selected tool names:', selectedToolNames);
    
    if (selectedToolNames.length > 0) {
      const allMcpTools = await mcpCoordinatorStore
        .getState()
        .getSessionTools({ sessionId });
        
      const selectedMcpTools = allMcpTools.filter(tool => 
        selectedToolNames.includes(tool.name)
      );
      
      if (selectedMcpTools.length > 0) {
        tools = selectedMcpTools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description || `Execute ${tool.name} tool`,
            parameters: tool.inputSchema || {
              type: 'object',
              properties: {},
              additionalProperties: true
            },
          },
        }));
        
        console.log(`🎯 Selected ${selectedMcpTools.length} tools for AI:`, tools.map(t => t.function.name));
      }
    }
    
    // 2. 📝 프롬프트 처리 (간단해짐!)
    const selectedPrompts = selectedTags.filter(tag => tag.type === 'prompt');
    
    if (selectedPrompts.length > 0) {
      console.log('📝 Processing selected prompts:', selectedPrompts.map(p => p.name));
      
      const promptContent = await processPrompts(
        selectedPrompts,
        mcpRegistryStore.getState().getPrompt as any
      );
      
      systemPrompts += `\n\n${promptContent}`;
    }
    
    // 3. 📄 리소스 처리 (간단해짐!)
    const selectedResources = selectedTags.filter(tag => tag.type === 'resource');
    
    if (selectedResources.length > 0) {
      console.log('📄 Processing selected resources:', selectedResources.map(r => r.name));
      
      const resourceContent = await processResources(
        selectedResources,
        mcpRegistryStore.getState().readResource as any,
        (name: string) => {
          // 간단한 URI 찾기 (기본 전략만)
          const registry = mcpRegistryStore.getState();
          const allUris = Object.keys(registry.resources);
          return allUris.find(uri => uri.includes(name) || 
            registry.resources[uri]?.name?.includes(name)) || null;
        }
      );
      
      resourceContents += `\n\n${resourceContent}`;
    }

    return { tools, systemPrompts, resourceContents };
  },

  // 🤖 AI 메시지 배열 준비
  prepareAIMessages: (sessionId: string, systemPrompts: string, resourceContents: string) => {
    const messages = get().messages[sessionId] || [];
    let aiMessages: AIMessage[] = messages
      .slice(0, -1)
      .filter(
        (msg) => typeof msg.content === 'string' && msg.content !== null,
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // 🔄 프롬프트나 리소스가 있으면 시스템 메시지로 추가
    if (systemPrompts || resourceContents) {
      // 📈 개선된 시스템 프롬프트 - 도구 실행 결과 활용 가이드 포함
      const systemContent = `당신은 전문적이고 도움이 되는 AI 어시스턴트입니다. 다음 컨텍스트 정보를 신중히 분석하고 활용하여 정확하고 유용한 답변을 제공해주세요.

📋 **컨텍스트 정보 활용 지침:**
- 제공된 리소스와 프롬프트의 정보를 우선적으로 참고하세요
- 컨텍스트에서 직접적으로 답변할 수 있는 내용은 해당 정보를 기반으로 답변하세요
- 컨텍스트에 없는 정보를 추측하지 말고, 명확히 구분해서 설명하세요

🔧 **도구 실행 결과 활용 지침:**
- 도구 실행 결과가 포함된 경우, 해당 결과를 바탕으로 구체적이고 정확한 답변을 제공하세요
- 도구가 반환한 데이터를 분석하여 사용자에게 유용한 인사이트를 제공하세요
- 여러 도구의 결과가 있다면 종합적으로 분석해서 설명하세요
- 도구 실행 오류가 있었다면 대안을 제시하거나 문제 해결 방법을 안내하세요

💬 **응답 품질 기준:**
- 한국어로 자연스럽고 명확하게 답변해주세요
- 구체적인 예시와 함께 설명하여 이해하기 쉽게 해주세요
- 필요시 구조화된 형태(목록, 표 등)로 정보를 정리해주세요

🔍 **제공된 컨텍스트:**${systemPrompts}${resourceContents}

위 정보를 바탕으로 사용자의 질문에 정확하고 유용한 답변을 제공해주세요.`;
      
      aiMessages.unshift({
        role: 'system',
        content: systemContent,
      });
      
      console.log('📋 개선된 시스템 메시지 추가됨 (프롬프트/리소스/도구)');
    }
    
    return aiMessages;
  },

  // 🔧 분할된 tool_calls를 재구성
  reconstructToolCalls: (allToolCalls: any[]) => {
    const toolCallsMap = new Map<string, any>();
    
    for (const toolCall of allToolCalls) {
      // index 또는 id를 기준으로 그룹핑 (index가 있으면 우선 사용)
      const key = toolCall.index !== undefined ? `index_${toolCall.index}` : 
                 toolCall.id || `fallback_${Object.keys(toolCallsMap).length}`;
      
      if (!toolCallsMap.has(key)) {
        // 첫 번째 청크에서 기본 정보 설정
        toolCallsMap.set(key, {
          id: toolCall.id || `call_${Math.random().toString(36).substr(2, 9)}`,
          type: 'function',
          function: {
            name: toolCall.function?.name || 'unknown',
            arguments: ''
          }
        });
      }
      
      // 기존 정보 업데이트 (나중에 온 정보가 더 완전할 수 있음)
      const existing = toolCallsMap.get(key)!;
      if (toolCall.id && !existing.id.startsWith('call_')) {
        existing.id = toolCall.id;
      }
      if (toolCall.function?.name && existing.function.name === 'unknown') {
        existing.function.name = toolCall.function.name;
      }
      
      // arguments 누적
      if (toolCall.function?.arguments) {
        existing.function.arguments += toolCall.function.arguments;
      }
    }
    
    return Array.from(toolCallsMap.values()).filter(tc => 
      tc.function.name !== 'unknown' || tc.function.arguments.trim() !== ''
    );
  },

  // 🚀 MCP 도구들 실행 - 개선된 버전
  executeMCPTools: async (sessionId: string, toolCalls: any[]) => {
    if (toolCalls.length === 0) return '';
    
    const toolResults: string[] = [];
    
    for (const toolCall of toolCalls) {
      const startTime = Date.now();
      
      try {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`🔧 도구 실행: ${toolCall.function.name}`, args);
        
        const result = await mcpCoordinatorStore
          .getState()
          .executeToolForSession({ 
            sessionId, 
            toolName: toolCall.function.name, 
            args 
          });
        
        console.log(`✅ 도구 실행 결과:`, result);
        
        const executionTime = Date.now() - startTime;
        const formattedResult = formatToolExecutionResult(
          toolCall.function.name, 
          args, 
          result, 
          executionTime
        );
        
        toolResults.push(formattedResult);
        
      } catch (error) {
        console.error(`❌ 도구 실행 실패: ${toolCall.function.name}`, error);
        
        const args = (() => {
          try {
            return JSON.parse(toolCall.function.arguments);
          } catch {
            return { arguments: toolCall.function.arguments };
          }
        })();
        
        const formattedError = formatToolExecutionError(
          toolCall.function.name, 
          args, 
          error instanceof Error ? error : new Error(String(error))
        );
        
        toolResults.push(formattedError);
      }
    }
    
    // 🎯 도구 실행 결과들을 종합해서 AI가 잘 이해할 수 있도록 구성
    return `\n\n🛠️ **MCP 도구 실행 결과 요약**\n총 ${toolCalls.length}개 도구 실행됨\n\n${toolResults.join('\n\n')}`;
  },

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
      
      // autoConnect가 true인 모든 서버들 자동 연결
      const coordinator = mcpCoordinatorStore.getState();
      const autoConnectServers = Object.values(registry.servers).filter(
        server => server.autoConnect === true
      );
      
      console.log(`🔍 Auto-connect 대상 서버들:`, autoConnectServers.map(s => s.name));
      
      for (const server of autoConnectServers) {
        if (!coordinator.isServerConnectedToSession({ sessionId, serverId: server.id })) {
          try {
            console.log(`🤖 Auto-connecting MCP server: ${server.name}`);
            await coordinator.connectMCPToSession({ sessionId, serverId: server.id });
            console.log(`✅ Auto-connected: ${server.name}`);
          } catch (error) {
            console.error(`❌ Failed to auto-connect ${server.name}:`, error);
          }
        } else {
          console.log(`🔗 Already connected: ${server.name}`);
        }
      }
      
      console.log(`✅💬 Chat initialized with MCP for session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to initialize MCP servers:', error);
    }

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
        .getSessionTools({ sessionId });

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

  // 🌊 스트리밍 메시지 (깔끔하게 리팩토링됨!)
  sendStreamingMessage: async (payload) => {
    const { sessionId, content, selectedTags = [] } = payload;
    console.log('💬 [sendStreamingMessage] 호출됨!');
    console.log('🆔 sessionId:', sessionId);
    console.log('📝 content:', content);
    console.log('🏷️ selectedTags:', selectedTags);
    
    const config = get().configs[sessionId];
    if (!config) {
      console.error('❌ [sendStreamingMessage] config 없음!');
      throw new Error(`Session ${sessionId} not initialized`);
    }

    // 1. 📝 사용자 메시지 추가
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

    // 2. 🤖 어시스턴트 메시지 초기화
    const assistantMessageId = 'Message-' + uuidv4();
    let fullContent = '';

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

    try {
      // 3. 🏷️ 선택된 태그들 처리
      const { tools, systemPrompts, resourceContents } = await get().processSelectedTags(sessionId, selectedTags);
      
      // 🔍 디버깅: 사용 가능한 프롬프트와 리소스 표시
      if (selectedTags.length > 0) {
        const registry = mcpRegistryStore.getState();
        console.log('📝 등록된 모든 프롬프트:', Object.keys(registry.prompts));
        console.log('📄 등록된 모든 리소스:', Object.keys(registry.resources));
        
        const hasPrompts = selectedTags.some(tag => tag.type === 'prompt');
        const hasResources = selectedTags.some(tag => tag.type === 'resource');
        
        if (hasPrompts) console.log('📝 프롬프트 처리 결과:', systemPrompts);
        if (hasResources) console.log('📄 리소스 처리 결과:', resourceContents);
      }
      
      // 4. 🤖 AI 메시지 준비
      const aiMessages = get().prepareAIMessages(sessionId, systemPrompts, resourceContents);
      
      console.log('📤 OpenRouter로 보낼 aiMessages:', aiMessages);
      console.log('🛠️ OpenRouter로 보낼 tools:', tools ? JSON.stringify(tools, null, 2) : 'undefined');

      // 5. 🌊 스트리밍 실행
      const stream = openrouterStore.getState().createStreamingCompletion({
        model: config.model,
        messages: aiMessages,
        tools,
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
          
          // 🔧 tool_calls 수집
          if ((chunk as any).type === 'tool_calls' && (chunk as any).tool_calls) {
            console.log('🔧 AI가 도구 호출함:', (chunk as any).tool_calls);
            if (!(chunk as any).pendingToolCalls) {
              (chunk as any).pendingToolCalls = [];
            }
            (chunk as any).pendingToolCalls.push(...(chunk as any).tool_calls);
          }
        },
      });

      // 6. 🔧 tool_calls 수집 및 실행
      let allToolCalls: any[] = [];
      for await (const chunk of stream) {
        if ((chunk as any).pendingToolCalls) {
          allToolCalls.push(...(chunk as any).pendingToolCalls);
        }
      }
      
      console.log('🔧 수집된 tool_calls:', allToolCalls);

      // 7. 🚀 MCP 도구 실행
      if (allToolCalls.length > 0) {
        console.log('🚀 MCP 도구 실행 시작...');
        const completedToolCalls = get().reconstructToolCalls(allToolCalls);
        console.log('🔧 재구성된 tool_calls:', completedToolCalls);
        
        const toolResults = await get().executeMCPTools(sessionId, completedToolCalls);
        console.log('📋 도구 실행 결과 텍스트:', toolResults);
        fullContent += toolResults;
        console.log('📝 최종 fullContent:', fullContent);
      }

      // 8. ✅ 스트리밍 완료
      console.log('✅ [sendStreamingMessage] 스트리밍 완료!');
      set((state) => ({
        streamingMessages: {
          ...state.streamingMessages,
          [sessionId]: '',
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
          .executeToolForSession({ 
            sessionId, 
            toolName: toolCall.function.name, 
            args 
          });
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
