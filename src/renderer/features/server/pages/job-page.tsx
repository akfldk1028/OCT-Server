import {
  CreateMessageResult,
  LoggingLevel,
  Resource,
  Root,
  ServerNotification,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useConnection } from "../../../lib/hooks/useConnection";
import { useDraggablePane } from "../../../lib/hooks/useDraggablePane";
import { StdErrNotification } from "../../../lib/notificationTypes";

// Import components
import ConsoleTab from "../../../common/components/ConsoleTab";
import HistoryAndNotifications from "../../../common/components/History";
import PingTab from "../../../common/components/PingTab";
import PromptsTab, { Prompt } from "../../../common/components/PromptsTab";
import ResourcesTab from "../../../common/components/ResourcesTab";
import RootsTab from "../../../common/components/RootsTab";
import SamplingTab from "../../../common/components/SamplingTab";
import Sidebar from "../../../common/components/Sidebar";
import ToolsTab from "../../../common/components/ToolsTab";
import { DEFAULT_INSPECTOR_CONFIG, CONFIG_LOCAL_STORAGE_KEY } from "../../../lib/constants";
import { getMCPProxyAddress } from "../../../utils/configUtils";

// Import refactored modules
import useLocalStorage from "../../../lib/hooks/useLocalStorage";
import { useMcpApi } from "../../../lib/hooks/useMcpApi";
import { ExtendedPendingRequest } from "../../../types";
import TabsContainer from "../../../common/components/inspector/TabsContainer";

// Multi-Server Components
import ServerManagementSidebar from "../../../features/server/components/ServerManagementSidebar";


// Server Info interface for multi-server support
interface ServerInfo {
  id: string;
  name: string;
  status: 'stopped' | 'running' | 'error' | 'starting' | 'stopping';
  type: string;
  serverType?: string;
  host?: string;
  port?: number;
  sessionId?: string;
  activeSessions?: number;
  config?: {
    command?: string;
    args?: string[];
    transportType?: 'stdio' | 'sse' | 'streamable-http';
    sseUrl?: string;
    env?: Record<string, string>;
    execution?: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
  mcpClient?: any;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting' | 'error' | 'error-connecting-to-proxy';
  lastError?: string;
}

const JobPage = () => {
  const [tab, setTab] = useState("resources"); // 기본값

  // 🔥 Multi-Server State
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());
  const [multiServerMode, setMultiServerMode] = useState(true); // 🔥 기본값을 true로 변경

  // Notification for multi-server operations
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Single server state (for backward compatibility)
  const [command, setCommand] = useLocalStorage("lastCommand", "mcp-server-everything");
  const [args, setArgs] = useLocalStorage("lastArgs", "");
  const [sseUrl, setSseUrl] = useLocalStorage("lastSseUrl", "http://localhost:3000/mcp/sse");
  const [transportType, setTransportType] = useLocalStorage<"stdio" | "sse" | "streamable-http">(
    "lastTransportType",
    "stdio"
  );
  const [bearerToken, setBearerToken] = useLocalStorage("lastBearerToken", "");
  const [headerName, setHeaderName] = useLocalStorage("lastHeaderName", "");

