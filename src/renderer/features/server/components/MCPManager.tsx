import { useStore, useDispatch } from '@/hooks/useStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Server, 
  Cable, 
  Layers, 
  GitBranch, 
  Activity,
  Terminal,
  Globe,
  Zap,
  Loader2
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MCPManager({ sessionId }: { sessionId: string }) {
  const dispatch = useDispatch();
  const store = useStore();
  const [lastCreatedClientId, setLastCreatedClientId] = useState<string | null>(null);

  // 모든 관련 상태 가져오기
  const transports = Object.values(store.transport?.sessions || {});
  const proxies = Object.values(store.proxy?.connections || {});
  const clients = Object.values(store.client?.clients || {});
  const servers = Object.values(store.mcp_registry?.servers || {});
  const bindings = store.mcp_coordinator?.sessionBindings[sessionId] || [];

  // 상태 배열 로그 (이모지 포함)
  // useEffect(() => {
  //   console.log('🚚 transportsStore:', store.transport);
  //   console.log('🛡️ proxiesStore:', store.proxy);
  //   console.log('👤 clientsStore:', store.client);
  //   console.log('🖥️ mcp_registryStore:', store.mcp_registry);
  //   console.log('🔗 mcp_coordinatorStore:', store.mcp_coordinator);
  //   console.log('🔗 bindings:', bindings);
  // }, [transports, proxies, clients, servers, bindings]);

  console.log('📊 Store 상태:', {
    '🚚 transportsStore': store.transport,
    '🛡️ proxiesStore': store.proxy,
    '👤 clientsStore': store.client,
    '🖥️ mcp_registryStore': store.mcp_registry,
    '🔗 mcp_coordinatorStore': store.mcp_coordinator,
    '🔗 bindings': bindings,
  });

  useEffect(() => {
    if (!lastCreatedClientId) return;
    const client = clients.find(c => c.id === lastCreatedClientId);
    if (client && client.status === 'connected') {
      console.log('✅ [Client 연결됨] 클라이언트가 성공적으로 연결되었습니다!', client);
      // 필요하다면 UI 알림/토스트 등도 가능
    }
    if (client && client.status === 'error') {
      console.log('❌ [Client 연결 실패]', client);
    }
  }, [clients, lastCreatedClientId]);



  // MCP 서버 연결 전체 플로우
  const connectMCPServer = async (serverId: string, useProxy: boolean = false) => {
    try {
      console.log('🚀 Starting MCP connection flow...');
      
      const server = servers.find(s => s.id === serverId);
      if (!server) throw new Error('Server not found');

      // Step 1: Transport 생성
      console.log('1️⃣ Creating Transport...');
      let transportConfig = {
        transportType: server.transportType,
        command: server.command,
        args: server.args,
        env: server.env,
        url: server.url,
      };

      // Proxy 사용 시
      if (useProxy && server.transportType !== 'stdio') {
        console.log('🔗 Setting up proxy...');
        
        // 프록시 서버 설정 (예: CORS 우회)
        const proxyPort = 3000 + Math.floor(Math.random() * 1000);
        
        // 프록시를 통한 연결로 변경
        transportConfig.url = `http://localhost:${proxyPort}`;
        
        // 원본 URL은 별도로 저장
        server.originalUrl = server.url;
        server.proxyPort = proxyPort;
      }

      const transportSessionId = await dispatch({
        type: 'transport.createTransport',
        payload: {
          serverId,
          config: transportConfig
        }
      });

      // // Step 2: Client 생성
      // console.log('2️⃣ Creating Client...');
      // const clientId = await dispatch({
      //   type: 'client.createClient',
      //   payload: {
      //     sessionId: transportSessionId,
      //     name: `${sessionId}-${serverId}`,
      //     capabilities: {
      //       sampling: {},
      //       roots: { listChanged: true },
      //       experimental: {},
      //     }
      //   }
      // });

      // Step 3: MCPCoordinator를 통해 연결 (transport, client 연결 포함)
      console.log('3️⃣ Connecting via MCPCoordinator...');
      const bindingId = await dispatch({
        type: 'mcp_coordinator.connectMCPToSession',
        payload: { sessionId, serverId }
      });

      console.log('✅ MCP Server connected via coordinator!');
      return bindingId;


      

    } catch (error) {
      console.error('❌ MCP connection failed:', error);
      throw error;
    }
  };

  // 연결 상태 시각화
  const getConnectionStatus = (serverId: string) => {
    const binding = bindings.find(b => b.serverId === serverId);
    if (!binding) return 'disconnected';
    
    const transport = transports.find(t => t.id === binding.transportSessionId);
    const client = clients.find(c => c.id === binding.clientId);
    
    if (transport?.status === 'connected' && client?.status === 'connected') {
      return 'active';
    } else if (transport?.status === 'error' || client?.status === 'error') {
      return 'error';
    }
    return 'connecting';
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">MCP System Manager</h2>
      
      <Tabs defaultValue="servers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="servers">
            <Server className="w-4 h-4 mr-2" />
            Servers
          </TabsTrigger>
          <TabsTrigger value="transports">
            <Cable className="w-4 h-4 mr-2" />
            Transports
          </TabsTrigger>
          <TabsTrigger value="proxies">
            <GitBranch className="w-4 h-4 mr-2" />
            Proxies
          </TabsTrigger>
          <TabsTrigger value="flow">
            <Activity className="w-4 h-4 mr-2" />
            Flow
          </TabsTrigger>
          <TabsTrigger value="pingpong">
    <Zap className="w-4 h-4 mr-2" />
    Ping/Pong
  </TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="space-y-4">
          <h3 className="font-medium">Available MCP Servers</h3>
          {servers.map(server => {
            const status = getConnectionStatus(server.id);
            const binding = bindings.find(b => b.serverId === server.id);
            
            return (
              <Card key={server.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {server.description}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={server.transportType === 'stdio' ? 'default' : 'secondary'}>
                        {server.transportType === 'stdio' ? (
                          <Terminal className="w-3 h-3 mr-1" />
                        ) : (
                          <Globe className="w-3 h-3 mr-1" />
                        )}
                        {server.transportType}
                      </Badge>
                      <Badge variant={status === 'active' ? 'success' : status === 'error' ? 'destructive' : 'outline'}>
                        {status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!binding && (
                      <Button
                        size="sm"
                        onClick={() => connectMCPServer(server.id)}
                      >
                        Connect
                      </Button>
                    )}
                    {binding && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          dispatch({
                            type: 'mcp_coordinator.disconnectMCPFromSession',
                            payload: { sessionId, bindingId: binding.id }
                          });
                        }}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="transports" className="space-y-4">
          <h3 className="font-medium">Active Transports</h3>
          {transports.map(transport => (
            <Card key={transport.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm">{transport.id}</div>
                  <div className="text-sm text-muted-foreground">
                    Server: {transport.serverId}
                  </div>
                  <Badge variant={transport.status === 'connected' ? 'success' : 'destructive'}>
                    {transport.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(transport.lastActivity).toLocaleTimeString()}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="proxies" className="space-y-4">
          <h3 className="font-medium">Proxy Connections</h3>
          {proxies.length === 0 ? (
            <p className="text-muted-foreground">No active proxy connections</p>
          ) : (
            proxies.map(proxy => (
              <Card key={proxy.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm">{proxy.id}</div>
                    <Badge variant={proxy.status === 'active' ? 'success' : 'outline'}>
                      {proxy.status}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      dispatch({
                        type: 'proxy.closeProxy',
                        payload: { proxyId: proxy.id }
                      });
                    }}
                  >
                    Close
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="flow" className="space-y-4">
          <h3 className="font-medium">Connection Flow Visualization</h3>
          <div className="space-y-2">
            {bindings.map(binding => {
              const server = servers.find(s => s.id === binding.serverId);
              const transport = transports.find(t => t.id === binding.transportSessionId);
              const client = clients.find(c => c.id === binding.clientId);
              
              return (
                <Card key={binding.id} className="p-4">
                  <div className="space-y-2">
                    <div className="font-medium">{server?.name || 'Unknown Server'}</div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">Transport</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant={transport?.status === 'connected' ? 'success' : 'destructive'}>
                        {transport?.status || 'unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">Client</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant={client?.status === 'connected' ? 'success' : 'destructive'}>
                        {client?.status || 'unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">Tools</Badge>
                      <span className="text-muted-foreground">→</span>
                      <span>{binding.tools?.length || 0} available</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>


{/* Ping/Pong 탭 내용 */}
<TabsContent value="pingpong" className="space-y-4">
  <h3 className="font-medium">Connection Health Check</h3>
  {bindings.filter(b => b.status === 'active').map(binding => {
    const server = servers.find(s => s.id === binding.serverId);
    const [pingResult, setPingResult] = useState<{success: boolean; latency?: number; error?: string} | null>(null);
    const [isPinging, setIsPinging] = useState(false);
    
    const handlePing = async () => {
      setIsPinging(true);
      try {
        const result = await dispatch({
          type: 'mcp_coordinator.pingMCPServer',
          payload: { sessionId, serverId: binding.serverId }
        });
        setPingResult({ success: true, latency: result.latency });
      } catch (error) {
        setPingResult({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Ping failed' 
        });
      } finally {
        setIsPinging(false);
      }
    };
    
    // Auto-ping every 10 seconds
        useEffect(() => {
          handlePing();
          const interval = setInterval(handlePing, 10000);
          return () => clearInterval(interval);
        }, [binding.id]);
        
        return (
          <Card key={binding.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium">{server?.name}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    pingResult?.success ? "bg-green-500" : "bg-red-500"
                  )} />
                  <span className="text-sm text-muted-foreground">
                    {isPinging ? 'Pinging...' : 
                    pingResult?.success ? `Latency: ${pingResult.latency}ms` :
                    pingResult?.error || 'Not checked'}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePing}
                disabled={isPinging}
              >
                {isPinging ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Ping
              </Button>
            </div>
          </Card>
        );
      })}
      
      {bindings.filter(b => b.status === 'active').length === 0 && (
        <p className="text-muted-foreground text-center py-4">
          No active connections to test
        </p>
      )}
</TabsContent>


      </Tabs>
    </Card>
  );
}