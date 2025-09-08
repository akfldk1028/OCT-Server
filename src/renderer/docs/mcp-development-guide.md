# MCP 개발 가이드 - 다중 서버 병렬 실행 시스템

## 🎯 개발자를 위한 실무 가이드

이 문서는 MCP 시스템을 확장하거나 수정하는 개발자들을 위한 실무 가이드입니다.

---

## 🏗️ 코드 구조

### 디렉토리 구조
```
src/
├── main/src/workflow/                 # 메인 프로세스 (Node.js)
│   ├── workflow-executor.ts          # 워크플로우 실행 엔진
│   ├── clients/                      # MCP 클라이언트들
│   │   ├── IMCPClient.ts            # 클라이언트 인터페이스
│   │   ├── MCPClientManager.ts      # 클라이언트 통합 관리자
│   │   ├── ClaudeDesktopClient.ts   # Claude Desktop 클라이언트
│   │   ├── OpenAIAPIClient.ts       # OpenAI API 클라이언트
│   │   └── VSCodeExtensionClient.ts # VSCode Extension 클라이언트
│   └── executors/                   # 노드 실행자들
│       ├── NodeExecutorFactory.ts   # 실행자 팩토리
│       └── ServerNodeExecutor.ts    # 서버 노드 실행자
└── renderer/                        # 렌더러 프로세스 (React)
    ├── stores/
    │   └── mcpConnectionStore.ts    # 실시간 상태 관리
    └── features/server/components/node/
        └── TriggerNode.tsx          # UI 트리거 노드
```

---

## 🔧 핵심 클래스 구현

### 1. WorkflowExecutor 확장

#### 새로운 실행 모드 추가
```typescript
// workflow-executor.ts
export class WorkflowExecutor {
  // 기존 코드...
  
  // 🆕 커스텀 실행 모드 추가
  async executeWorkflowWithCustomStrategy(payload: {
    executionId?: string;
    nodes: AnyWorkflowNode[];
    edges: Edge[];
    triggerId: string;
    strategy: 'parallel' | 'sequential' | 'adaptive';
    maxConcurrency?: number;
  }): Promise<void> {
    const { strategy, maxConcurrency = 5 } = payload;
    
    switch (strategy) {
      case 'parallel':
        return this.executeWorkflowParallel(payload);
      case 'sequential':
        return this.executeWorkflowSequential(payload);
      case 'adaptive':
        return this.executeWorkflowAdaptive(payload, maxConcurrency);
    }
  }
  
  // 적응형 실행: 시스템 리소스에 따라 동적 조정
  private async executeWorkflowAdaptive(
    payload: any, 
    maxConcurrency: number
  ): Promise<void> {
    const levelGroups = this.groupNodesByDependencyLevel(payload.nodes, payload.edges);
    
    for (const group of levelGroups) {
      // 그룹 크기가 maxConcurrency보다 크면 청크로 분할
      const chunks = this.chunkArray(group, maxConcurrency);
      
      for (const chunk of chunks) {
        await Promise.all(chunk.map(node => this.executeNode(node, payload)));
      }
    }
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

#### 리소스 모니터링 추가
```typescript
// 시스템 리소스 모니터링
interface SystemResources {
  cpuUsage: number;
  memoryUsage: number;
  availableMemory: number;
}

