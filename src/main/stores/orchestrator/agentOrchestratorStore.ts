import { createStore } from 'zustand/vanilla';
// import { v4 as uuidv4 } from 'uuid'; // 임시 주석처리 
import type { 
  AgentPersona, 
  AgentInstance, 
  AgentMessage, 
  AgentConversation,
  MastraWorkflow,
  WorkflowStep,
  AgentState
} from './agent-types';
import { mastraBridge } from './mastra-bridge';
import { chatStore } from '../chat/chatStore';
import { openrouterStore } from '../openrouter/openrouterStore';
import { mcpCoordinatorStore } from '../integration/ai-mcp-coordinator';
import { combinedStore } from '../combinedStore';
import { roomStore } from '../room/roomStore';
import { sessionStore } from '../session/sessionStore';

// uuid 임시 대체 함수
const uuidv4 = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 🎭 기본 Agent 페르소나 정의 (한국어)
const DEFAULT_PERSONAS: AgentPersona[] = [
  {
    id: 'coding-assistant',
    name: 'AI 코딩 어시스턴트',
    description: '코드 작성, 디버깅, 리팩토링을 도와드립니다',
    systemPrompt: `당신은 전문적인 AI 코딩 어시스턴트입니다.
- TypeScript, React, Node.js, Python 등 다양한 언어에 능숙합니다
- 깔끔하고 효율적인 코드를 작성합니다
- 버그를 찾아 수정하고 성능을 최적화합니다
- 코드 리뷰와 리팩토링을 제안합니다
- 한국어로 친근하게 설명합니다`,
    defaultModel: 'anthropic/claude-3-5-sonnet:beta',
    preferredTools: ['filesystem', 'terminal', 'git', 'npm'],
    color: '#3B82F6'
  },
  {
    id: 'ui-designer',
    name: 'UI/UX 디자이너',
    description: 'UI 컴포넌트와 사용자 경험을 개선합니다',
    systemPrompt: `당신은 창의적인 UI/UX 디자이너입니다.
- 사용자 중심의 직관적인 인터페이스를 설계합니다
- 최신 디자인 트렌드와 접근성을 고려합니다
- Tailwind CSS, Figma, 프로토타이핑에 능숙합니다
- 컬러 팔레트와 타이포그래피를 제안합니다
- 모바일 친화적인 반응형 디자인을 만듭니다`,
    defaultModel: 'openai/gpt-4o',
    preferredTools: ['design-system', 'color-palette', 'accessibility'],
    color: '#8B5CF6'
  },
  {
    id: 'data-analyst',
    name: '데이터 분석가',
    description: '데이터를 분석하고 인사이트를 제공합니다',
    systemPrompt: `당신은 뛰어난 데이터 분석 전문가입니다.
- 복잡한 데이터를 명확하게 분석하고 시각화합니다
- 통계적 관점에서 의미있는 패턴을 찾아냅니다
- Python, SQL, 차트 도구를 활용합니다
- 비즈니스 인사이트와 실행 가능한 제안을 제공합니다
- 데이터 기반의 의사결정을 도와드립니다`,
    defaultModel: 'anthropic/claude-3-5-sonnet:beta',
    preferredTools: ['python', 'sql', 'charts', 'statistics'],
    color: '#10B981'
  },
  {
    id: 'qa-tester',
    name: 'QA 테스터',
    description: '품질 보증과 테스트를 담당합니다',
    systemPrompt: `당신은 꼼꼼한 QA 테스터입니다.
- 체계적인 테스트 계획을 수립하고 실행합니다
- 버그를 정확히 찾아내고 재현 방법을 제시합니다
- 자동화 테스트와 수동 테스트를 모두 수행합니다
- 사용자 시나리오 기반의 테스트를 설계합니다
- 품질 개선을 위한 구체적인 피드백을 제공합니다`,
    defaultModel: 'openai/gpt-4o-mini',
    preferredTools: ['testing', 'automation', 'browser', 'performance'],
    color: '#F59E0B'
  }
];