  // App-level state
  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [stdErrNotifications, setStdErrNotifications] = useState<StdErrNotification[]>([]);
  const [roots, setRoots] = useState<Root[]>([]);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [pendingSampleRequests, setPendingSampleRequests] = useState<ExtendedPendingRequest[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  // Use useLocalStorage for config with proper type handling
  const [config, setConfig] = useLocalStorage(
    CONFIG_LOCAL_STORAGE_KEY,
    DEFAULT_INSPECTOR_CONFIG
  );

  const nextRequestId = useRef(0);
  const rootsRef = useRef<Root[]>([]);
  const progressTokenRef = useRef(0);

  const { height: historyPaneHeight, handleDragStart } = useDraggablePane(300);

  // 🔥 Dynamic connection params based on server selection
  const connectionParams = React.useMemo(() => {
    console.log("=== Connection Params Debug ===");
    console.log("multiServerMode:", multiServerMode);
    console.log("selectedServer:", selectedServer);
    
    if (multiServerMode && selectedServer?.config?.execution) {
      const execConfig = selectedServer.config.execution;
      const serverTransportType = (selectedServer.config.transportType || "stdio") as 'stdio' | 'sse' | 'streamable-http';
      
      console.log("execConfig:", execConfig);
      console.log("serverTransportType:", serverTransportType);
      
      // Create server-specific URL
      let serverSseUrl: string;
      switch (serverTransportType) {
        case 'stdio':
          const envStr = Object.keys(execConfig.env || {}).length > 0 ? 
          encodeURIComponent(JSON.stringify(execConfig.env)) : 
          encodeURIComponent('{}');
          serverSseUrl = `http://localhost:4303/stdio?transportType=stdio&command=${encodeURIComponent(execConfig.command)}&args=${encodeURIComponent(execConfig.args ? execConfig.args.join(' ') : '')}&env=${envStr}&serverName=${selectedServer.id}`;

          // serverSseUrl = `http://localhost:4303/stdio?transportType=stdio&command=${encodeURIComponent(execConfig.command)}&args=${encodeURIComponent(execConfig.args ? execConfig.args.join(' ') : '')}&env=${envStr}`;
          break;
        case 'sse':
          serverSseUrl = `http://localhost:4303/sse?transportType=sse`;
          break;
        case 'streamable-http':
          serverSseUrl = `http://localhost:4303/mcp?transportType=streamable-http`;
          break;
        default:
          serverSseUrl = `http://localhost:4303/stdio?transportType=stdio&command=${encodeURIComponent(execConfig.command)}&args=${encodeURIComponent(execConfig.args ? execConfig.args.join(' ') : '')}`;
      }
      
      const params = {
        transportType: serverTransportType,
        command: execConfig.command,
        args: execConfig.args ? execConfig.args.join(' ') : "",
        sseUrl: serverSseUrl,
        env: execConfig.env || {},
        bearerToken,
        headerName,
        config,
        serverName: selectedServer?.id
      };
      
      console.log("Generated connection params:", params);
      console.log("================================");
      return params;
    } else {
      // Single server mode (backward compatibility)
      const params = {
        transportType,
        command,
        args,
        sseUrl,
        env,
        bearerToken,
        headerName,
        config,
        serverName: selectedServer?.id
      };
      
      console.log("Single server mode params:", params);
      console.log("================================");
      return params;
    }
  }, [multiServerMode, selectedServer, transportType, command, args, sseUrl, env, bearerToken, headerName, config]);

  // Set up the connection
  const {
    connectionStatus,
    serverCapabilities,
    mcpClient,
    requestHistory,
    makeRequest,
    sendNotification,
    handleCompletion,
    completionsSupported,
    connect: connectMcpServer,
    disconnect: disconnectMcpServer,
  } = useConnection({
    ...connectionParams,
    onNotification: (notification) => {
      setNotifications((prev) => [...prev, notification as ServerNotification]);
    },
    onStdErrNotification: (notification) => {
      setStdErrNotifications((prev) => [
        ...prev,
        notification as StdErrNotification,
      ]);
    },
    onPendingRequest: (request, resolve, reject) => {
      setPendingSampleRequests((prev) => [
        ...prev,
        { id: nextRequestId.current++, request, resolve, reject },
      ]);
    },
    getRoots: () => rootsRef.current,
  });

  // 🔥 Connection Status Debug
  useEffect(() => {
    console.log("=== Connection Status Debug ===");
    console.log("connectionStatus:", connectionStatus);
    console.log("mcpClient:", mcpClient ? "Connected" : "Not connected");
    console.log("serverCapabilities:", serverCapabilities);
    console.log("===============================");
  }, [connectionStatus, mcpClient, serverCapabilities]);

  // Initialize the API service
  const {
    // API error states
    errors,

    // Resources related
    resources,
    resourceTemplates,
    resourceContent,
    resourceSubscriptions,
    listResources,
    listResourceTemplates,
    readResource,
    subscribeToResource,
    unsubscribeFromResource,
    clearResources,
    clearResourceTemplates,

    // Prompts related
    prompts,
    promptContent,
    listPrompts,
    getPrompt,
    clearPrompts,

    // Tools related
    tools,
    toolResult,
    listTools,
    callTool,
    clearTools,

    // Other API methods
    ping,
    setLogLevel,
  } = useMcpApi(makeRequest, {
    resources: null,
    prompts: null,
    tools: null,
  });



  // 🔥 Electron API helper (only for multi-server mode)
  const ensureApi = () => {
    if (!window.api) {
      console.warn('Electron API not available. Multi-server features will be limited.');
      return null;
    }
    return window.api;
  };

  // 🔥 Multi-Server Management Functions
// src/renderer/features/server/pages/job-page.tsx
  const refreshServerStatus = useCallback(async () => {
    
    try {
      const api = ensureApi();
      if (!api) return;
      
      console.log("🔄 Refreshing server status...");
      const fullConfigs = await api.getFullConfigs();
      const activeSessions = await api.getActiveSessions();
      
      // 세션 정보와 서버 정보 병합
      const serversWithSessions = await Promise.all(
        fullConfigs.map(async (server) => {
          const mySession = activeSessions.find(
            (s: any) => s.serverName === server.name || s.serverName === server.id
          );
          
          // 저장된 세션 정보 가져오기
          const savedSession = await api.getServerSession(server.id);
          
          return {
            ...server,
            sessionId: mySession?.sessionId || savedSession?.sessionId || null,
            activeSessions: mySession?.sessionCount || 0,
            connectionStatus: server.status === 'running' && mySession ? 'connected' : 'disconnected',
          };
        })
      );
      
      setServers(serversWithSessions);
      
      if (selectedServer) {
        const updatedServer = serversWithSessions.find(server => server.id === selectedServer.id);
        if (updatedServer) {
          setSelectedServer(updatedServer);
        }
      }
    } catch (error) {
      console.error('Error refreshing server status:', error);
    }
  }, [multiServerMode, selectedServer?.id]);


const connectWithSessionReuse = useCallback(async () => {
  if (!selectedServer) return;
  if (connectionStatus === "connected" && mcpClient) {
    console.log("이미 연결되어 있습니다.");
    return;
  }
  try {
    const api = ensureApi();
    if (!api) return;

    // 1. 활성 세션 정보 가져오기
    const activeSessions = await api.getActiveSessions(selectedServer.id);
    const mySession = activeSessions.find(
      (s: any) => s.serverName === selectedServer.id || s.serverName === selectedServer.name
    );

    if (mySession && mySession.sessionId) {
      // ✅ 기존 세션이 있으면 아무것도 하지 않음!
      console.log("🔄 ✅✅✅✅기존 세션이 있음:", mySession.sessionId);
      await connectMcpServer();
      return;
    } else {
      // ❌ 기존 세션이 없을 때만 새로 연결
      console.log("🆕 세션이 없음, 새 세션 생성");
      await connectMcpServer();

      // 연결 성공 후 sessionId 받아와서 저장
      async function fetchSessionIdWithRetry(api, config, maxRetries = 3, delay = 500) {
        for (let i = 0; i < maxRetries; i++) {
          const sessionId = await api.getMcpSessionId(config);
          if (sessionId) return sessionId;
          await new Promise(res => setTimeout(res, delay));
        }
        return null;
      }
      const sessionId = await fetchSessionIdWithRetry(api, selectedServer.config);
      console.log("❌❌❌❌ 세션 ID:", sessionId)

      if (sessionId) {
        await api.saveServerSession(selectedServer.id, {
          sessionId,
          lastConnected: new Date(),
          transportType: selectedServer.config?.transportType || 'stdio',
          active: true
        });
        console.log(`[connectWithSessionReuse] 연결 성공 후 세션 저장: ${sessionId}`);
      } else {
        console.warn('[connectWithSessionReuse] 연결 성공 후 세션ID를 받아오지 못함 (재시도 후에도 실패)');
      }
    }
  } catch (error) {
    console.error("Error in session management:", error);
    await connectMcpServer(); // 에러 시에도 연결 시도
  }
}, [selectedServer, connectMcpServer, connectionParams]);



// App.tsx의 startServer 수정
const startServer = useCallback(async (serverId: string): Promise<void> => {
  try {
    const api = ensureApi();
    if (!api) throw new Error('Electron API not available');
    
    const serverToStart = servers.find(server => server.id === serverId);
    if (serverToStart) {
      setSelectedServer(serverToStart);
      // 이미 running 상태면 실행하지 않음
      if (serverToStart.status === 'running') {
        setNotification({ message: '서버가 이미 실행 중입니다.', type: 'info' });
        return;
      }
    }
    
    console.log('🚀 서버 시작 요청:', serverId);
    const result = await api.startServer(serverId);
    
    if (result.success) {
      setNotification({ message: '서버가 시작되었습니다.', type: 'success' });
      // 서버 상태 갱신을 기다림 (세션 생성 확인을 위해)
      await new Promise(resolve => setTimeout(resolve, 1500));
      await refreshServerStatus();
      // 세션 저장은 연결 성공 후 useEffect에서만 처리
    } else {
      setNotification({ message: `서버 시작 실패: ${result.message}`, type: 'error' });
    }
  } catch (error) {
    console.error('Error starting server:', error);
    setNotification({ message: '서버 시작 중 오류가 발생했습니다.', type: 'error' });
  }
}, [servers, refreshServerStatus, setSelectedServer]);


  // src/renderer/features/server/pages/job-page.tsx

  const stopServer = useCallback(async (serverId: string): Promise<void> => {
    try {
      const api = ensureApi();
      if (!api) throw new Error('Electron API not available');
      
      // 현재 선택된 서버인지 확인
      const isSelectedServer = selectedServer && selectedServer.id === serverId;
      
      const result = await api.stopServer(serverId);
      
      if (result.success) {
        setNotification({ message: '서버가 중지되었습니다.', type: 'success' });
        
        // userServer.json 세션 정보 업데이트
        try {
          // 서버 세션 정보를 가져옴
          const savedSession = await api.getServerSession(serverId);
          if (savedSession && savedSession.sessionId) {
            // 세션을 비활성 상태로 표시
            await api.saveServerSession(serverId, {
              sessionId: '',
              lastConnected: new Date(),
              transportType: savedSession.transportType || 'stdio',
              commandType: 'unknown',
              active: false  // 비활성 상태로 표시
            });
            console.log(`✅ 서버 중지됨: userServer.json 세션 정보 업데이트됨`);
          }
        } catch (sessionError) {
          console.error('세션 정보 업데이트 중 오류:', sessionError);
        }
        
        // 중지한 서버가 현재 선택된 서버인 경우 클라이언트 연결 해제 및 상태 초기화
        if (isSelectedServer && mcpClient) {
          console.log('🔌 중지된 서버의 클라이언트 연결 해제 중...');
          await disconnectMcpServer();
          
          // 도구 및 리소스 데이터 초기화
          clearTools();
          clearResources();
          clearResourceTemplates();
          clearPrompts();
        }
        
        await refreshServerStatus();
      } else {
        setNotification({ message: `서버 중지 실패: ${result.message}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error stopping server:', error);
      setNotification({ message: '서버 중지 중 오류가 발생했습니다.', type: 'error' });
    }
  }, [refreshServerStatus, selectedServer, mcpClient, disconnectMcpServer, clearTools, clearResources, clearResourceTemplates, clearPrompts]);


  const addNewServer = useCallback(async (serverConfig: {
    name: string;
    command: string;
    args: string[];
    transportType: 'stdio' | 'sse' | 'streamable-http';
    env?: Record<string, string>;
  }): Promise<void> => {
    try {
      const api = ensureApi();
      if (!api) throw new Error('Electron API not available');
      
      const result = await api.addServerConfig(serverConfig);
      
      if (result.success) {
        setNotification({ message: '새 서버가 추가되었습니다.', type: 'success' });
        await refreshServerStatus();
      } else {
        setNotification({ message: `서버 추가 실패: ${result.message}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error adding new server:', error);
      setNotification({ message: '서버 추가 중 오류가 발생했습니다.', type: 'error' });
    }
  }, [refreshServerStatus]);

  // Auto-connect to previously saved serverURL after OAuth callback
  const onOAuthConnect = useCallback(
    (serverUrl: string) => {
      setSseUrl(serverUrl);
      setTransportType("sse");
      void connectMcpServer();
    },
    [connectMcpServer, setSseUrl, setTransportType],
  );

  // 🔥 Initialize servers in multi-server mode
// 주기적으로 서버 상태 갱신
  useEffect(() => {
    if (multiServerMode) {
      console.log("Initializing multi-server mode...");
      refreshServerStatus();
      
      // 10초마다 서버 상태 갱신
      const interval = setInterval(refreshServerStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [multiServerMode, refreshServerStatus]);

  // 🔥 Auto-connect when server is selected and running
  useEffect(() => {
    console.log("=== Auto-connect with Session Reuse ===");
    
    if (multiServerMode && selectedServer && selectedServer.status === 'running' && !mcpClient) {
      console.log('Auto-connecting with session reuse...');
      
      const timer = setTimeout(() => {
        connectWithSessionReuse(); // ✅ 세션 재사용 로직 사용
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [multiServerMode, selectedServer, mcpClient, connectWithSessionReuse]);

  // Fetch default environment configuration
  useEffect(() => {

    // fetch(`${getMCPProxyAddress(config)}/servers/full-config`)
    //   .then((response) => {
    //     console.log(response.json())
    //     console.log("✅✅✅✅✅✅✅✅✅✅✅✅✅")
      
    //   })
   
    
    fetch(`${getMCPProxyAddress(config)}/config`)
      .then((response) => response.json())
      .then((data) => {
        console.log('✅❌❌✅', data);
        setEnv(data.defaultEnvironment);
        if (data.defaultCommand) {
          setCommand(data.defaultCommand);
        }
        if (data.defaultArgs) {
          setArgs(data.defaultArgs);
        }
      })
      .catch((error) =>
        console.error("Error fetching default environment:", error),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep roots reference updated
  useEffect(() => {
    rootsRef.current = roots;
  }, [roots]);

  // Set default hash if none exists
  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "resources";
    }
  }, []);

  // Handler functions
  const handleApproveSampling = useCallback((id: number, result: CreateMessageResult) => {
    setPendingSampleRequests((prev) => {
      const request = prev.find((r) => r.id === id);
      request?.resolve(result);
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const handleRejectSampling = useCallback((id: number) => {
    setPendingSampleRequests((prev) => {
      const request = prev.find((r) => r.id === id);
      request?.reject(new Error("Sampling request rejected"));
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const handleRootsChange = useCallback(async () => {
    await sendNotification({ method: "notifications/roots/list_changed" });
  }, [sendNotification]);

  const handleSetLogLevel = useCallback(async (level: LoggingLevel) => {
    await setLogLevel(level);
  }, [setLogLevel]);

  const clearStdErrNotifications = useCallback(() => {
    setStdErrNotifications([]);
  }, []);

  // API handler functions
  const handleListResources = useCallback(() => {
    console.log("Calling listResources...");
    listResources().catch(console.error);
  }, [listResources]);

  const handleListResourceTemplates = useCallback(() => {
    console.log("Calling listResourceTemplates...");
    listResourceTemplates().catch(console.error);
  }, [listResourceTemplates]);

  const handleReadResource = useCallback((uri: string) => {
    readResource(uri).catch(console.error);
  }, [readResource]);

  const handleSubscribeToResource = useCallback((uri: string) => {
    subscribeToResource(uri).catch(console.error);
  }, [subscribeToResource]);

  const handleUnsubscribeFromResource = useCallback((uri: string) => {
    unsubscribeFromResource(uri).catch(console.error);
  }, [unsubscribeFromResource]);

  const handleListPrompts = useCallback(() => {
    console.log("Calling listPrompts...");
    listPrompts().catch(console.error);
  }, [listPrompts]);

  const handleGetPrompt = useCallback((name: string, args: Record<string, string> = {}) => {
    getPrompt(name, args).catch(console.error);
  }, [getPrompt]);

  const handleListTools = useCallback(() => {
    console.log("Calling listTools...");
    listTools().catch(console.error);
  }, [listTools]);

  const handleCallTool = useCallback((name: string, params: Record<string, unknown>) => {
    callTool(name, params, progressTokenRef.current++).catch(console.error);
  }, [callTool]);

  const handlePing = useCallback(() => {
    ping().catch(console.error);
  }, [ping]);

  // 서버 실행 + 연결 + 세션 저장을 한 번에 처리하는 함수
  const handleStartAndConnect = useCallback(async (serverId: string) => {
    try {
      const api = ensureApi();
      if (!api) throw new Error('Electron API not available');
      console.log('1️⃣ [START] 서버 실행 요청 시작:', serverId);
      const serverToStart = servers.find(server => server.id === serverId);
      if (!serverToStart) {
        setNotification({ message: '서버를 찾을 수 없습니다.', type: 'error' });
        console.log('❌ [ERROR] 서버를 찾을 수 없음:', serverId);
        return;
      }
      // 1. 서버가 이미 실행 중이면 패스
      if (serverToStart.status === 'running') {
        setSelectedServer(serverToStart); // 선택만 확실히!
        setNotification({ message: '서버가 이미 실행 중입니다.', type: 'info' });
        console.log('2️⃣ [SKIP] 이미 실행 중인 서버:', serverToStart);
      } else {
        // 2. 서버 실행
        setNotification({ message: '서버를 시작합니다...', type: 'info' });
        console.log('2️⃣ [RUN] 서버 실행 시도:', serverId);
        const result = await api.startServer(serverId);
        console.log('3️⃣ [RESULT] 서버 실행 결과:', result);
        if (!result.success) {
          setNotification({ message: `서버 시작 실패: ${result.message}`, type: 'error' });
          console.log('❌ [ERROR] 서버 시작 실패:', result.message);
          return;
        }
        // 상태 갱신 대기
        console.log('4️⃣ [WAIT] 상태 갱신 대기...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        await refreshServerStatus();
        console.log('5️⃣ [REFRESH] 서버 상태 갱신 완료');
        // 서버 상태 갱신 후, selectedServer를 다시 set
        const updatedServers = await api.getFullConfigs();
        console.log('6️⃣ [UPDATED_SERVERS] 최신 서버 목록:', updatedServers);
        const updated = updatedServers.find((s: ServerInfo) => s.id === serverId);
        console.log('7️⃣ [UPDATED] 갱신된 서버 정보:', updated);
        if (updated) {
          setSelectedServer(updated);

        } else {
          console.log('7️⃣ [UPDATED] 갱신된 서버 정보 없음');
        }
      }
      // 연결(connect)은 useEffect에서 자동으로!
      console.log('9️⃣ [END] handleStartAndConnect 종료');
    } catch (error) {
      console.error('❌ [ERROR] handleStartAndConnect:', error);
      setNotification({ message: '서버 실행/연결 중 오류가 발생했습니다.', type: 'error' });
    }
  }, [servers, refreshServerStatus, setSelectedServer]);
  // flex-1 overflow-y-auto h-full py-10 md:py-20 px-5 md:px-10
  // Render the UI
  return (
<div className="flex bg-background" style={{ height: "calc(100vh - 5rem)" }}>
      {multiServerMode ? (
        <div className="flex ">
          <ServerManagementSidebar
            servers={servers as any[]}
            selectedServer={selectedServer as any}
            selectedServers={selectedServers}
            setSelectedServer={setSelectedServer}
            setSelectedServers={setSelectedServers}
            startServer={handleStartAndConnect}
            stopServer={stopServer}
            refreshStatus={refreshServerStatus}
            addNewServer={addNewServer}
          />
          {/* Mode Toggle Button */}
          <div className="w-12 border-r border-border flex flex-col">
            <button
              onClick={() => setMultiServerMode(false)}
              className="p-3 text-sm text-gray-600 hover:bg-gray-100 border-b"
              title="Switch to Single Server Mode"
            >
              Single
            </button>
          </div>
        </div>
      ) : (
        <div className="flex">
          <Sidebar
            connectionStatus={connectionStatus}
            transportType={transportType}
            setTransportType={setTransportType}
            command={command}
            setCommand={setCommand}
            args={args}
            setArgs={setArgs}
            sseUrl={sseUrl}
            setSseUrl={setSseUrl}
            env={env}
            setEnv={setEnv}
            config={config}
            setConfig={setConfig}
            bearerToken={bearerToken}
            setBearerToken={setBearerToken}
            headerName={headerName}
            setHeaderName={setHeaderName}
            onConnect={connectMcpServer}
            onDisconnect={disconnectMcpServer}
            stdErrNotifications={stdErrNotifications}
            logLevel={serverCapabilities?.logging?.level || "debug"}
            sendLogLevelRequest={handleSetLogLevel}
            loggingSupported={!!serverCapabilities?.logging || false}
            clearStdErrNotifications={clearStdErrNotifications}
          />
          {/* Mode Toggle Button */}
          <div className="w-12 border-r border-border flex flex-col">
            <button
              onClick={() => setMultiServerMode(true)}
              className="p-3 text-sm text-gray-600 hover:bg-gray-100 border-b"
              title="Switch to Multi Server Mode"
            >
              Multi
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Notification Bar */}

        <div className="flex-1 overflow-auto">
          {mcpClient ? (
            <TabsContainer
              serverCapabilities={serverCapabilities}
              pendingRequestsCount={pendingSampleRequests.length}
              value={tab}
              onValueChange={setTab}
            >
              {tab === "resources" && (
                <ResourcesTab
                  resources={resources}
                  resourceTemplates={resourceTemplates}
                  listResources={handleListResources}
                  clearResources={clearResources}
                  listResourceTemplates={handleListResourceTemplates}
                  clearResourceTemplates={clearResourceTemplates}
                  readResource={handleReadResource}
                  selectedResource={selectedResource}
                  setSelectedResource={setSelectedResource}
                  resourceSubscriptionsSupported={serverCapabilities?.resources?.subscribe || false}
                  resourceSubscriptions={resourceSubscriptions}
                  subscribeToResource={handleSubscribeToResource}
                  unsubscribeFromResource={handleUnsubscribeFromResource}
                  handleCompletion={handleCompletion}
                  completionsSupported={completionsSupported}
                  resourceContent={resourceContent}
                  nextCursor={undefined}
                  nextTemplateCursor={undefined}
                  error={errors.resources}
                />
              )}
              {tab === "prompts" && (
                <PromptsTab
                  prompts={prompts}
                  listPrompts={handleListPrompts}
                  clearPrompts={clearPrompts}
                  getPrompt={handleGetPrompt}
                  selectedPrompt={selectedPrompt}
                  setSelectedPrompt={setSelectedPrompt}
                  handleCompletion={handleCompletion}
                  completionsSupported={completionsSupported}
                  promptContent={promptContent}
                  nextCursor={undefined}
                  error={errors.prompts}
                  serverCapabilities={serverCapabilities}
                />
              )}
              {tab === "tools" && (
                <ToolsTab
                  tools={tools}
                  listTools={handleListTools}
                  clearTools={clearTools}
                  callTool={handleCallTool}
                  selectedTool={selectedTool}
                  setSelectedTool={setSelectedTool}
                  toolResult={toolResult}
                  nextCursor={undefined}
                  error={errors.tools}
                />
              )}
              <ConsoleTab />
              <PingTab onPingClick={handlePing} />
              <SamplingTab
                pendingRequests={pendingSampleRequests}
                onApprove={handleApproveSampling}
                onReject={handleRejectSampling}
              />
              <RootsTab
                roots={roots}
                setRoots={setRoots}
                onRootsChange={handleRootsChange}
              />
            </TabsContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg text-gray-500 mb-4">
                  {multiServerMode ? 
                    (selectedServer ? 
                      `Select and start a server to begin inspection` :
                      `Select a server from the sidebar to begin`
                    ) : 
                    `Connect to an MCP server to start inspecting`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
        <div
          className="relative border-t border-border"
          style={{
            height: `${historyPaneHeight}px`,
          }}
        >
          <div
            className="absolute w-full h-4 -top-2 cursor-row-resize flex items-center justify-center hover:bg-accent/50"
            onMouseDown={handleDragStart}
          >
            <div className="w-8 h-1 rounded-full bg-border" />
          </div>
          <div className="h-full overflow-auto">
            <HistoryAndNotifications
              requestHistory={requestHistory}
              serverNotifications={notifications}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobPage;