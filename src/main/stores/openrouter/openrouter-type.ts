/** (선택) 페이징 등 메타가 포함될 수 있는 최상위 응답 타입 */
export interface ModelsResponse {
  total: number;
  models: AIModel[];
}

// Types.ts
export interface ModelPricing {
  prompt: string;
  completion: string;
  request: string;
  image: string;
  web_search: string;
  internal_reasoning: string;
  input_cache_read?: string;
  input_cache_write?: string;
}


// Types
export interface AIModel {
  // 원본 ID: <vendor>/<model-name>[:<tag>]
  id: string;

  // 원본 name: 사용자 친화적 표시 이름
  name: string;

  // 모델이 등록된 유닉스 타임스탬프(초 단위)
  created: number;

  // 모델 설명(영문)
  description: string;

  // 모델이 한 번에 처리할 수 있는 최대 토큰 길이
  context_length: number;

  // Hugging Face 허브에서 사용되는 ID(예: "deepseek-ai/deepseek-r1-0528-qwen3-8b")
  hugging_face_id: string;

  // 모델 구조(architecture) 정보
  architecture: {
    modality: string;            // 예: "text->text", "image->text" 등
    input_modalities: string[];  // 예: ["text"], ["image", "text"]
    output_modalities: string[]; // 예: ["text"], ["image"]
    tokenizer: string;           // 예: "Qwen", "GPT", "BPE" 등
    instruct_type?: string;      // Instrution-tuned 모델인 경우, 예: "deepseek-r1"
  };

  // 모델 호출 시 과금 단가(문자열 형태). 
  // 실제 비용 계산할 때 parseFloat(rawPricing.prompt) 등으로 숫자로 변환해야 함
  pricing: ModelPricing,
  // 이 모델을 제공하는 Top Provider 인스턴스 정보
  top_provider: {
    context_length: number;          // provider가 지원하는 최대 토큰 수
    max_completion_tokens: number | null; // 한 번에 생성할 최대 토큰 수 (null이면 자동 결정)
    is_moderated: boolean;           // 호출 전에 검열(moderation) 여부
  };

  // 이 모델을 한 요청(request)에서 사용할 수 있는 제한 정보. 
  // null이면 제한 없음
  per_request_limits: {
    max_input_tokens?: number;       // 입력 토큰 최대치
    max_output_tokens?: number;      // 출력 토큰 최대치
    max_images_per_request?: number; // 이미지 생성 시 최대 개수
    [key: string]: number | undefined;
  } | null;

  // 이 모델이 지원하는 API 옵션(파라미터) 키 목록
  supported_parameters: string[]; // 예: ["max_tokens", "temperature", "top_p", ... ]

  // 아래는 원래 있었던 필드나, TypeScript/프론트에서
  // 별도로 가공(추가)하고 싶을 때 사용
  vendor?: string;            // 프론트에서 id.split('/')[0]로 직접 계산해서 채워 줄 수 있음
  supportsStreaming?: boolean; // 스트리밍(sse) 지원 여부, 프론트에서 필요 시 따로 붙임
  supportsTools?: boolean;    // 프론트에서 ID에 따라 "gpt-4" 등 포함 여부 체크 후 채워 줌
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}

export interface OpenRouterConfig {
  endpoint: string;
  apiKey?: string;
  defaultModel?: string;
  maxRetries?: number;
  timeout?: number;
}


// main/stores/openrouter/openrouter-types.ts
export interface OpenRouterState {
  // Configuration
  config: OpenRouterConfig;
  
  // Models - Map을 Record로 변경
  models: Record<string, AIModel>; // Map 대신 Record
  modelsLoading: boolean;
  modelsError?: string;
  
  // Active Streams - Map을 Record로 변경
  activeStreams: Record<string, AbortController>; // Map 대신 Record
  
  // Session Usage Tracking
  sessionUsage: Record<string, {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }>;

  // Actions
  initialize: (config: Partial<OpenRouterConfig>) => void;
  updateConfig: (config: Partial<OpenRouterConfig>) => void;
  fetchModels: () => Promise<AIModel[]>;
  getModel: (modelId: string) => AIModel | undefined;
  createCompletion: (params: {
    model: string;
    messages: AIMessage[];
    tools?: any[];
    temperature?: number;
    maxTokens?: number;
    sessionId?: string; // 세션별 추적을 위해 추가
  }) => Promise<{
    content: string;
    toolCalls?: ToolCall[];
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }>;
  createStreamingCompletion: (params: {
    model: string;
    messages: AIMessage[];
    tools?: any[];
    temperature?: number;
    maxTokens?: number;
    sessionId?: string; // 세션별 추적을 위해 추가
    content?: string; // 메시지 원문(스트리밍용)
    onChunk?: (chunk: StreamChunk) => void;
  }) => AsyncGenerator<StreamChunk>;
  abortStream: (streamId: string) => void;
  abortAllStreams: () => void;
  validateModel: (modelId: string) => boolean;
  estimateTokens: (messages: AIMessage[]) => number;
}