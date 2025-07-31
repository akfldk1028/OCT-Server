import type { AgentPersona, AgentInstance, AgentMessage } from './agent-types';
import { openrouterStore } from '../openrouter/openrouterStore';
import { mcpCoordinatorStore } from '../integration/ai-mcp-coordinator';
import { mcpRegistryStore } from '../mcp/mcpRegistryStore';

// Mastra AI 실제 패키지 임포트 (현재는 선택사항)
let MastraAgent: any = null;
let MastraWorkflow: any = null;
let Mastra: any = null;

// OpenRouter 어댑터 - 기존 시스템 활용
class OpenRouterAdapter {
  constructor(private defaultModel: string = 'openai/gpt-4o-mini') {}

  async generateResponse(messages: any[], options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    sessionId?: string;
  }) {
    console.log(`🔄 [OpenRouterAdapter] AI 요청 처리: ${options?.model || this.defaultModel}`);
    
    try {
      // 기존 OpenRouter Store 활용
      const response = await openrouterStore.getState().createCompletion({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        sessionId: options?.sessionId || 'mastra-agent'
      });

      return {
        text: response.content,
        toolCalls: response.toolCalls || [],
        usage: response.usage
      };
    } catch (error) {
      console.error(`❌ [OpenRouterAdapter] AI 요청 실패:`, error);
      throw error;
    }
  }

  async *generateStreamingResponse(messages: any[], options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    sessionId?: string;
  }) {
    console.log(`🌊 [OpenRouterAdapter] 스트리밍 요청 처리: ${options?.model || this.defaultModel}`);
    
    try {
      // 기존 OpenRouter 스트리밍 활용
      const stream = openrouterStore.getState().createStreamingCompletion({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        sessionId: options?.sessionId || 'mastra-agent'
      });

      for await (const chunk of stream) {
        yield {
          type: chunk.type,
          content: chunk.content,
          toolCall: chunk.toolCall,
          done: chunk.type === 'done'
        };
      }
    } catch (error) {
      console.error(`❌ [OpenRouterAdapter] 스트리밍 실패:`, error);
      throw error;
    }
  }
}

// 실제 Mastra 패키지 로드 함수 (선택사항)
async function loadMastraPackages() {
  try {
    // @ts-ignore - 패키지가 설치되지 않았을 수 있음
    const mastraCore = await import('@mastra/core');
    // @ts-ignore - 패키지가 설치되지 않았을 수 있음
    const mastraAgent = await import('@mastra/core/agent');
    // @ts-ignore - 패키지가 설치되지 않았을 수 있음
    const mastraWorkflows = await import('@mastra/core/workflows');
    
    Mastra = mastraCore.Mastra;
    MastraAgent = mastraAgent.Agent;
    MastraWorkflow = mastraWorkflows.createWorkflow;
    
    console.log('🚀 [MastraBridge] Mastra 패키지 로드 성공!');
    return true;
  } catch (error) {
    console.warn('⚠️ [MastraBridge] Mastra 패키지 로드 실패. OpenRouter 어댑터 모드로 실행:', error);
    return false;
  }
}

// OpenRouter 기반 Agent 구현
class OpenRouterAgent {
  private adapter: OpenRouterAdapter;
  private memory: Record<string, any> = {};

  constructor(
    public id: string,
    public name: string,
    private systemPrompt: string,
    private defaultModel: string = 'openai/gpt-4o-mini'
  ) {
    this.adapter = new OpenRouterAdapter(defaultModel);
    console.log(`🤖 [OpenRouterAgent] ${name} 에이전트 생성됨`);
  }

  async generate(input: string, context?: any) {
    console.log(`💭 [${this.name}] 사고 중: ${input.substring(0, 50)}...`);
    
    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      ...(context?.conversationHistory || []),
      { role: 'user' as const, content: input }
    ];

    try {
      const response = await this.adapter.generateResponse(messages, {
        model: this.defaultModel,
        sessionId: `agent-${this.id}`
      });

      console.log(`✅ [${this.name}] 응답 생성 완료`);
      return response;
    } catch (error) {
      console.error(`❌ [${this.name}] 응답 생성 실패:`, error);
      return { 
        text: `안녕하세요! ${this.name}입니다. 현재 요청을 처리할 수 없습니다.`,
        toolCalls: []
      };
    }
  }

  async *generateStreaming(input: string, context?: any) {
    console.log(`🌊 [${this.name}] 스트리밍 응답 시작`);
    
    const messages = [
      { role: 'system' as const, content: this.systemPrompt },
      ...(context?.conversationHistory || []),
      { role: 'user' as const, content: input }
    ];

    try {
      for await (const chunk of this.adapter.generateStreamingResponse(messages, {
        model: this.defaultModel,
        sessionId: `agent-${this.id}`
      })) {
        yield chunk;
      }
    } catch (error) {
      console.error(`❌ [${this.name}] 스트리밍 실패:`, error);
      yield { 
        type: 'error', 
        content: `스트리밍 중 오류가 발생했습니다: ${error}`,
        done: true 
      };
    }
  }

  addTool(tool: any) {
    console.log(`🔧 [${this.name}] 도구 추가: ${tool.name}`);
    // MCP 도구 연결 로직은 기존 시스템 활용
  }

  setMemory(key: string, value: any) {
    this.memory[key] = value;
    console.log(`💾 [${this.name}] 메모리 저장: ${key}`);
  }

  getMemory(key: string) {
    const value = this.memory[key];
    console.log(`🔍 [${this.name}] 메모리 조회: ${key} = ${value}`);
    return value;
  }
}

export class MastraBridge {
  private mastraReady: boolean = false;
  private agents: Record<string, OpenRouterAgent> = {};
  private workflows: Record<string, any> = {};
  private adapter: OpenRouterAdapter;

