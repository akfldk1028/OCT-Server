// main/stores/chat/chatStore.ts
import { createStore } from 'zustand/vanilla';
// @ts-ignore
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
    
    // 🔥 새로운 도구 알림이 최근에 있었는지 확인
    const recentMessages = get().messages[sessionId] || [];
    const hasRecentNewToolsNotification = recentMessages
      .slice(-5) // 최근 5개 메시지만 확인
      .some(msg => msg.metadata?.type === 'new_tools_notification');
    
    if (hasRecentNewToolsNotification) {
      console.log('🎯 [processSelectedTags] 최근 새로운 도구 알림 감지됨 - 모든 도구를 다시 로드합니다');
    }
    
          // 🔥 태그가 없어도 연결된 모든 MCP Tools, Prompts, Resources를 자동으로 제공
      if (selectedTags.length === 0) {
        console.log('🤖 No tags selected - 자동으로 모든 연결된 MCP Tools, Prompts, Resources를 AI에게 제공합니다');
        
        // 1. 🔧 세션에 연결된 모든 MCP 도구들 가져오기
        const allMcpTools = await mcpCoordinatorStore
          .getState()
          .getSessionTools({ sessionId });
          
        if (allMcpTools.length > 0) {
          // 🔥 OpenRouter 전송 전에 도구 이름 중복 체크 및 제거
          const uniqueTools = new Map<string, any>();
          
          allMcpTools.forEach((tool) => {
            const toolSpec = {
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
            };
            
            if (!uniqueTools.has(tool.name)) {
              uniqueTools.set(tool.name, toolSpec);
            } else {
              console.warn(`⚠️ [processSelectedTags] 중복된 도구 이름 발견, 건너뛰기: ${tool.name} (서버: ${tool.serverName})`);
            }
          });
          
          // 🎯 오버레이 도구 추가 (AI가 직접 판단해서 사용할 수 있도록!)
          uniqueTools.set('analyze_screen_overlay', {
            type: 'function' as const,
            function: {
              name: 'analyze_screen_overlay',
              description: 'Analyze the current screen and provide visual guides. Use this when you need to see what\'s on the user\'s screen or provide visual assistance.',
              parameters: {
                type: 'object',
                properties: {
                  question: {
                    type: 'string',
                    description: 'What you want to analyze or help with on the screen'
                  }
                },
                required: ['question']
              }
            }
          });
          
          tools = Array.from(uniqueTools.values());
        
        // 🎯 새로운 도구 알림이 있었다면 시스템 프롬프트에 추가
        if (hasRecentNewToolsNotification) {
          console.log(`🔥 새로운 도구들이 감지되어 ${allMcpTools.length}개 도구, 중복 제거 후 ${tools.length}개 도구를 AI에게 제공:`, tools.map(t => t.function.name));
          systemPrompts += `\n\n🔧 **최근 새로운 도구들이 추가되었습니다!**\n사용 가능한 도구: ${tools.map(t => t.function.name).join(', ')}\n이 도구들을 적극적으로 활용해서 사용자를 도와주세요.`;
        } else {
          console.log(`🎯 자동으로 ${allMcpTools.length}개 도구, 중복 제거 후 ${tools.length}개 도구를 AI에게 제공:`, tools.map(t => t.function.name));
        }
      } else {
        console.log('ℹ️ 연결된 MCP 도구가 없습니다');
      }

      // 2. 📝 등록된 모든 프롬프트들 자동 처리
      const registry = mcpRegistryStore.getState();
      const allPrompts = Object.values(registry.prompts);
      
      if (allPrompts.length > 0) {
        console.log('📝 자동으로 모든 등록된 프롬프트들을 처리합니다:', allPrompts.map(p => p.name));
        
        try {
          const promptContents = await Promise.all(
                         allPrompts.map(async (prompt) => {
               try {
                 const result = await registry.getPrompt(prompt.name, {});
                 if (result && (result as any).messages) {
                   return `**${prompt.name}**: ${(result as any).messages.map((m: any) => m.content.text).join('\n')}`;
                 }
                 return `**${prompt.name}**: ${prompt.description || 'No description'}`;
               } catch (error) {
                 console.warn(`⚠️ 프롬프트 ${prompt.name} 처리 실패:`, error);
                 return `**${prompt.name}**: (처리 실패)`;
               }
             })
          );
          
          systemPrompts = promptContents.filter(content => content.trim()).join('\n\n');
          console.log('✅ 프롬프트 자동 처리 완료');
        } catch (error) {
          console.warn('⚠️ 프롬프트 일괄 처리 실패:', error);
        }
      } else {
        console.log('ℹ️ 등록된 프롬프트가 없습니다');
      }

      // 3. 📄 등록된 모든 리소스들 자동 처리
      const allResources = Object.values(registry.resources);
      
      if (allResources.length > 0) {
        console.log('📄 자동으로 모든 등록된 리소스들을 처리합니다:', allResources.map(r => r.name || r.uri));
        
        try {
          const resourceContentsArray = await Promise.all(
            allResources.slice(0, 5).map(async (resource) => { // 최대 5개만 처리 (성능상)
              try {
                const result = await registry.readResource(resource.uri);
                if (result && result.contents) {
                                     const content = result.contents
                     .map((c: any) => c.type === 'text' ? c.text : `[${c.type}]`)
                     .join('\n')
                     .slice(0, 1000); // 최대 1000자까지만
                  return `**${resource.name || resource.uri}**: ${content}`;
                }
                return `**${resource.name || resource.uri}**: ${resource.description || 'No description'}`;
              } catch (error) {
                console.warn(`⚠️ 리소스 ${resource.uri} 처리 실패:`, error);
                return `**${resource.name || resource.uri}**: (처리 실패)`;
              }
            })
          );
          
          resourceContents = resourceContentsArray.filter(content => content.trim()).join('\n\n');
          if (allResources.length > 5) {
            resourceContents += `\n\n... 그 외 ${allResources.length - 5}개 리소스 더 있음`;
          }
          console.log('✅ 리소스 자동 처리 완료');
        } catch (error) {
          console.warn('⚠️ 리소스 일괄 처리 실패:', error);
        }
      } else {
        console.log('ℹ️ 등록된 리소스가 없습니다');
      }
      
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
        // 🔥 OpenRouter 전송 전에 도구 이름 중복 체크 및 제거
        const uniqueTools = new Map<string, any>();
        
        selectedMcpTools.forEach((tool) => {
          const toolSpec = {
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
          };
          
          if (!uniqueTools.has(tool.name)) {
            uniqueTools.set(tool.name, toolSpec);
          } else {
            console.warn(`⚠️ [processSelectedTags] 중복된 도구 이름 발견, 건너뛰기: ${tool.name} (서버: ${tool.serverName})`);
          }
        });
        
        tools = Array.from(uniqueTools.values());
        console.log(`🎯 Selected ${selectedMcpTools.length} tools, 중복 제거 후 ${tools.length} tools for AI:`, tools.map(t => t.function.name));
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
      // 🔇 간결한 시스템 프롬프트 (사용자 UX 친화적)
      const systemContent = `당신은 도움이 되는 AI 어시스턴트입니다. 

사용 가능한 도구들을 활용하여 사용자의 질문에 정확하고 자연스럽게 답변해주세요.
- 한국어로 친근하고 명확하게 답변하세요
- 도구 실행 결과는 요약해서 사용자가 이해하기 쉽게 설명하세요
- 내부 시스템 정보나 기술적 세부사항은 노출하지 마세요

${systemPrompts ? `참고 정보: ${systemPrompts}` : ''}
${resourceContents ? `추가 자료: ${resourceContents}` : ''}`;
      
      aiMessages.unshift({
        role: 'system',
        content: systemContent,
      });
      
      console.log('🔇 간결한 시스템 메시지 추가됨 (사용자 친화적)');
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

  // 🚀 MCP 도구들 실행 - 개선된 버전 (오버레이 도구 포함)
  executeMCPTools: async (sessionId: string, toolCalls: any[]) => {
    if (toolCalls.length === 0) return '';
    
    const toolResults: string[] = [];
    
    for (const toolCall of toolCalls) {
      const startTime = Date.now();
      
      try {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`🔧 도구 실행: ${toolCall.function.name}`, args);
        
        // 🎯 오버레이 도구 특별 처리 (AI가 직접 판단해서 호출!)
        if (toolCall.function.name === 'analyze_screen_overlay') {
          console.log('👁️ [executeMCPTools] AI가 오버레이 도구를 호출했습니다!', args);
          
          try {
            // 오버레이 시작 메시지 추가
            const overlayStartMessage = {
              id: 'Message-' + uuidv4(),
              sessionId,
              role: 'assistant' as const,
              content: '👁️ **Overlay Vision이 화면을 분석하고 있습니다...**\n\n🔍 화면 캡처 및 가이드 생성 중...',
              timestamp: new Date().toISOString(),
              metadata: {
                type: 'overlay-start',
                isCooperative: true,
                avatar: 'overlay'
              },
            };
            
            // 메시지 추가
            set((state) => ({
              messages: {
                ...state.messages,
                [sessionId]: [...(state.messages[sessionId] || []), overlayStartMessage],
              },
            }));
            
            // 오버레이 실행
            const { combinedStore } = require('../combinedStore');
            const overlayState = combinedStore.getState().overlay;
            
            if (overlayState?.RUN_AGENT_OVERLAY) {
              overlayState.SET_INSTRUCTIONS(args.question || '현재 화면을 분석해주세요');
              overlayState.SET_INSTRUCTIONS_OVERLAY({
                software: 'unknown',
                question: args.question || '현재 화면을 분석해주세요'
              });
              
              await overlayState.RUN_AGENT_OVERLAY();
              
              // 성공 메시지로 업데이트
              const successMessage = {
                ...overlayStartMessage,
                content: '✨ **Overlay Vision • 화면 분석 완료**\n\n🎯 화면에 노란색 가이드가 표시되었습니다!\n👀 스크린에 표시된 가이드를 확인해보세요!',
                metadata: {
                  type: 'overlay-success',
                  isCooperative: true,
                  avatar: 'overlay'
                },
              };
              
              set((state) => ({
                messages: {
                  ...state.messages,
                  [sessionId]: (state.messages[sessionId] || []).map(msg => 
                    msg.id === overlayStartMessage.id ? successMessage : msg
                  ),
                },
              }));
              
              toolResults.push('🎯 **Overlay Vision 완료** - 화면에 가이드가 표시되었습니다.');
              
            } else {
              throw new Error('Overlay system not available');
            }
            
          } catch (overlayError) {
            console.error('❌ [executeMCPTools] 오버레이 실행 실패:', overlayError);
            toolResults.push(`⚠️ **Overlay Vision 오류** - ${overlayError instanceof Error ? overlayError.message : '알 수 없는 오류'}`);
          }
          
          continue; // 다음 도구로
        }
        
        // 일반 MCP 도구 실행
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
    
    // 🎯 도구 실행 결과들을 AI만 볼 수 있도록 구성 (사용자에게는 숨김)
    return `[도구 실행됨: ${toolCalls.length}개]\n${toolResults.join('\n')}`;
  },

  // 🚀 SDK 스타일 세션 초기화 (간단하고 사용자 친화적)
  initializeSession: async (payload) => {
    const { sessionId, config } = payload;
    console.log('🚀 [SDK Style] Chat 세션 초기화:', sessionId);

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

    // 2. 🔥 SDK 스타일로 MCP 서버들 자동 연결
    try {
      const connectionResult = await get().connectMCPServers(sessionId);
      console.log(`🎉 SDK 스타일 MCP 연결 완료:`, connectionResult);
    } catch (error) {
      console.error('❌ SDK 스타일 MCP 연결 실패:', error);
    }

    console.log(`✅ [SDK Style] Chat 초기화 완료: ${sessionId}`);
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

      // 8. ✅ 키워드 기반 오버레이 감지 제거됨 - 이제 AI가 도구로 직접 판단합니다!

      // 9. ✅ 스트리밍 완료
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

  // 🔥 Overlay 기능 통합 - AI와 채팅을 overlay로 연결
  sendOverlayMessage: async (payload: { 
    sessionId: string; 
    content: string; 
    selectedTags?: any[];
    triggerOverlay?: boolean;
  }) => {
    const { sessionId, content, selectedTags = [], triggerOverlay = false } = payload;
    
    try {
      console.log('🎯 [sendOverlayMessage] 호출됨:', { sessionId, content, triggerOverlay });
      
      // 1. 일반 채팅 메시지 전송
      const chatResult = await get().sendStreamingMessage({
        sessionId,
        content,
        selectedTags
      });
      
      // 2. overlay 모드가 활성화되어 있으면 overlay 가이드도 트리거
      if (triggerOverlay) {
        console.log('🔥 Overlay Vision 에이전트 시작...');
        
        // 🔥 먼저 시작 메시지 추가 (즉시 표시)
        const startMessage: ChatMessage = {
          id: uuidv4(),
          sessionId,
          role: 'assistant',
          content: '👁️ **Overlay Vision 에이전트가 화면을 분석 중입니다...**\n\n🔍 화면 캡처 및 가이드 생성 중...',
          timestamp: new Date().toISOString(),
          metadata: {
            type: 'overlay-start',
            isCooperative: true,
            avatar: 'overlay'
          },
        };
        
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: [...(state.messages[sessionId] || []), startMessage],
          },
        }));
        
        try {
          // overlayStore에서 가이드 생성 호출
          const { combinedStore } = require('../combinedStore');
          const overlayState = combinedStore.getState().overlay;
          
          if (overlayState?.RUN_AGENT_OVERLAY) {
            // 사용자 질문을 overlay 시스템에 전달
            overlayState.SET_INSTRUCTIONS(content);
            overlayState.SET_INSTRUCTIONS_OVERLAY({
              software: 'unknown', // 자동 감지
              question: content
            });
            
            // AI overlay 가이드 실행
            const overlayResult = await overlayState.RUN_AGENT_OVERLAY();
            console.log('✅ Overlay 가이드 실행 완료:', overlayResult);
            
            // 🎉 성공 메시지로 업데이트
            const successMessage: ChatMessage = {
              id: startMessage.id, // 같은 ID로 업데이트
              sessionId,
              role: 'assistant',
              content: '✨ **Overlay Vision • 화면 분석 완료**\n\n🎯 화면에 노란색 가이드가 표시되었습니다!\n👀 이거 봐봐! 여기 클릭해봐!',
              timestamp: new Date().toISOString(),
              metadata: {
                type: 'overlay-success',
                isCooperative: true,
                avatar: 'overlay'
              },
            };
            
            // 기존 메시지를 성공 메시지로 교체
            set((state) => ({
              messages: {
                ...state.messages,
                [sessionId]: (state.messages[sessionId] || []).map(msg => 
                  msg.id === startMessage.id ? successMessage : msg
                ),
              },
            }));
            
          } else {
            throw new Error('Overlay store not available');
          }
          
        } catch (overlayError) {
          console.error('❌ Overlay 실행 실패:', overlayError);
          
          // 🚨 실패 메시지로 업데이트
          const errorMessage: ChatMessage = {
            id: startMessage.id, // 같은 ID로 업데이트
            sessionId,
            role: 'assistant',
            content: `⚠️ **Overlay Vision • 오류 발생**\n\n화면 분석 중 문제가 발생했습니다:\n\`${overlayError instanceof Error ? overlayError.message : '알 수 없는 오류'}\``,
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'overlay-error',
              isCooperative: true,
              avatar: 'overlay'
            },
          };
          
          set((state) => ({
            messages: {
              ...state.messages,
              [sessionId]: (state.messages[sessionId] || []).map(msg => 
                msg.id === startMessage.id ? errorMessage : msg
              ),
            },
          }));
        }
      }
      
      return chatResult;
      
    } catch (error) {
      console.error('❌ [sendOverlayMessage] 전체 실행 실패:', error);
      throw error;
    }
  },

  // 🔥 간단한 SDK 스타일 MCP 연결 시스템
  connectMCPServers: async (sessionId: string, serverConfigs?: any[]) => {
    console.log('🚀 [SDK Style] MCP 서버들 자동 연결 시작...');
    
    const registry = mcpRegistryStore.getState();
    const coordinator = mcpCoordinatorStore.getState();
    
    // 1. 기본 서버들이 없으면 초기화
    if (Object.keys(registry.servers).length === 0) {
      registry.initializeDefaultServers();
      console.log('📦 기본 MCP 서버들 등록 완료');
    }
    
    // 2. 연결할 서버 목록 결정 (SDK 스타일)
    const serversToConnect = serverConfigs || Object.values(registry.servers).filter(
      server => server.autoConnect === true
    );
    
    console.log(`🎯 연결할 서버들 (${serversToConnect.length}개):`, serversToConnect.map(s => s.name || s.id));
    
    // 3. 병렬로 빠르게 연결 (사용자 친화적)
    const connectionPromises = serversToConnect.map(async (server) => {
      const serverId = server.id;
      
      if (coordinator.isServerConnectedToSession({ sessionId, serverId })) {
        console.log(`✅ 이미 연결됨: ${server.name || serverId}`);
        return { serverId, status: 'already_connected', name: server.name };
      }
      
      try {
        console.log(`🔗 연결 중: ${server.name || serverId}`);
        await coordinator.connectMCPToSession({ sessionId, serverId });
        console.log(`✅ 연결 완료: ${server.name || serverId}`);
        return { serverId, status: 'connected', name: server.name };
      } catch (error) {
        console.error(`❌ 연결 실패: ${server.name || serverId}`, error);
        return { serverId, status: 'failed', name: server.name, error };
      }
    });
    
    // 4. 모든 연결 완료 대기
    const results = await Promise.allSettled(connectionPromises);
    
    // 5. 결과 정리 (사용자 친화적 로깅)
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 'connected').length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed')).length;
    const alreadyConnected = results.filter(r => r.status === 'fulfilled' && r.value.status === 'already_connected').length;
    
    console.log(`🎉 MCP 연결 완료! 성공: ${successful}개, 실패: ${failed}개, 기존연결: ${alreadyConnected}개`);
    
    return {
      total: serversToConnect.length,
      successful,
      failed,
      alreadyConnected,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error', error: r.reason })
    };
  },

  // 🤖 SDK 스타일로 간단하게 AI 메시지 전송 (MCP 자동 연결 포함)
  sendMessageWithAutoMCP: async (payload: { sessionId: string; content: string; selectedTags?: any[] }) => {
    const { sessionId, content, selectedTags = [] } = payload;
    
    console.log('🤖 [SDK Style] AI 메시지 전송 시작...');
    
    // 1. MCP 서버들 자동 연결 (SDK 스타일)
    await get().connectMCPServers(sessionId);
    
    // 2. 기존 스트리밍 메시지 전송
    return await get().sendStreamingMessage({ sessionId, content, selectedTags });
  },

  // 🔧 새로운 도구 추가 알림 (워크플로우 완료 후 AI에게 알림)
  notifyNewToolsAdded: async (payload: { 
    sessionId: string; 
    connectedServers: string[];
    message?: string;
  }) => {
    const { sessionId, connectedServers, message } = payload;
    
    if (connectedServers.length === 0) {
      console.log('🔧 [notifyNewToolsAdded] 새로운 서버 없음, 알림 스킵');
      return;
    }

    console.log('🔧 [notifyNewToolsAdded] 새로운 도구 알림 추가:', connectedServers);

    // AI에게 새로운 도구들이 사용 가능하다는 시스템 메시지 추가
    const systemMessage: ChatMessage = {
      id: 'Message-' + uuidv4(),
      sessionId,
      role: 'system',
      content: message || `🔧 **새로운 도구가 추가되었습니다!**\n\n✨ **${connectedServers.join(', ')}** MCP 서버(들)이 연결되었습니다.\n💡 다음 메시지부터 이 서버들의 도구를 자동으로 사용할 수 있습니다!`,
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'new_tools_notification',
        connectedServers,
        isSystemMessage: true,
      },
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), systemMessage],
      },
    }));

    console.log('✅ [notifyNewToolsAdded] AI 알림 메시지 추가됨');
  },

  // 🔥 메시지 추가 (워크플로우 결과 등)
  addMessage: (payload) => {
    const { sessionId, message } = payload;
    
    const fullMessage: ChatMessage = {
      ...message,
      sessionId,
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), fullMessage],
      },
    }));

    console.log('📝 [addMessage] 메시지 추가됨:', message.role, message.content?.substring(0, 50) + '...');
  },
}));
