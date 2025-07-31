# 🤖 Agent Orchestrator for OCT

**기존 OCT 시스템과 완전히 연동되는 Multi-Agent 관리 시스템**

## 🎯 핵심 개념

이 Agent Orchestrator는 **기존 OCT의 모든 시스템을 그대로 활용**하는 **조정자(Orchestrator)** 역할만 합니다.

### 📦 시스템 아키텍처

```
🤖 Agent Orchestrator (새로 추가)
        ↓ 조정만 담당
🔄 기존 OCT 시스템들 (그대로 활용)
├── roomStore → sessionStore
├── chatStore → openrouterStore  
├── mcpCoordinatorStore → mcpRegistryStore
├── clientStore → transportStore
└── combinedStore (전체 통합)
```

### ✅ 핵심 장점

- ✅ **기존 투자 보호**: 모든 OCT 시스템 그대로 활용
- ✅ **API 키 불필요**: OpenRouter 설정 그대로 사용  
- ✅ **MCP 도구 연동**: 기존 MCP 서버들 바로 활용
- ✅ **채팅 시스템 통합**: 기존 메시지/스트리밍 시스템 활용
- ✅ **세션 관리**: 기존 room/session 구조 활용

## 🎭 Agent 페르소나 시스템

### 기본 제공 페르소나

1. **🔧 AI 코딩 어시스턴트**
   - TypeScript, React, Node.js 전문
   - 코드 리뷰, 디버깅, 리팩토링
   - 기본 모델: `anthropic/claude-3-5-sonnet:beta`

2. **🎨 UI/UX 디자이너**
   - 사용자 경험 최적화
   - Tailwind CSS, 반응형 디자인
   - 기본 모델: `openai/gpt-4o`

3. **📊 데이터 분석가**
   - 데이터 분석, 시각화, 인사이트
   - Python, SQL, 통계 분석
   - 기본 모델: `anthropic/claude-3-5-sonnet:beta`

4. **🧪 QA 테스터**
   - 체계적 테스트, 버그 발견
   - 자동화 테스트, 품질 보증
   - 기본 모델: `openai/gpt-4o-mini`

### 커스텀 페르소나 생성

```typescript
const customPersona: AgentPersona = {
  id: 'my-specialist',
  name: '내 전문 어시스턴트',
  description: '특정 도메인 전문가',
  systemPrompt: '당신은 ... 전문가입니다',
  defaultModel: 'anthropic/claude-3-5-sonnet:beta',
  preferredTools: ['filesystem', 'web-search'],
  color: '#FF6B6B'
};

agentOrchestratorStore.getState().addPersona(customPersona);
```

## 🔄 기존 시스템 연동 방식

### 1. **Room/Session 시스템 활용**

```typescript
// Agent 생성 시 자동으로 room과 session 생성
const agentId = await agentOrchestrator.createAgent('coding-assistant', {
  name: '내 코딩 어시스턴트',
  model: 'anthropic/claude-3-5-sonnet:beta'
});

// → 내부적으로 실행되는 기존 시스템 호출:
// 1. roomStore.createRoom()
// 2. sessionStore.createSession()
// 3. chatStore.initializeSession()
```

### 2. **ChatStore 메시지 시스템 활용**

```typescript
// Agent에게 메시지 전송
await agentOrchestrator.sendMessageToAgent(agentId, "React 컴포넌트를 최적화해주세요");

// → 내부적으로 기존 chatStore.sendStreamingMessage() 호출
// → OpenRouter API를 통해 AI 응답 생성
// → 기존 메시지 시스템에 저장
```

### 3. **MCP 도구 연동**

```typescript
// Agent에 MCP 서버 연결
await agentOrchestrator.connectMCPToAgent(agentId, 'filesystem-server');

// → 내부적으로 실행:
// 1. mcpCoordinatorStore.connectMCPToSession()
// 2. 기존 transport/client 시스템 활용
// 3. 도구가 자동으로 AI에게 제공됨
```

## 🗣️ Multi-Agent 대화 시스템

### 대화 생성

```typescript
// 여러 Agent 간의 협업 대화 생성
const conversationId = await agentOrchestrator.createConversation(
  ['coding-assistant-id', 'ui-designer-id'], 
  'UI 컴포넌트 개발 협업'
);

// 대화에 메시지 전송
await agentOrchestrator.sendMessageToConversation(
  conversationId, 
  'coding-assistant-id',
  "새로운 버튼 컴포넌트가 필요합니다"
);

// → 자동으로 다른 Agent들에게 메시지 전파
// → 각 Agent가 기존 chatStore를 통해 응답 생성
```

### 협업 워크플로우 예시

1. **코딩 어시스턴트**: "로그인 폼을 만들었습니다"
2. **UI 디자이너**: "접근성을 개선하고 시각적 디자인을 제안드립니다"  
3. **QA 테스터**: "테스트 시나리오와 엣지 케이스를 확인했습니다"
4. **데이터 분석가**: "사용자 행동 패턴을 분석해 최적화 방안을 제시합니다"

## 🔧 실제 사용 예시

### 기본 Agent 생성