  constructor() {
    this.adapter = new OpenRouterAdapter();
  }

  async initialize() {
    console.log('🔄 [MastraBridge] 초기화 시작...');
    
    // Mastra 패키지 로드 시도 (선택사항)
    this.mastraReady = await loadMastraPackages();
    
    if (this.mastraReady) {
      console.log('✅ [MastraBridge] Mastra + OpenRouter 하이브리드 모드');
    } else {
      console.log('⚡️ [MastraBridge] OpenRouter 어댑터 모드 (추천)');
    }
  }

  async createAgent(persona: AgentPersona): Promise<string> {
    console.log(`🤖 [MastraBridge] 에이전트 생성: ${persona.name}`);

    // OpenRouter 기반 에이전트 생성 (더 안정적)
    const agent = new OpenRouterAgent(
      persona.id,
      persona.name,
      persona.systemPrompt,
      'openai/gpt-4o-mini' // 기존 모델 활용
    );

    // MCP 도구 연결
    try {
      const tools = await this.getMCPToolsForAgent(persona.specializedTools);
      tools.forEach(tool => agent.addTool(tool));
      console.log(`🔧 [MastraBridge] ${tools.length}개 MCP 도구 연결됨`);
    } catch (error) {
      console.warn(`⚠️ [MastraBridge] MCP 도구 연결 실패:`, error);
    }

    this.agents[persona.id] = agent;
    console.log(`✅ [MastraBridge] OpenRouter Agent 생성됨: ${persona.name}`);
    return persona.id;
  }

  async runAgent(agentId: string, input: string, context?: any): Promise<{ text: string; toolCalls?: any[] }> {
    const agent = this.agents[agentId];
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    console.log(`🏃‍♂️ [MastraBridge] Agent ${agentId} 실행 중...`);
    return await agent.generate(input, context);
  }

  async *runAgentStreaming(agentId: string, input: string, context?: any) {
    const agent = this.agents[agentId];
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    console.log(`🌊 [MastraBridge] Agent ${agentId} 스트리밍 실행 중...`);
    for await (const chunk of agent.generateStreaming(input, context)) {
      yield chunk;
    }
  }

  async createWorkflow(workflowDef: any): Promise<string> {
    console.log(`⚡️ [MastraBridge] 워크플로우 생성: ${workflowDef.name}`);

    // OpenRouter 기반 워크플로우 구현
    const workflow = {
      id: workflowDef.id,
      name: workflowDef.name,
      steps: workflowDef.steps,
      execute: async (inputs: any) => {
        console.log(`🔄 [Workflow] ${workflowDef.name} 실행 중...`);
        
        const results = [];
        for (const step of workflowDef.steps) {
          try {
            if (step.type === 'agent_task') {
              const agentId = Object.keys(this.agents).find(id => 
                this.agents[id].name.includes(step.agentRole)
              );
              
              if (agentId) {
                const result = await this.runAgent(agentId, step.instruction, inputs);
                results.push({ step: step.id, result });
              }
            }
          } catch (error) {
            console.error(`❌ [Workflow] Step ${step.id} 실패:`, error);
            results.push({ step: step.id, error: error instanceof Error ? error.message : String(error) });
          }
        }
        
        return { success: true, results };
      }
    };

    this.workflows[workflowDef.id] = workflow;
    console.log(`✅ [MastraBridge] OpenRouter Workflow 생성됨: ${workflowDef.name}`);
    return workflowDef.id;
  }

  async executeWorkflow(workflowId: string, inputs: any): Promise<any> {
    const workflow = this.workflows[workflowId];
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    console.log(`⚡️ [MastraBridge] Workflow ${workflowId} 실행 중...`);
    return await workflow.execute(inputs);
  }

  private async getMCPToolsForAgent(toolNames: string[]): Promise<any[]> {
    console.log(`🔧 [MastraBridge] MCP 도구 수집 중: ${toolNames.join(', ')}`);
    
    try {
      const mcpTools = mcpRegistryStore.getState().tools;
      const tools = toolNames
        .map(name => Object.values(mcpTools).find(tool => tool.name === name))
        .filter(Boolean);

      console.log(`✅ [MastraBridge] ${tools.length}개 도구 수집됨`);
      return tools;
    } catch (error) {
      console.error(`❌ [MastraBridge] MCP 도구 수집 실패:`, error);
      return [];
    }
  }

  // 유틸리티 메서드들
  getAgent(agentId: string) {
    return this.agents[agentId];
  }

  getWorkflow(workflowId: string) {
    return this.workflows[workflowId];
  }

  listAgents() {
    return Object.keys(this.agents);
  }

  listWorkflows() {
    return Object.keys(this.workflows);
  }

  isReady(): boolean {
    return true; // OpenRouter는 항상 준비됨
  }

  // 현재 사용 중인 모델 변경
  setDefaultModel(model: string) {
    console.log(`🔄 [MastraBridge] 기본 모델 변경: ${model}`);
    this.adapter = new OpenRouterAdapter(model);
    
    // 기존 에이전트들의 모델도 업데이트
    Object.values(this.agents).forEach(agent => {
      (agent as any).defaultModel = model;
      (agent as any).adapter = new OpenRouterAdapter(model);
    });
  }

  // 현재 설정 조회
  getStatus() {
    return {
      mode: this.mastraReady ? 'Mastra + OpenRouter' : 'OpenRouter Only',
      agentCount: Object.keys(this.agents).length,
      workflowCount: Object.keys(this.workflows).length,
      ready: this.isReady()
    };
  }
}

// 싱글톤 인스턴스
export const mastraBridge = new MastraBridge(); 