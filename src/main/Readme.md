const installer = new ServerInstaller();
// src/common/configLoader.ts





-->
createWindow    -->  await manager.startServer('local-express-server');

                -->     const loadedCount = ServerInstanceFactory.loadServerConfigs(appDataPath);


# 전체 Store 아키텍처 정리

## 1. Store 계층 구조 (Coordinator 포함)

```
┌─────────────────────────────────────────────────────────────┐
│                      combinedStore                           │
│         (모든 store의 state를 구독하여 통합)                │
└─────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
┌───▼─────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│  UI Layer   │      │ Coordinator     │      │ Infrastructure  │
├─────────────┤      ├─────────────────┤      ├─────────────────┤
│ roomStore   │      │ aiMcpCoordinator│      │ transportStore  │
│ sessionStore│◄────►│     Store       │◄────►│ clientStore     │
│ chatStore   │      │ (통합 관리자)   │      │ proxyStore      │
└─────────────┘      └─────────────────┘      └─────────────────┘
       ▲                      ▲                         ▲
       │                      │                         │
       └──────────────────────┼─────────────────────────┘
                              │
                     ┌────────▼────────┐
                     │ Service Layer   │
                     ├─────────────────┤
                     │ openrouterStore │
                     │ mcpRegistryStore│
                     └─────────────────┘
```

## 2. 각 Store의 역할과 관계

### 🎯 aiMcpCoordinatorStore (중앙 조정자)
```typescript
{
  sessionBindings: {
    "session-456": [
      {
        sessionId: "session-456",
        clientId: "client-789",
        transportSessionId: "transport-012",
        serverId: "weather-server"
      }
    ]
  }
}
```
- **역할**: Chat Session과 MCP 연결을 중개
- **관리**: 어떤 채팅이 어떤 MCP 서버와 연결되어 있는지

### 📝 UI Layer
**roomStore**: 채팅방 메타데이터
```typescript
{
  rooms: {
    "room-123": {
      id: "room-123",
      name: "날씨 대화",
      sessions: ["session-456"]
    }
  }
}
```

**sessionStore**: 세션 연결 상태
```typescript
{
  sessions: {
    "session-456": {
      id: "session-456",
      roomId: "room-123",
      status: "active"
    }
  }
}
```

**chatStore**: 실제 대화 메시지
```typescript
{
  messages: {
    "session-456": [
      { role: "user", content: "날씨 알려줘" },
      { role: "assistant", content: "어느 지역의 날씨를..." }
    ]
  }
}
```

### 🔧 Infrastructure Layer
**transportStore**: 물리적 연결
```typescript
{
  sessions: {
    "transport-012": {
      transport: StdioClientTransport,
      status: "connected"
    }
  }
}
```

**clientStore**: MCP Client 인스턴스
```typescript
{
  clients: {
    "client-789": {
      client: MCPClient,
      transport: "transport-012"
    }
  }
}
```

## 3. 실제 동작 흐름

### 🚀 새 채팅 시작
```
1. Sidebar: "New Chat" 클릭
      ↓
2. roomStore.createRoom("AI Chat")
      ↓
3. sessionStore.createSession(roomId)
      ↓
4. chatStore.initializeSession(sessionId)
      ↓
5. aiMcpCoordinatorStore.createSessionBinding(sessionId, "weather-server")
      ├─> transportStore.createTransport()
      ├─> clientStore.createClient()
      └─> 연결 정보를 sessionBindings에 저장
```

### 💬 메시지 전송 (MCP 도구 사용)
```
1. 사용자: "서울 날씨 알려줘"
      ↓
2. chatStore.sendStreamingMessage()
      ├─> chatStore.processSelectedTags()
      │     └─> mcpCoordinatorStore.getSessionTools()
      ├─> openrouterStore.createStreamingCompletion()
      │     └─> chatStore.executeMCPTools()
      └─> mcpCoordinatorStore.executeToolForSession()
            └─> clientStore를 통해 실제 도구 실행
```

## 4. Store 간 의존 관계

```
roomStore ←→ sessionStore
    ↓            ↓
    └─→ chatStore ←→ aiMcpCoordinatorStore
            ↓                ↓
    openrouterStore    transportStore
                             ↓
                        clientStore
                             ↓
                      mcpRegistryStore
```

## 5. 정리

- **roomStore + sessionStore**: 채팅방 구조 관리
- **chatStore**: 메시지와 AI 통신
- **aiMcpCoordinatorStore**: 채팅과 MCP 연결 중개 ⭐
- **transportStore + clientStore**: MCP 물리적 연결
- **openrouterStore**: AI 모델 API
- **mcpRegistryStore**: MCP 서버 정보

모든 Store는 `combinedStore`를 통해 하나의 상태로 통합되어 React에서 사용됩니다.





// 1. 메타데이터: electron-store
const metaStore = new Store();
metaStore.set('lastSync', Date.now());
metaStore.set('activeRoomId', roomId);

// 2. 대용량 데이터: SQLite
const db = new Database('cache.db');

// 3. 임시 데이터: 메모리 (Zustand)
const memoryStore = createStore(...);

// 4. 영구 저장: Supabase
const supabase = createClient(...);

// 동기화 전략
class StorageManager {
  async saveRoom(room) {
    // 1. 메모리에 즉시 저장 (빠른 UI)
    memoryStore.setState(...);
    
    // 2. SQLite에 저장 (로컬 영속성)
    db.prepare('INSERT INTO rooms...').run(room);
    
    // 3. Supabase에 비동기 저장 (백업/동기화)
    queueMicrotask(() => {
      supabase.from('rooms').insert(room);
    });
  }
}

// 1. 세션 시작
chatStore.initializeSession()
  → chatStore.connectMCPServers()
    → mcpRegistryStore.initializeDefaultServers()
    → mcpCoordinatorStore.connectMCPToSession()
