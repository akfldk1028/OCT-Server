# MCP 시스템 빠른 참조 가이드

## 🎯 핵심 개념 요약

### 📊 시스템 개요
- **이전**: 순차 실행 + Claude Desktop 단일 클라이언트
- **현재**: 병렬 실행 + 다중 클라이언트 (Claude + OpenAI + VSCode)
- **성능**: 3-5배 빠른 실행 속도

---

## 🔧 주요 클래스 & 파일

### 📁 핵심 파일 위치
```
src/
├── main/src/workflow/
│   ├── workflow-executor.ts          # 병렬 실행 엔진
│   ├── clients/MCPClientManager.ts   # 다중 클라이언트 관리
│   └── executors/ServerNodeExecutor.ts # 서버 노드 실행
└── renderer/
    ├── stores/mcpConnectionStore.ts  # 실시간 상태 관리
    └── features/server/components/node/TriggerNode.tsx # UI
```

### 🏭 핵심 클래스
| 클래스 | 역할 | 위치 |
|--------|------|------|
| `WorkflowExecutor` | 병렬 워크플로우 실행 | `workflow-executor.ts` |
| `MCPClientManager` | 다중 클라이언트 관리 | `MCPClientManager.ts` |
| `MCPConnectionStore` | 실시간 상태 추적 | `mcpConnectionStore.ts` |
| `ServerNodeExecutor` | MCP 서버 연결 | `ServerNodeExecutor.ts` |

---

## ⚡ 빠른 사용법

### 1. 병렬 워크플로우 실행
```typescript
// 기본 병렬 실행
await workflowExecutor.executeWorkflow({ nodes, edges, triggerId });

// 부분 실패 허용
await workflowExecutor.executeWorkflowParallel({
  nodes, edges, triggerId,
  allowPartialFailure: true
});
```

### 2. 다중 클라이언트 연결
```typescript
// 모든 클라이언트에 동시 연결
const results = await mcpClientManager.connectServerToAllClients(serverConfig);

// 특정 클라이언트만
const result = await mcpClientManager.connectServerToClient(serverConfig, 'claude-desktop');
```

### 3. 실시간 상태 확인
```typescript
const { globalStats, getActiveWorkflows } = useMCPConnectionStore();
console.log(`활성: ${globalStats.activeConnections}, 실행중: ${getActiveWorkflows().length}`);
```

---

## 🎯 클라이언트 타입

### 지원 클라이언트
| 타입 | 이름 | 연결 방식 | 재시작 필요 |
|------|------|-----------|-------------|
| `claude-desktop` | Claude Desktop | JSON 설정 | ✅ |
| `openai-api` | OpenAI API | 프로세스 실행 | ❌ |
| `vscode-extension` | VSCode | settings.json | ✅ |
| `cursor-extension` | Cursor (계획) | settings.json | ✅ |

### 설정 파일 위치
```bash
# Claude Desktop
Windows: %APPDATA%/Claude/claude_desktop_config.json
macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
Linux: ~/.config/Claude/claude_desktop_config.json

# VSCode
Windows: %APPDATA%/Code/User/settings.json
macOS: ~/Library/Application Support/Code/User/settings.json
Linux: ~/.config/Code/User/settings.json
```

---

## 📊 상태 관리

### 연결 상태
- `connecting` - 연결 중
- `connected` - 연결 완료
- `disconnected` - 연결 해제
- `error` - 연결 실패
- `retrying` - 재시도 중

### 워크플로우 상태
- `idle` - 대기 중
- `starting` - 시작 중
- `running` - 실행 중
- `completed` - 완료
- `failed` - 실패
- `paused` - 일시정지

---

## 🔥 중요한 메서드들

### WorkflowExecutor
```typescript
// 의존성 레벨별 그룹화 (핵심 알고리즘)
groupNodesByDependencyLevel(nodes: Node[], edges: Edge[]): Node[][]

// 병렬 실행
executeWorkflowParallel(payload: ParallelExecutePayload): Promise<void>
```

### MCPClientManager
```typescript
// 모든 클라이언트 동시 연결
connectServerToAllClients(config: MCPServerConfig): Promise<MCPConnectionResult[]>

// 연결 상태 요약
getConnectionSummary(): ConnectionSummary
```

### MCPConnectionStore
```typescript
// 워크플로우 추적 시작
startWorkflowProgress(executionId: string, progress: WorkflowProgress): void

// 연결 상태 업데이트
updateConnectionStatus(serverId: string, status: ConnectionStatus): void

// 자동 재시도
retryConnection(serverId: string): Promise<boolean>
```

---

## 🚨 문제해결 체크리스트