class ResourceMonitor {
  static async getSystemResources(): Promise<SystemResources> {
    // Node.js os 모듈 사용
    const os = require('os');
    const process = require('process');
    
    return {
      cpuUsage: process.cpuUsage().user / 1000000, // 마이크로초 -> 초
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      availableMemory: os.freemem() / 1024 / 1024 // MB
    };
  }
}
```

---

### 2. 새로운 MCP 클라이언트 추가

#### Cursor Extension 클라이언트 구현
```typescript
// clients/CursorExtensionClient.ts
import { IMCPClient, MCPServerConfig, MCPConnectionResult } from './IMCPClient';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class CursorExtensionClient extends IMCPClient {
  private settingsPath: string;
  
  constructor() {
    super('cursor-extension');
    this.settingsPath = this.getCursorSettingsPath();
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Cursor 설치 확인
      const configDir = path.dirname(this.settingsPath);
      await fs.access(configDir);
      return true;
    } catch {
      return false;
    }
  }
  
  async connectServer(serverConfig: MCPServerConfig): Promise<MCPConnectionResult> {
    try {
      // Cursor 설정 읽기
      const settings = await this.readCursorSettings();
      
      // MCP 서버 설정 추가
      if (!settings['mcp.servers']) {
        settings['mcp.servers'] = {};
      }
      
      settings['mcp.servers'][serverConfig.name] = {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env || {},
        cwd: serverConfig.cwd
      };
      
      // 설정 저장
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
      
      this.updateConnectionStatus(serverConfig.name, {
        connected: true,
        lastConnected: new Date(),
        capabilities: ['mcp-standard', 'cursor-integration']
      });
      
      return {
        success: true,
        message: `📝 ${serverConfig.name}이 Cursor 설정에 추가되었습니다.`,
        connectionId: serverConfig.name
      };
      
    } catch (error) {
      return {
        success: false,
        message: `❌ Cursor Extension 연결 실패: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private getCursorSettingsPath(): string {
    const platform = process.platform;
    const homeDir = os.homedir();
    
    switch (platform) {
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User', 'settings.json');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json');
      case 'linux':
        return path.join(homeDir, '.config', 'Cursor', 'User', 'settings.json');
      default:
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
    }
  }
  
  private async readCursorSettings(): Promise<any> {
    try {
      const content = await fs.readFile(this.settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
}
```

#### MCPClientManager에 새 클라이언트 등록
```typescript
// MCPClientManager.ts 수정
import { CursorExtensionClient } from './CursorExtensionClient';

export type ClientType = 'claude-desktop' | 'openai-api' | 'vscode-extension' | 'cursor-extension';

// initializeClients 메서드에 추가
switch (clientType) {
  case 'claude-desktop':
    client = new ClaudeDesktopClient();
    break;
  case 'openai-api':
    client = new OpenAIAPIClient();
    break;
  case 'vscode-extension':
    client = new VSCodeExtensionClient();
    break;
  case 'cursor-extension':  // 🆕 추가
    client = new CursorExtensionClient();
    break;
  default:
    console.warn(`지원하지 않는 클라이언트: ${clientType}`);
    continue;
}
```

---

### 3. MCPConnectionStore 확장

#### 고급 메트릭 추가
```typescript
// mcpConnectionStore.ts 확장
interface AdvancedMetrics {
  averageConnectionTime: number;
  connectionTrends: Array<{ timestamp: Date; count: number }>;
  errorFrequency: Record<string, number>;
  performanceMetrics: {
    parallelEfficiency: number;
    resourceUtilization: number;
  };
}

// 스토어에 새 액션 추가
const useMCPConnectionStore = create<MCPConnectionStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 기존 코드...
        
        // 🆕 고급 메트릭 계산
        calculateAdvancedMetrics: (): AdvancedMetrics => {
          const connections = Object.values(get().connections);
          const connectedConnections = connections.filter(c => c.status === 'connected');
          
          // 평균 연결 시간 계산
          const connectionTimes = connectedConnections
            .filter(c => c.lastConnected)
            .map(c => c.lastConnected!.getTime());
          
          const averageConnectionTime = connectionTimes.length > 0 
            ? connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length
            : 0;
          
          // 에러 빈도 계산
          const errorFrequency: Record<string, number> = {};
          connections.forEach(conn => {
            if (conn.lastError) {
              errorFrequency[conn.lastError] = (errorFrequency[conn.lastError] || 0) + 1;
            }
          });
          
          return {
            averageConnectionTime,
            connectionTrends: [], // 구현 필요
            errorFrequency,
            performanceMetrics: {
              parallelEfficiency: get().calculateParallelEfficiency(),
              resourceUtilization: 0 // 구현 필요
            }
          };
        },
        
        // 병렬 실행 효율성 계산
        calculateParallelEfficiency: (): number => {
          const workflows = Object.values(get().workflowProgress);
          if (workflows.length === 0) return 100;
          
          const completedWorkflows = workflows.filter(w => w.status === 'completed');
          const totalEfficiency = completedWorkflows.reduce((sum, workflow) => {
            const theoreticalTime = workflow.totalServers * 1000; // 가정: 서버당 1초
            const actualTime = workflow.estimatedEndTime 
              ? workflow.estimatedEndTime.getTime() - workflow.startTime.getTime()
              : theoreticalTime;
            
            return sum + (theoreticalTime / Math.max(actualTime, 1)) * 100;
          }, 0);
          
          return completedWorkflows.length > 0 
            ? totalEfficiency / completedWorkflows.length 
            : 100;
        }
      })
    )
  )
);
```

---

### 4. 실시간 모니터링 컴포넌트

#### 상세 모니터링 대시보드
```typescript
// components/MCPMonitoringDashboard.tsx
import React from 'react';
import { useMCPConnectionStore } from '@/renderer/stores/mcpConnectionStore';

export function MCPMonitoringDashboard() {
  const { 
    connections, 
    globalStats, 
    workflowProgress,
    calculateAdvancedMetrics 
  } = useMCPConnectionStore();
  
  const advancedMetrics = calculateAdvancedMetrics();
  
  return (
    <div className="p-6 space-y-6">
      {/* 전역 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard 
          title="활성 연결"
          value={`${globalStats.activeConnections}/${globalStats.totalConnections}`}
          trend="+5%"
        />
        <MetricCard 
          title="성공률"
          value={`${globalStats.successRate.toFixed(1)}%`}
          trend="+2.3%"
        />
        <MetricCard 
          title="병렬 효율성"
          value={`${advancedMetrics.performanceMetrics.parallelEfficiency.toFixed(1)}%`}
          trend="+12%"
        />
        <MetricCard 
          title="평균 연결 시간"
          value={`${(advancedMetrics.averageConnectionTime / 1000).toFixed(2)}s`}
          trend="-0.5s"
        />
      </div>
      
      {/* 클라이언트별 상세 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(globalStats.clientStats).map(([clientType, stats]) => (
          <ClientStatusCard 
            key={clientType}
            clientType={clientType}
            stats={stats}
            connections={Object.values(connections).filter(c => c.clientType === clientType)}
          />
        ))}
      </div>
      
      {/* 실행 중인 워크플로우 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">실행 중인 워크플로우</h3>
        <div className="space-y-3">
          {Object.values(workflowProgress)
            .filter(w => w.status === 'running')
            .map(workflow => (
              <WorkflowProgressCard key={workflow.executionId} workflow={workflow} />
            ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend }: { title: string; value: string; trend: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
      <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-green-600">{trend}</div>
    </div>
  );
}

function ClientStatusCard({ clientType, stats, connections }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium capitalize">{clientType.replace('-', ' ')}</h4>
        <div className="text-sm text-gray-600">
          {stats.connected}/{stats.total}
        </div>
      </div>
      
      <div className="space-y-2">
        {connections.map((conn: any) => (
          <div key={conn.serverId} className="flex items-center justify-between text-sm">
            <span>{conn.serverName}</span>
            <StatusBadge status={conn.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    connected: 'bg-green-100 text-green-800',
    connecting: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    retrying: 'bg-blue-100 text-blue-800'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
```

---

## 🧪 테스트 가이드

### 1. 단위 테스트

#### WorkflowExecutor 테스트
```typescript
// __tests__/workflow-executor.test.ts
import { WorkflowExecutor } from '../src/main/src/workflow/workflow-executor';
import { MockDesktopIntegration } from './mocks/MockDesktopIntegration';

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;
  let mockIntegration: MockDesktopIntegration;
  
  beforeEach(() => {
    mockIntegration = new MockDesktopIntegration();
    executor = new WorkflowExecutor(mockIntegration);
  });
  
  describe('groupNodesByDependencyLevel', () => {
    it('should group independent nodes in the same level', () => {
      const nodes = [
        { id: 'trigger', type: 'trigger' },
        { id: 'server1', type: 'server' },
        { id: 'server2', type: 'server' },
        { id: 'output', type: 'output' }
      ];
      
      const edges = [
        { source: 'trigger', target: 'server1' },
        { source: 'trigger', target: 'server2' },
        { source: 'server1', target: 'output' },
        { source: 'server2', target: 'output' }
      ];
      
      const levels = executor.groupNodesByDependencyLevel(nodes, edges);
      
      expect(levels).toHaveLength(3);
      expect(levels[0]).toHaveLength(1); // trigger
      expect(levels[1]).toHaveLength(2); // server1, server2 (parallel)
      expect(levels[2]).toHaveLength(1); // output
    });
  });
  
  describe('executeWorkflowParallel', () => {
    it('should execute parallel nodes simultaneously', async () => {
      const startTime = Date.now();
      
      await executor.executeWorkflowParallel({
        nodes: mockNodes,
        edges: mockEdges,
        triggerId: 'trigger'
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // 병렬 실행으로 인해 전체 시간이 단축되어야 함
      expect(executionTime).toBeLessThan(mockNodes.length * 1000);
    });
  });
});
```

#### MCPClientManager 테스트
```typescript
// __tests__/mcp-client-manager.test.ts
import { MCPClientManager } from '../src/main/src/workflow/clients/MCPClientManager';

describe('MCPClientManager', () => {
  let manager: MCPClientManager;
  
  beforeEach(() => {
    manager = new MCPClientManager({
      enabledClients: ['claude-desktop', 'openai-api'],
      autoDetectClients: false
    });
  });
  
  describe('connectServerToAllClients', () => {
    it('should connect to all available clients', async () => {
      const serverConfig = {
        name: 'test-server',
        command: 'npx',
        args: ['test-mcp-server']
      };
      
      const results = await manager.connectServerToAllClients(serverConfig);
      
      expect(results).toHaveLength(2); // claude-desktop, openai-api
      expect(results.every(r => r.success)).toBe(true);
    });
  });
  
  describe('connectMultipleServers', () => {
    it('should handle multiple servers in parallel', async () => {
      const serverConfigs = [
        { name: 'server1', command: 'npx', args: ['server1'] },
        { name: 'server2', command: 'npx', args: ['server2'] },
        { name: 'server3', command: 'npx', args: ['server3'] }
      ];
      
      const results = await manager.connectMultipleServers(serverConfigs);
      
      expect(results).toHaveLength(6); // 3 servers × 2 clients
    });
  });
});
```

### 2. 통합 테스트

#### E2E 워크플로우 테스트
```typescript
// __tests__/e2e-workflow.test.ts
import { renderHook, act } from '@testing-library/react';
import { useMCPConnectionStore } from '../src/renderer/stores/mcpConnectionStore';

describe('E2E Workflow Test', () => {
  it('should complete full workflow with real-time updates', async () => {
    const { result } = renderHook(() => useMCPConnectionStore());
    
    // 1. 워크플로우 시작
    act(() => {
      result.current.startWorkflowProgress('test-execution', {
        workflowName: 'Test Workflow',
        totalServers: 3,
        connectedServers: 0,
        runningServers: 0,
        completedServers: 0,
        failedServers: 0,
        currentLevel: 0,
        totalLevels: 2,
        startTime: new Date(),
        status: 'starting'
      });
    });
    
    // 2. 서버 연결 시뮬레이션
    const serverIds = ['server1', 'server2', 'server3'];
    serverIds.forEach(serverId => {
      act(() => {
        result.current.addConnection({
          serverId,
          serverName: `Test ${serverId}`,
          clientType: 'claude-desktop',
          status: 'connecting',
          retryCount: 0,
          maxRetries: 3
        });
      });
    });
    
    // 3. 연결 성공 시뮬레이션
    serverIds.forEach(serverId => {
      act(() => {
        result.current.updateConnectionStatus(serverId, 'connected');
      });
    });
    
    // 4. 상태 검증
    expect(result.current.globalStats.activeConnections).toBe(3);
    expect(result.current.globalStats.successRate).toBe(100);
    
    // 5. 워크플로우 완료
    act(() => {
      result.current.completeWorkflowProgress('test-execution', true);
    });
    
    const workflow = result.current.getWorkflowProgress('test-execution');
    expect(workflow?.status).toBe('completed');
  });
});
```

---

## 🚀 배포 가이드

### 1. 빌드 최적화

#### Webpack 설정
```javascript
// webpack.config.js
module.exports = {
  // 기존 설정...
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // MCP 관련 코드를 별도 청크로 분리
        mcp: {
          test: /[\\/]src[\\/].*[\\/](workflow|clients)[\\/]/,
          name: 'mcp-system',
          chunks: 'all',
          priority: 10
        }
      }
    }
  },
  
  // 런타임 최적화
  resolve: {
    alias: {
      '@mcp': path.resolve(__dirname, 'src/main/src/workflow'),
      '@stores': path.resolve(__dirname, 'src/renderer/stores')
    }
  }
};
```

#### 프로덕션 환경 설정
```typescript
// config/production.ts
export const productionConfig = {
  mcp: {
    maxConcurrentConnections: 10,
    connectionTimeout: 30000,
    retryDelayMs: 5000,
    maxRetries: 3,
    
    // 프로덕션에서 비활성화할 기능들
    enableDebugLogging: false,
    enablePerformanceMetrics: true,
    enableAutoCleanup: true
  },
  
  // 리소스 모니터링
  monitoring: {
    maxMemoryUsageMB: 1024,
    maxCpuUsagePercent: 80,
    cleanupIntervalMs: 60000
  }
};
```

### 2. 성능 모니터링

#### 메트릭 수집
```typescript
// utils/metrics-collector.ts
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, any> = new Map();
  
  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  recordConnectionTime(clientType: string, duration: number): void {
    const key = `connection_time_${clientType}`;
    const existing = this.metrics.get(key) || [];
    existing.push({ timestamp: Date.now(), duration });
    
    // 최근 100개만 유지
    if (existing.length > 100) {
      existing.shift();
    }
    
    this.metrics.set(key, existing);
  }
  
  recordWorkflowExecution(executionId: string, stats: {
    totalNodes: number;
    parallelNodes: number;
    executionTime: number;
    success: boolean;
  }): void {
    this.metrics.set(`workflow_${executionId}`, {
      ...stats,
      timestamp: Date.now()
    });
  }
  
  getMetricsSummary(): any {
    const summary: any = {};
    
    this.metrics.forEach((value, key) => {
      if (key.startsWith('connection_time_')) {
        const clientType = key.replace('connection_time_', '');
        const times = value.map((v: any) => v.duration);
        summary[clientType] = {
          averageConnectionTime: times.reduce((a: number, b: number) => a + b, 0) / times.length,
          minConnectionTime: Math.min(...times),
          maxConnectionTime: Math.max(...times),
          totalConnections: times.length
        };
      }
    });
    
    return summary;
  }
}
```

---

## 🔧 커스터마이징 가이드

### 1. 새로운 노드 타입 추가

#### 커스텀 노드 실행자
```typescript
// executors/CustomNodeExecutor.ts
import { BaseNodeExecutor } from './BaseNodeExecutor';

interface CustomNodeData {
  customProperty: string;
  options: Record<string, any>;
}

export class CustomNodeExecutor extends BaseNodeExecutor<CustomNodeData> {
  protected async doExecute(payload: ExecutePayload): Promise<Partial<ExecuteResult>> {
    const { context } = payload;
    
    // 커스텀 로직 구현
    const result = await this.processCustomNode();
    
    return {
      data: result,
      isLast: this.isLastNode(payload),
      message: `커스텀 노드 ${this.node.id} 처리 완료`
    };
  }
  
  private async processCustomNode(): Promise<any> {
    // 구현 필요
    return { processed: true };
  }
}

// NodeExecutorFactory에 등록
// NodeExecutorFactory.ts
constructor(integration: IDesktopIntegration, logger?: Logger) {
  // 기존 코드...
  
  this.register('custom', CustomNodeExecutor);  // 🆕 추가
}
```

### 2. 커스텀 연결 전략

#### 로드 밸런싱 전략
```typescript
// strategies/LoadBalancingStrategy.ts
export interface LoadBalancingStrategy {
  selectClient(availableClients: ClientType[], serverConfig: MCPServerConfig): ClientType;
}

export class RoundRobinStrategy implements LoadBalancingStrategy {
  private currentIndex = 0;
  
  selectClient(availableClients: ClientType[]): ClientType {
    const client = availableClients[this.currentIndex % availableClients.length];
    this.currentIndex++;
    return client;
  }
}

export class ResourceBasedStrategy implements LoadBalancingStrategy {
  async selectClient(availableClients: ClientType[], serverConfig: MCPServerConfig): Promise<ClientType> {
    // 각 클라이언트의 현재 부하 확인
    const clientLoads = await Promise.all(
      availableClients.map(async client => ({
        client,
        load: await this.getClientLoad(client)
      }))
    );
    
    // 가장 부하가 적은 클라이언트 선택
    const leastLoaded = clientLoads.reduce((min, current) => 
      current.load < min.load ? current : min
    );
    
    return leastLoaded.client;
  }
  
  private async getClientLoad(clientType: ClientType): Promise<number> {
    // 클라이언트별 부하 측정 로직
    return 0;
  }
}

// MCPClientManager에 전략 적용
export class MCPClientManager {
  constructor(
    private options: MCPClientManagerOptions = {},
    private loadBalancingStrategy?: LoadBalancingStrategy
  ) {
    this.loadBalancingStrategy = loadBalancingStrategy || new RoundRobinStrategy();
  }
  
  async connectServerWithStrategy(serverConfig: MCPServerConfig): Promise<MCPConnectionResult> {
    const availableClients = Array.from(this.availableClients);
    const selectedClient = this.loadBalancingStrategy.selectClient(availableClients, serverConfig);
    
    return this.connectServerToClient(serverConfig, selectedClient);
  }
}
```

---

## 📚 API 레퍼런스

### WorkflowExecutor API
```typescript
interface WorkflowExecutor {
  // 병렬 실행 (기본)
  executeWorkflow(payload: ExecuteWorkflowPayload): Promise<void>;
  
  // 병렬 실행 (고급 옵션)
  executeWorkflowParallel(payload: ParallelExecutePayload): Promise<void>;
  
  // 저장된 워크플로우 실행
  executeStoredWorkflow(workflowId: string): Promise<void>;
  
  // 실행 취소
  cancelExecution(executionId: string): Promise<void>;
  
  // 활성 실행 목록
  getActiveExecutions(): WorkflowExecution[];
}
```

### MCPClientManager API
```typescript
interface MCPClientManager {
  // 모든 클라이언트에 연결
  connectServerToAllClients(serverConfig: MCPServerConfig): Promise<MCPConnectionResult[]>;
  
  // 특정 클라이언트에 연결
  connectServerToClient(serverConfig: MCPServerConfig, clientType: ClientType): Promise<MCPConnectionResult>;
  
  // 여러 서버 배치 연결
  connectMultipleServers(serverConfigs: MCPServerConfig[], clientType?: ClientType): Promise<MCPConnectionResult[]>;
  
  // 서버 연결 해제
  disconnectServer(serverName: string, clientType?: ClientType): Promise<boolean[]>;
  
  // 연결 상태 요약
  getConnectionSummary(): ConnectionSummary;
}
```

### MCPConnectionStore API
```typescript
interface MCPConnectionStore {
  // 연결 관리
  addConnection(connection: MCPServerConnection): void;
  updateConnectionStatus(serverId: string, status: ConnectionStatus, error?: string): void;
  removeConnection(serverId: string): void;
  
  // 워크플로우 추적
  startWorkflowProgress(executionId: string, progress: WorkflowProgress): void;
  updateWorkflowProgress(executionId: string, updates: Partial<WorkflowProgress>): void;
  completeWorkflowProgress(executionId: string, success: boolean): void;
  
  // 자동 재시도
  retryConnection(serverId: string): Promise<boolean>;
  setAutoRetry(enabled: boolean): void;
  
  // 통계
  updateGlobalStats(): void;
  calculateAdvancedMetrics(): AdvancedMetrics;
}
```

---

이 개발 가이드를 통해 MCP 시스템을 확장하고 커스터마이징할 수 있습니다. 추가 질문이나 구체적인 구현 도움이 필요하면 언제든지 문의해주세요!
