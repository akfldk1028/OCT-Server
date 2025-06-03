// main/stores/openrouter/openrouterStore.ts
import { createStore } from 'zustand/vanilla';
import { v4 as uuidv4 } from 'uuid';
import type { OpenRouterState, AIModel, StreamChunk, ModelsResponse, ModelPricing, OpenRouterConfig } from './openrouter-type';

export const openrouterStore = createStore<OpenRouterState>((set, get) => ({
  // Initial State - Map을 모두 Record로 변경
  config: {
    endpoint: 'http://127.0.0.1:8787',
    defaultModel: 'openai/gpt-4',
    maxRetries: 3,
    timeout: 30000,
  },
  models: {},
  modelsLoading: false,
  modelsError: undefined,
  activeStreams: {},
  sessionUsage: {},

  // Initialize
  initialize: (config) => {
    console.log('🚀 [openrouterStore] initialize 호출!');
    console.log('⚙️ config:', config);
    set({ config: {
      endpoint: config.endpoint || 'http://127.0.0.1:8787',
      defaultModel: config.defaultModel || 'openai/gpt-4',
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
    } });
    console.log('✅ config 세팅 완료!');
    get().fetchModels().then(() => {
      console.log('📦 모델 목록 fetch 완료!');
    }).catch((err) => {
      console.error('❌ 모델 목록 fetch 실패:', err);
    });
  },

  // Update Config
  updateConfig: (payload: { config?: Partial<OpenRouterConfig> }) => {
    const { config } = payload;
    console.log('🚀 [openrouterStore] updateConfig 호출!');
    console.log('⚙️ config:', config);
    set((state) => ({
      config: config ? { ...state.config, ...config } : state.config
    }));
  },

  // Fetch Models
  fetchModels: async () => {
    set({ modelsLoading: true, modelsError: undefined });
  
    try {
      const { endpoint, apiKey } = get().config;
  
      // 1) 백엔드 엔드포인트 호출
      const response = await fetch(`${endpoint}/openrouter/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
  
      // 2) JSON 파싱 (AIModel[] 배열을 포함하는 응답 형태)
      //    백엔드가 { total: number, models: AIModel[] } 형태로 내려준다고 가정
      const data = (await response.json()) as ModelsResponse;
      console.log(`🤖 [fetchModels] 모델 ${data.models.length}개 받아옴!`);
  
      const famousKeywords = ['gpt', 'claude', 'gemini', 'llama', 'mixtral'];

      const filteredModels = data.models.filter(rawModel =>
        famousKeywords.some(keyword => rawModel.id.toLowerCase().includes(keyword))
      );

      console.log(`🤖 [fetchModels] 모델 ${filteredModels.length}개 받아옴!`);

      // 3) rawModel(원본 AIModel 타입)에 없는 vendor, supports~ 필드를 가공하여
      //    최종적으로 "프론트에서 사용할 AIModel"을 완성
      const modelsRecord: Record<string, AIModel> = {};

      filteredModels.forEach((rawModel) => {
        // ... (기존 모델 가공 코드 동일)
        // (A) vendor: id 앞부분
        const vendor = rawModel.id.split('/')[0];
        const supportsStreaming = true;
        const supportsTools =
          rawModel.id.includes('gpt-4') ||
          rawModel.id.includes('claude-3') ||
          rawModel.id.includes('gemini');
        const pricing: ModelPricing = {
          prompt: rawModel.pricing.prompt,
          completion: rawModel.pricing.completion,
          request: rawModel.pricing.request,
          image: rawModel.pricing.image,
          web_search: rawModel.pricing.web_search,
          internal_reasoning: rawModel.pricing.internal_reasoning,
          input_cache_read: rawModel.pricing.input_cache_read,
          input_cache_write: rawModel.pricing.input_cache_write,
        };
        const modelObj: AIModel = {
          id: rawModel.id,
          name: rawModel.name,
          created: rawModel.created,
          description: rawModel.description,
          context_length: rawModel.context_length,
          hugging_face_id: rawModel.hugging_face_id,
          architecture: rawModel.architecture,
          pricing,
          top_provider: rawModel.top_provider,
          per_request_limits: rawModel.per_request_limits,
          supported_parameters: rawModel.supported_parameters,
          vendor,
          supportsStreaming,
          supportsTools,
        };
        modelsRecord[rawModel.id] = modelObj;
        console.log(
          `  🏷️ ${modelObj.id} | ${modelObj.name} | 벤더: ${vendor} | ` +
            `프롬프트 단가: ${parseFloat(pricing.prompt)}`
        );
      });

      // data.models.forEach((rawModel) => {
      //   // (A) vendor: id 앞부분 (예: "deepseek/deepseek-..." → "deepseek")
      //   const vendor = rawModel.id.split('/')[0];
  
      //   // (B) supportsStreaming: 필요하다면 rawModel.architecture 등을 보고 결정하거나, 
      //   //     여기서는 "모든 모델이 스트리밍 가능"이라 가정해 true로 설정
      //   const supportsStreaming = true;
  
      //   // (C) supportsTools: id에 특정 키워드 포함 시 true
      //   const supportsTools =
      //     rawModel.id.includes('gpt-4') ||
      //     rawModel.id.includes('claude-3') ||
      //     rawModel.id.includes('gemini');
  
      //   // (D) pricing: 필드를 그대로 string으로 유지하되,
      //   //     (필요하다면 parseFloat로 숫자화)
      //   const pricing: ModelPricing = {
      //     prompt: rawModel.pricing.prompt,
      //     completion: rawModel.pricing.completion,
      //     request: rawModel.pricing.request,
      //     image: rawModel.pricing.image,
      //     web_search: rawModel.pricing.web_search,
      //     internal_reasoning: rawModel.pricing.internal_reasoning,
      //     // rawModel.pricing.input_cache_read/… 가 존재할 수도 있고, 없을 수도 있음
      //     input_cache_read: rawModel.pricing.input_cache_read,
      //     input_cache_write: rawModel.pricing.input_cache_write,
      //   };
  
      //   // (E) 최종 AIModel 객체 조립
      //   const modelObj: AIModel = {
      //     id: rawModel.id,
      //     name: rawModel.name,
      //     created: rawModel.created,
      //     description: rawModel.description,
      //     context_length: rawModel.context_length,
      //     hugging_face_id: rawModel.hugging_face_id,
      //     architecture: rawModel.architecture,
      //     pricing,
      //     top_provider: rawModel.top_provider,
      //     per_request_limits: rawModel.per_request_limits,
      //     supported_parameters: rawModel.supported_parameters,
      //     vendor,
      //     supportsStreaming,
      //     supportsTools,
      //   };
  
      //   modelsRecord[rawModel.id] = modelObj;
  
      //   console.log(
      //     `  🏷️ ${modelObj.id} | ${modelObj.name} | 벤더: ${vendor} | ` +
      //       `프롬프트 단가: ${parseFloat(pricing.prompt)}`
      //   );
      // });
  
      // 4) Zustand 상태 업데이트
      set({
        models: modelsRecord,
        modelsLoading: false,
      });
  
      // 5) 컴포넌트에서 사용하기 편하도록 배열 형태로 반환
      return Object.values(modelsRecord) as AIModel[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({
        modelsError: errorMessage,
        modelsLoading: false,
      });
      throw error;
    }
  },
  // Get Model
  getModel: (modelId) => {
    return get().models[modelId];
  },

  // Create Completion
  createCompletion: async (payload) => {
    const { model, messages, tools, temperature, maxTokens, sessionId } = payload;
    const { endpoint, apiKey, maxRetries, timeout } = get().config;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout!);

        const response = await fetch(`${endpoint}/openrouter/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            tools: tools,
            temperature: temperature ?? 0.7,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Unknown error');
        }

        // 세션별 사용량 추적
        if (sessionId && data.usage) {
          set((state) => {
            const usage = state.sessionUsage[sessionId!] || {
              totalTokens: 0,
              totalCost: 0,
              requestCount: 0,
            };

            return {
              sessionUsage: {
                ...state.sessionUsage,
                [sessionId!]: {
                  totalTokens: usage.totalTokens + data.usage.total_tokens,
                  totalCost: usage.totalCost + (data.usage.total_cost || 0),
                  requestCount: usage.requestCount + 1,
                },
              },
            };
          });
        }

        return {
          content: data.response,
          toolCalls: data.toolCalls,
          usage: data.usage,
        };
      } catch (error) {
        lastError = error as Error;
        const err: any = error;
        if (err.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        if (attempt < maxRetries! - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  },

  // Create Streaming Completion
  async *createStreamingCompletion(payload) {
    const { model, messages, tools, temperature, maxTokens, onChunk, sessionId } = payload;
    const content = payload.content ?? (messages && messages.length > 0 ? messages[messages.length - 1].content : '');
    const { endpoint, apiKey, timeout } = get().config;
    const streamId = 'Stream-' + uuidv4();
    const controller = new AbortController();

    // Register stream - Record 방식으로
    set((state) => ({
      activeStreams: {
        ...state.activeStreams,
        [streamId]: controller,
      },
    }));

    try {
      const response = await fetch(`${endpoint}/openrouter/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          sessionId,
          message: content,
          model: model,
          messages: messages,
          tools: tools,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Stream error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const chunk = JSON.parse(data) as StreamChunk;

              if (onChunk) {
                onChunk(chunk);
              }

              yield chunk;
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }

      yield { type: 'done' as const };
    } catch (error) {
      const err: any = error;
      if (err.name !== 'AbortError') {
        const errorChunk: StreamChunk = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        if (onChunk) {
          onChunk(errorChunk);
        }
        yield errorChunk;
      }
    } finally {
      // Cleanup - Record 방식으로
      set((state) => {
        const { [streamId]: removed, ...activeStreams } = state.activeStreams;
        return { activeStreams };
      });
    }
  },

  // Abort Stream
  abortStream: (streamId) => {
    const controller = get().activeStreams[streamId];
    if (controller) {
      controller.abort();

      set((state) => {
        const { [streamId]: removed, ...activeStreams } = state.activeStreams;
        return { activeStreams };
      });
    }
  },

  // Abort All Streams
  abortAllStreams: () => {
    const streams = get().activeStreams;
    Object.values(streams).forEach((controller) => controller.abort());
    set({ activeStreams: {} });
  },

  // Validate Model
  validateModel: (modelId) => {
    return modelId in get().models;
  },

  // Estimate Tokens
  estimateTokens: (messages) => {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  },
}));