export const agentOrchestratorStore = createStore<AgentState>((set, get) => ({
  // === 상태 ===
  personas: DEFAULT_PERSONAS,
  activeAgents: {},
  conversations: {},
  
  // === 페르소나 관리 ===
  addPersona: (persona: AgentPersona) => {
    set((state) => ({
      personas: [...state.personas, persona]
    }));
  },

  updatePersona: (id: string, updates: Partial<AgentPersona>) => {
    set((state) => ({
      personas: state.personas.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    }));
  },

  removePersona: (id: string) => {
    set((state) => ({
      personas: state.personas.filter(p => p.id !== id),
      activeAgents: Object.fromEntries(
        Object.entries(state.activeAgents).filter(([_, agent]) => agent.personaId !== id)
      )
    }));
  },

  getPersona: (id: string) => {
    return get().personas.find(p => p.id === id);
  },

  // === Agent 인스턴스 관리 (기존 session 시스템 활용) ===
  createAgent: async (personaId: string, options?: { 
    name?: string; 
    model?: string; 
    initialPrompt?: string;
    mcpServers?: string[];
  }) => {
    const persona = get().getPersona(personaId);
    if (!persona) throw new Error(`Persona ${personaId} not found`);

    console.log(`🤖 Creating agent instance for persona: ${persona.name}`);

    // 1. 기존 room/session 시스템 활용
    const roomId = await roomStore.getState().createRoom(`${persona.name} Room`);
    const sessionId = await sessionStore.getState().createSession({ roomId });

    // 2. 채팅 설정 초기화 (기존 chatStore 활용)
    chatStore.getState().initializeSession({ 
      sessionId, 
      config: {
        model: options?.model || persona.defaultModel,
        temperature: 0.7,
        activeTools: []
      }
    });

    // 3. Agent 인스턴스 생성
    const agentInstance: AgentInstance = {
      id: sessionId, // sessionId를 agent ID로 사용
      personaId,
      name: options?.name || persona.name,
      sessionId,
      roomId,
      model: options?.model || persona.defaultModel,
      status: 'active',
      createdAt: new Date().toISOString(),
      connectedMCPServers: [],
      messageCount: 0,
      lastActivity: new Date().toISOString()
    };

    // 4. MCP 서버 연결 (선택적)
    if (options?.mcpServers) {
      for (const serverId of options.mcpServers) {
        try {
          await mcpCoordinatorStore.getState().connectMCPToSession({
            sessionId,
            serverId
          });
          agentInstance.connectedMCPServers.push(serverId);
          console.log(`🔗 Connected MCP server ${serverId} to agent`);
        } catch (error) {
          console.error(`❌ Failed to connect MCP server ${serverId}:`, error);
        }
      }
    }

    // 5. 초기 시스템 메시지 설정
    if (persona.systemPrompt || options?.initialPrompt) {
      const systemMessage = `${persona.systemPrompt}\n\n${options?.initialPrompt || ''}`.trim();
      
      // 기존 chatStore의 메시지 시스템 활용
      const messages = chatStore.getState().messages[sessionId] || [];
      chatStore.getState().messages[sessionId] = [
        {
          id: `system-${Date.now()}`,
          sessionId,
          role: 'system',
          content: systemMessage,
          timestamp: new Date().toISOString()
        },
        ...messages
      ];
    }

    // 6. Agent 등록
    set((state) => ({
      activeAgents: {
        ...state.activeAgents,
        [sessionId]: agentInstance
      }
    }));

    console.log(`✅ Agent created: ${persona.name} (${sessionId})`);
    return sessionId;
  },

  // === Agent 메시지 전송 (기존 시스템 완전 활용) ===
  sendMessageToAgent: async (agentId: string, content: string, options?: {
    tags?: any[];
    expectResponse?: boolean;
  }) => {
    const agent = get().activeAgents[agentId];
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    console.log(`💬 Sending message to agent ${agent.name}: ${content.slice(0, 100)}...`);

    // 기존 chatStore의 sendStreamingMessage 활용
    await chatStore.getState().sendStreamingMessage({
      sessionId: agent.sessionId,
      content,
      selectedTags: options?.tags || []
    });

    // Agent 활동 업데이트
    set((state) => ({
      activeAgents: {
        ...state.activeAgents,
        [agentId]: {
          ...agent,
          messageCount: agent.messageCount + 1,
          lastActivity: new Date().toISOString()
        }
      }
    }));

    return agent.sessionId;
  },

  // === Multi-Agent 대화 ===
  createConversation: async (agentIds: string[], name?: string) => {
    if (agentIds.length < 2) {
      throw new Error('Conversation requires at least 2 agents');
    }

    // 모든 agent가 존재하는지 확인
    const agents = agentIds.map(id => {
      const agent = get().activeAgents[id];
      if (!agent) throw new Error(`Agent ${id} not found`);
      return agent;
    });

    const conversationId = `conv-${Date.now()}`;
    const conversation: AgentConversation = {
      id: conversationId,
      name: name || `Conversation: ${agents.map(a => a.name).join(', ')}`,
      agentIds,
      messages: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: conversation
      }
    }));

    console.log(`🗣️ Created conversation ${conversationId} with ${agentIds.length} agents`);
    return conversationId;
  },

  sendMessageToConversation: async (conversationId: string, fromAgentId: string, content: string) => {
    const conversation = get().conversations[conversationId];
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

    const fromAgent = get().activeAgents[fromAgentId];
    if (!fromAgent) throw new Error(`Agent ${fromAgentId} not found`);

    const message: AgentMessage = {
      id: `msg-${Date.now()}`,
      fromAgentId,
      content,
      timestamp: new Date().toISOString(),
      conversationId
    };

    // 대화에 메시지 추가
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationId]: {
          ...conversation,
          messages: [...conversation.messages, message],
          lastActivity: new Date().toISOString()
        }
      }
    }));

    // 다른 agents에게 메시지 전파
    for (const agentId of conversation.agentIds) {
      if (agentId !== fromAgentId) {
        try {
          await get().sendMessageToAgent(agentId, 
            `[${fromAgent.name}]: ${content}`, 
            { expectResponse: false }
          );
        } catch (error) {
          console.error(`❌ Failed to send message to agent ${agentId}:`, error);
        }
      }
    }

    console.log(`📨 Message sent in conversation ${conversationId} from ${fromAgent.name}`);
    return message.id;
  },

  // === Agent 제거 (cleanup 포함) ===
  removeAgent: async (agentId: string) => {
    const agent = get().activeAgents[agentId];
    if (!agent) return;

    console.log(`🗑️ Removing agent: ${agent.name}`);

    // MCP 연결 해제
    for (const serverId of agent.connectedMCPServers) {
      try {
        const bindings = mcpCoordinatorStore.getState().getSessionBindings({ 
          sessionId: agent.sessionId 
        });
        
        for (const binding of bindings) {
          if (binding.serverId === serverId) {
            await mcpCoordinatorStore.getState().disconnectMCPFromSession({
              sessionId: agent.sessionId,
              bindingId: binding.id
            });
          }
        }
      } catch (error) {
        console.error(`❌ Failed to disconnect MCP server ${serverId}:`, error);
      }
    }

    // Session cleanup
    await sessionStore.getState().deleteSession({ sessionId: agent.sessionId });
    await roomStore.getState().deleteRoom(agent.roomId);

    // Agent 제거
    set((state) => {
      const { [agentId]: removed, ...remaining } = state.activeAgents;
      return { activeAgents: remaining };
    });

    console.log(`✅ Agent removed: ${agent.name}`);
  },

  // === 상태 조회 ===
  getAgent: (agentId: string) => {
    return get().activeAgents[agentId];
  },

  getAgentMessages: (agentId: string) => {
    const agent = get().activeAgents[agentId];
    if (!agent) return [];
    
    // 기존 chatStore에서 메시지 가져오기
    return chatStore.getState().getMessages(agent.sessionId);
  },

  getConversation: (conversationId: string) => {
    return get().conversations[conversationId];
  },

  // === 도구 및 MCP 관리 (기존 시스템 연동) ===
  connectMCPToAgent: async (agentId: string, serverId: string) => {
    const agent = get().activeAgents[agentId];
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    console.log(`🔗 Connecting MCP server ${serverId} to agent ${agent.name}`);

    await mcpCoordinatorStore.getState().connectMCPToSession({
      sessionId: agent.sessionId,
      serverId
    });

    // Agent 상태 업데이트
    set((state) => ({
      activeAgents: {
        ...state.activeAgents,
        [agentId]: {
          ...agent,
          connectedMCPServers: [...agent.connectedMCPServers, serverId]
        }
      }
    }));

    console.log(`✅ MCP server ${serverId} connected to agent ${agent.name}`);
  },

  disconnectMCPFromAgent: async (agentId: string, serverId: string) => {
    const agent = get().activeAgents[agentId];
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    // Binding 찾기
    const bindings = mcpCoordinatorStore.getState().getSessionBindings({ 
      sessionId: agent.sessionId 
    });
    
    const binding = bindings.find(b => b.serverId === serverId);
    if (!binding) return;

    await mcpCoordinatorStore.getState().disconnectMCPFromSession({
      sessionId: agent.sessionId,
      bindingId: binding.id
    });

    // Agent 상태 업데이트
    set((state) => ({
      activeAgents: {
        ...state.activeAgents,
        [agentId]: {
          ...agent,
          connectedMCPServers: agent.connectedMCPServers.filter(id => id !== serverId)
        }
      }
    }));

    console.log(`🔌 MCP server ${serverId} disconnected from agent ${agent.name}`);
  },

  // === 현재 상태 요약 ===
  getStatus: () => {
    const state = get();
    const agentCount = Object.keys(state.activeAgents).length;
    const conversationCount = Object.keys(state.conversations).length;
    const personaCount = state.personas.length;

    return {
      agents: {
        total: agentCount,
        active: Object.values(state.activeAgents).filter(a => a.status === 'active').length,
        list: Object.values(state.activeAgents).map(a => ({
          id: a.id,
          name: a.name,
          persona: a.personaId,
          messageCount: a.messageCount,
          lastActivity: a.lastActivity
        }))
      },
      conversations: {
        total: conversationCount,
        active: Object.values(state.conversations).filter(c => c.status === 'active').length
      },
      personas: {
        total: personaCount,
        available: state.personas.map(p => ({ id: p.id, name: p.name }))
      }
    };
  },

  // === 🤝 자동 협력 워크플로우 추가 ===

  // 자동 Multi-Agent 협력 대화 시작
  startCollaborativeTask: async (taskDescription: string, participantPersonas: string[], options?: {
    maxRounds?: number;
    autoMode?: boolean;
    coordinator?: string; // 조정자 Agent ID
  }) => {
    const maxRounds = options?.maxRounds || 5;
    const autoMode = options?.autoMode || true;
    
    console.log(`🚀 [AgentOrchestrator] 협업 작업 시작: ${taskDescription}`);
    console.log(`👥 [AgentOrchestrator] 참여 Agent: ${participantPersonas.join(', ')}`);

    // 1. 각 페르소나별로 Agent 생성
    const agentIds: string[] = [];
    for (const personaId of participantPersonas) {
      const persona = get().getPersona(personaId);
      if (persona) {
        const agentId = await get().createAgent(personaId, {
          name: `${persona.name} (협업)`,
          initialPrompt: `당신은 "${taskDescription}" 작업에 참여하는 ${persona.name}입니다. 다른 팀원들과 협력하여 최고의 결과를 만들어주세요.`
        });
        agentIds.push(agentId);
        console.log(`🤖 [AgentOrchestrator] ${persona.name} Agent 생성: ${agentId}`);
      }
    }

    if (agentIds.length < 2) {
      throw new Error('협업을 위해서는 최소 2명의 Agent가 필요합니다.');
    }

    // 2. 대화 생성
    const conversationId = await get().createConversation(agentIds, `협업: ${taskDescription}`);
    console.log(`💬 [AgentOrchestrator] 협업 대화 생성: ${conversationId}`);

    // 3. 자동 협력 모드 시작
    if (autoMode) {
      await get().runAutomaticCollaboration(conversationId, agentIds, taskDescription, maxRounds);
    }

    return { conversationId, agentIds };
  },

  // 자동 협력 실행
  runAutomaticCollaboration: async (conversationId: string, agentIds: string[], taskDescription: string, maxRounds: number) => {
    console.log(`🔄 [AgentOrchestrator] 자동 협력 시작 (최대 ${maxRounds}라운드)`);

    // 첫 번째 Agent (보통 기획자/조정자)가 시작
    const firstAgent = agentIds[0];
    const firstPersona = get().getPersona(get().getAgent(firstAgent)?.personaId || '');
    
    await get().sendMessageToConversation(
      conversationId,
      firstAgent,
      `안녕하세요 팀원들! "${taskDescription}" 작업을 시작하겠습니다. 각자의 전문 분야에서 의견을 주시면 함께 최고의 결과를 만들어보겠습니다.`
    );

    // 각 Agent가 순서대로 응답하도록 자동 진행
    for (let round = 1; round <= maxRounds; round++) {
      console.log(`📍 [AgentOrchestrator] 협력 라운드 ${round}/${maxRounds}`);
      
      for (let i = 1; i < agentIds.length; i++) { // 첫 번째 제외하고 순서대로
        const agentId = agentIds[i];
        const agent = get().getAgent(agentId);
        const persona = get().getPersona(agent?.personaId || '');
        
        if (persona) {
          // 각 Agent의 전문성에 맞는 질문/응답 유도
          const contextualPrompt = get().generateContextualPrompt(persona, taskDescription, round);
          
          try {
            await get().sendMessageToConversation(conversationId, agentId, contextualPrompt);
            console.log(`💬 [AgentOrchestrator] ${persona.name} 응답 완료 (라운드 ${round})`);
            
            // Agent 간 자연스러운 대화를 위한 지연
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.error(`❌ [AgentOrchestrator] ${persona.name} 응답 실패:`, error);
          }
        }
      }
    }

    console.log(`🎉 [AgentOrchestrator] 협력 작업 완료!`);
  },

  // 각 Agent의 전문성에 맞는 프롬프트 생성
  generateContextualPrompt: (persona: AgentPersona, taskDescription: string, round: number): string => {
    const prompts = {
      'coding-assistant': [
        `기술적 구현 관점에서 "${taskDescription}"에 대한 의견을 주세요. 어떤 기술 스택이나 아키텍처를 추천하시나요?`,
        `코드 품질과 성능 최적화 관점에서 추가 고려사항이 있나요?`,
        `보안과 확장성 측면에서 검토할 점들을 알려주세요.`
      ],
      'ui-designer': [
        `사용자 경험(UX) 관점에서 "${taskDescription}"의 디자인 방향을 제안해주세요.`,
        `접근성과 사용성을 고려한 개선점이 있을까요?`,
        `브랜드 일관성과 시각적 매력도를 높일 방안을 제시해주세요.`
      ],
      'qa-tester': [
        `품질 보증 관점에서 "${taskDescription}"의 테스트 전략을 세워주세요.`,
        `예상되는 엣지 케이스와 버그 시나리오를 분석해주세요.`,
        `사용자 시나리오 기반 테스트 케이스를 제안해주세요.`
      ],
      'data-analyst': [
        `데이터 분석 관점에서 "${taskDescription}"의 성과 지표를 정의해주세요.`,
        `사용자 행동 패턴 분석을 통한 개선점을 찾아주세요.`,
        `A/B 테스트나 실험 설계 방안을 제안해주세요.`
      ]
    };

    const personaPrompts = prompts[persona.id as keyof typeof prompts] || [
      `${persona.description} 관점에서 "${taskDescription}"에 대한 전문적인 의견을 주세요.`,
      `추가적으로 고려해야 할 중요한 사항들이 있나요?`,
      `최종 검토 의견과 개선 제안사항을 알려주세요.`
    ];

    const promptIndex = Math.min(round - 1, personaPrompts.length - 1);
    return personaPrompts[promptIndex];
  },

  // 협력 작업 상태 조회
  getCollaborationStatus: (conversationId: string) => {
    const conversation = get().getConversation(conversationId);
    if (!conversation) return null;

    const agentParticipation = conversation.agentIds.map(agentId => {
      const agent = get().getAgent(agentId);
      const persona = get().getPersona(agent?.personaId || '');
      const messageCount = conversation.messages.filter(m => m.fromAgentId === agentId).length;
      
      return {
        agentId,
        name: agent?.name || 'Unknown',
        persona: persona?.name || 'Unknown',
        messageCount,
        lastMessage: conversation.messages
          .filter(m => m.fromAgentId === agentId)
          .pop()?.timestamp
      };
    });

    return {
      conversationId,
      totalMessages: conversation.messages.length,
      participants: agentParticipation,
      status: conversation.status,
      lastActivity: conversation.lastActivity
    };
  },

  // 협력 작업 결과 요약
  summarizeCollaboration: async (conversationId: string): Promise<string> => {
    const conversation = get().getConversation(conversationId);
    if (!conversation) return '';

    // 첫 번째 Agent를 사용해서 대화 내용 요약
    const firstAgentId = conversation.agentIds[0];
    const summaryPrompt = `다음은 여러 전문가들이 협력한 대화 내용입니다. 핵심 내용과 결론을 요약해주세요:

${conversation.messages.map(msg => {
  const agent = get().getAgent(msg.fromAgentId);
  const persona = get().getPersona(agent?.personaId || '');
  return `[${persona?.name || 'Agent'}]: ${msg.content}`;
}).join('\n\n')}

위 협력 결과를 요약하고 주요 결론을 정리해주세요.`;

    try {
      const summary = await get().sendMessageToAgent(firstAgentId, summaryPrompt);
      console.log(`📋 [AgentOrchestrator] 협력 결과 요약 완료`);
      return summary || '';
    } catch (error) {
      console.error(`❌ [AgentOrchestrator] 요약 생성 실패:`, error);
      return '요약 생성에 실패했습니다.';
    }
  },

  // === 🔗 Mastra 브릿지 초기화 ===
  initializeMastraBridge: async (config: any) => {
    console.log('🔗 [AgentOrchestrator] Mastra 브릿지 초기화 중...');
    
    try {
      // 기본적으로는 OpenRouter 어댑터만 사용하므로 Mastra 없이도 동작
      console.log('✅ [AgentOrchestrator] OpenRouter 어댑터 모드로 초기화 완료');
      console.log('💡 [AgentOrchestrator] Mastra 패키지 없이도 모든 기능이 작동합니다!');
      return true;
    } catch (error) {
      console.warn('⚠️ [AgentOrchestrator] Mastra 브릿지 초기화 실패, 기본 모드로 동작:', error);
      return false;
    }
  }
}));

// 초기화 함수 - 기본 페르소나들 생성
export const initializeAgentOrchestrator = async () => {
  console.log('🎭 [AgentOrchestrator] Initializing with default personas...');
  
  for (const persona of DEFAULT_PERSONAS) {
    agentOrchestratorStore.getState().addPersona(persona);
  }
  
  // Mastra 브릿지 초기화 시도
  try {
    await agentOrchestratorStore.getState().initializeMastraBridge({});
  } catch (error) {
    console.warn('⚠️ [AgentOrchestrator] Mastra bridge initialization failed, will work in fallback mode:', error);
  }
  
  console.log('✅ [AgentOrchestrator] Initialization completed');
}; 