### ❌ 연결 실패 시
1. **클라이언트 설치 확인**
   ```typescript
   const isAvailable = await client.isAvailable();
   ```

2. **설정 파일 권한 확인**
   ```bash
   # 설정 디렉토리 접근 권한 확인
   ls -la ~/.config/Claude/
   ```

3. **포트 충돌 확인** (OpenAI API)
   ```typescript
   const port = await findAvailablePort();
   ```

### ❌ 병렬 실행 실패 시
1. **의존성 그래프 확인**
   ```typescript
   const levels = executor.groupNodesByDependencyLevel(nodes, edges);
   console.log('의존성 레벨:', levels);
   ```

2. **순환 참조 확인**
   ```typescript
   // 에러: "Workflow contains circular dependencies"
   ```

3. **메모리 사용량 확인**
   ```typescript
   const usage = process.memoryUsage();
   ```

### ❌ 상태 업데이트 안됨
1. **Zustand 스토어 연결 확인**
   ```typescript
   const store = useMCPConnectionStore();
   store.updateGlobalStats(); // 수동 업데이트
   ```

2. **React 리렌더링 확인**
   ```typescript
   // useCallback, useMemo 사용 확인
   ```

---

## 🎯 성능 최적화 팁

### 1. 병렬 실행 최적화
- **최대 동시 실행 수**: 시스템 리소스에 따라 조정
- **청크 크기**: 큰 그룹은 청크로 분할
- **메모리 사용량**: 모니터링 및 제한

### 2. 연결 풀링
- **재사용**: 기존 연결 재사용
- **타임아웃**: 연결 타임아웃 설정
- **정리**: 주기적 연결 정리

### 3. 상태 관리 최적화
- **셀렉터 사용**: 불필요한 리렌더링 방지
- **배치 업데이트**: 여러 상태를 한 번에 업데이트
- **메모리 정리**: 완료된 워크플로우 데이터 정리

---

## 📈 모니터링 메트릭

### 핵심 지표
```typescript
interface CoreMetrics {
  activeConnections: number;      // 활성 연결 수
  successRate: number;           // 성공률 (%)
  averageExecutionTime: number;  // 평균 실행 시간 (ms)
  parallelEfficiency: number;    // 병렬 실행 효율성 (%)
  errorFrequency: Record<string, number>; // 에러 빈도
}
```

### 실시간 확인
```typescript
// React 컴포넌트에서
const { globalStats } = useMCPConnectionStore();

// 콘솔에서
console.log('MCP Stats:', mcpConnectionStore.getState().globalStats);
```

---

## 🔧 환경 설정

### 개발 환경
```typescript
// config/development.ts
export const devConfig = {
  maxConcurrentConnections: 5,
  enableDebugLogging: true,
  autoRetry: true,
  connectionTimeout: 10000
};
```

### 프로덕션 환경
```typescript
// config/production.ts
export const prodConfig = {
  maxConcurrentConnections: 10,
  enableDebugLogging: false,
  autoRetry: true,
  connectionTimeout: 30000
};
```

### 환경변수
```bash
# .env
MCP_MAX_CONNECTIONS=10
MCP_TIMEOUT=30000
MCP_AUTO_RETRY=true
MCP_LOG_LEVEL=info
```

---

## 🚀 새 기능 추가 체크리스트

### ✅ 새 클라이언트 추가
1. `IMCPClient` 상속 클래스 생성
2. `MCPClientManager`에 등록
3. `ClientType`에 타입 추가
4. 테스트 작성

### ✅ 새 노드 타입 추가
1. `BaseNodeExecutor` 상속 클래스 생성
2. `NodeExecutorFactory`에 등록
3. UI 컴포넌트 생성
4. 테스트 작성

### ✅ 새 실행 전략 추가
1. 전략 인터페이스 구현
2. `WorkflowExecutor`에 통합
3. 설정 옵션 추가
4. 성능 테스트

---

## 📞 지원 및 문의

### 디버깅 모드 활성화
```typescript
// 개발자 도구에서
localStorage.setItem('mcp-debug', 'true');

// 상세 로깅 확인
console.log('MCP Debug Info:', {
  connections: mcpConnectionStore.getState().connections,
  workflows: mcpConnectionStore.getState().workflowProgress,
  stats: mcpConnectionStore.getState().globalStats
});
```

### 로그 파일 위치
```bash
# 일렉트론 로그
%APPDATA%/OCT-Server/logs/

# 개발자 도구 콘솔
F12 → Console → "mcp" 필터
```

---

이 빠른 참조 가이드로 MCP 시스템을 효율적으로 사용하고 문제를 해결할 수 있습니다! 🎉