```typescript
import { agentOrchestratorStore } from '@/main/stores/orchestrator/agentOrchestratorStore';

// 1. 코딩 어시스턴트 생성
const codingAgentId = await agentOrchestratorStore.getState().createAgent(
  'coding-assistant', 
  {
    name: '프로젝트 코딩 어시스턴트',
    model: 'anthropic/claude-3-5-sonnet:beta',
    initialPrompt: '이 프로젝트는 React TypeScript 기반입니다.',
    mcpServers: ['filesystem-server', 'git-server'] // 자동 연결
  }
);

// 2. 메시지 전송 (기존 채팅 시스템 활용)
await agentOrchestratorStore.getState().sendMessageToAgent(
  codingAgentId,
  "사용자 인증 컴포넌트를 만들어주세요",
  { 
    tags: [
      { type: 'tool', name: 'read_file' },
      { type: 'tool', name: 'write_file' }
    ]
  }
);

// 3. Agent 메시지 확인 (기존 chatStore에서)
const messages = agentOrchestratorStore.getState().getAgentMessages(codingAgentId);
```

### UI 컴포넌트에서 사용

```typescript
import { useStore } from 'zustand';
import { combinedStore } from '@/main/stores/combinedStore';

function MyAgentPanel() {
  const agentOrchestrator = useStore(combinedStore, state => state.agentOrchestrator);
  const openrouter = useStore(combinedStore, state => state.open_router);
  
  // 기존 OpenRouter 모델들 그대로 사용
  const availableModels = Object.values(openrouter.models);
  
  // 현재 활성 Agents
  const activeAgents = Object.values(agentOrchestrator.activeAgents);
  
  return (
    <div>
      <h2>🤖 활성 Agents ({activeAgents.length})</h2>
      {activeAgents.map(agent => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
```

## 📊 상태 모니터링

```typescript
// Agent 시스템 전체 상태 확인
const status = agentOrchestratorStore.getState().getStatus();

console.log(`
📊 Agent 시스템 현황:
- 전체 Agents: ${status.agents.total}개
- 활성 Agents: ${status.agents.active}개  
- 진행중 대화: ${status.conversations.active}개
- 사용 가능 페르소나: ${status.personas.total}개
`);

// 개별 Agent 상태
status.agents.list.forEach(agent => {
  console.log(`🤖 ${agent.name}: ${agent.messageCount}개 메시지 처리`);
});
```

## 🔒 보안 및 격리

### Session 기반 격리
- 각 Agent는 독립된 `sessionId`를 가짐
- 기존 OCT의 세션 보안 정책 그대로 적용
- MCP 연결도 세션별로 격리됨

### 메시지 추적
- 모든 Agent 메시지는 기존 `chatStore`에 저장
- 기존 메시지 로깅/모니터링 시스템 활용
- 디버깅과 감사(audit) 완전 지원

## 🚀 확장 계획

### Phase 1: 기본 Multi-Agent (완료) ✅
- [x] 페르소나 시스템
- [x] 기존 OCT 연동
- [x] Multi-Agent 대화
- [x] MCP 도구 연결

### Phase 2: 고급 기능 (개발 예정)
- [ ] Agent 간 파일 공유 (기존 filesystem MCP 활용)
- [ ] 워크플로우 자동화
- [ ] Agent 성능 분석
- [ ] 커스텀 Agent 템플릿

### Phase 3: 엔터프라이즈 기능
- [ ] Team Agent 관리
- [ ] Role-based Agent 접근 제어  
- [ ] Agent 사용량 분석
- [ ] Multi-workspace Agent 공유

## 🔗 관련 파일 구조

```
OCT/src/main/stores/orchestrator/
├── agent-types.ts           # 타입 정의
├── agentOrchestratorStore.ts # 메인 스토어 (기존 시스템 활용)
├── mastra-bridge.ts         # Mastra 브릿지 (선택적)
└── README.md               # 이 문서

OCT/src/renderer/features/server/components/
└── AgentOrchestrator.tsx   # 관리 UI

OCT/src/main/stores/
├── combinedStore.ts        # Agent 스토어 통합됨  
└── ...                    # 기존 모든 스토어들 (변경 없음)
```

## 💡 핵심 철학

> **"기존 시스템을 대체하지 않고, 조정하고 확장한다"**

이 Agent Orchestrator는 OCT의 기존 투자를 100% 보호하면서, Multi-Agent 기능을 추가하는 **비침습적(non-invasive)** 접근법을 채택했습니다.

- **기존 API**: 모두 그대로 동작
- **기존 설정**: OpenRouter, MCP 서버 설정 그대로 활용
- **기존 UI**: ChatRoom, MCPManager 등 모두 정상 동작
- **새로운 기능**: Agent 기능이 **추가**로 제공됨

결과적으로 **기존 사용자는 아무것도 바뀌지 않았음을 느끼면서**, **새로운 사용자는 강력한 Multi-Agent 기능을 활용**할 수 있습니다.

---

**🎉 이제 여러 AI Agent들이 협업하여 더 복잡하고 창의적인 작업을 수행할 수 있습니다!** 