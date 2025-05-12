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
import { DEFAULT_INSPECTOR_CONFIG } from "../../../lib/constants";
import { getMCPProxyAddress } from "../../../utils/configUtils";

// Import refactored modules
import useLocalStorage from "../../../lib/hooks/useLocalStorage";
import { useMcpApi } from "../../../lib/hooks/useMcpApi";
import { ExtendedPendingRequest } from "../../../types";
import TabsContainer from "../../../common/components/inspector/TabsContainer";

// Multi-Server Components
import ServerManagementSidebar from "../../../features/server/components/ServerManagementSidebar";

const CONFIG_LOCAL_STORAGE_KEY = "inspectorConfig_v1";

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

const App = () => {
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
          serverSseUrl = `http://localhost:4303/stdio?transportType=stdio&command=${encodeURIComponent(execConfig.command)}&args=${encodeURIComponent(execConfig.args ? execConfig.args.join(' ') : '')}&env=${envStr}`;
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

  // 🔥 API Data Debug
  useEffect(() => {
    console.log("=== API Data Debug ===");
    console.log("resources:", resources);
    console.log("prompts:", prompts);
    console.log("tools:", tools);
    console.log("errors:", errors);
    console.log("=====================");
  }, [resources, prompts, tools, errors]);

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
    if (!multiServerMode) return;
    
    try {
      const api = ensureApi();
      if (!api) return;
      
      console.log("🔄 Refreshing server status...");
      const fullConfigs = await api.getFullConfigs();
      const activeSessions = await api.getActiveSessions();
      
      // 세션 정보와 서버 정보 병합
      const serversWithSessions = await Promise.all(
        fullConfigs.map(async (server) => {
          const activeSession = activeSessions.find(
            session => session.serverName === server.name || session.serverName === server.id
          );
          
          // 저장된 세션 정보 가져오기
          const savedSession = await api.getServerSession(server.id);
          
          return {
            ...server,
            sessionId: activeSession?.sessionId || savedSession?.sessionId || null,
            activeSessions: activeSession?.sessionCount || 0,
            connectionStatus: server.status === 'running' && activeSession ? 'connected' : 'disconnected',
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

// src/renderer/features/server/pages/job-page.tsx
// 서버 시작 시 자동으로 선택하기
// const startServer = useCallback(async (serverId: string): Promise<void> => {
//   try {
//     const api = ensureApi();
//     if (!api) throw new Error('Electron API not available');
    
//     // 🔥 서버 시작 시 해당 서버를 자동으로 선택
//     const serverToStart = servers.find(server => server.id === serverId);
//     if (serverToStart) {
//       console.log("Auto-selecting server on start:", serverToStart.name);
//       setSelectedServer(serverToStart);
//     }
    
//     const result = await api.startServer(serverId);
    
//     if (result.success) {
//       setNotification({ message: '서버가 시작되었습니다.', type: 'success' });
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       await refreshServerStatus();
      
//       // 새 세션 ID 확인 및 저장
//       const servers = await api.getFullConfigs();
//       const updatedServer = servers.find(s => s.id === serverId);
      
//       if (updatedServer?.sessionId) {
//         await api.saveServerSession(serverId, {
//           sessionId: updatedServer.sessionId,
//           lastConnected: new Date(),
//           transportType: updatedServer.config?.transportType || 'stdio'
//         });
//         console.log(`✅ Session saved: ${updatedServer.sessionId}`);
//       }
//     } else {
//       setNotification({ message: `서버 시작 실패: ${result.message}`, type: 'error' });
//     }
//   } catch (error) {
//     console.error('Error starting server:', error);
//     setNotification({ message: '서버 시작 중 오류가 발생했습니다.', type: 'error' });
//   }
// }, [servers, refreshServerStatus]);
// job-page.tsx의 connectWithSessionReuse 함수 수정


const connectWithSessionReuse = useCallback(async () => {
  if (!selectedServer) return;
  
  try {
    const api = ensureApi();
    if (!api) return;
    
    // 1. 활성 세션 정보 가져오기 (서버 매니저가 관리하는 세션)
    const activeSessions = await api.getActiveSessions(selectedServer.id);
    
    if (activeSessions && activeSessions.length > 0 && activeSessions[0].sessionId) {
      console.log("🔍 서버에 이미 생성된 세션 발견:", activeSessions[0].sessionId);
      
      // 2. 기존 세션 ID를 사용하여 연결 파라미터 설정
      const existingSessionId = activeSessions[0].sessionId;
      
      // 3. 연결 파라미터에 sessionId 포함시키기
      const updatedParams = { ...connectionParams };
      
      // URL에 sessionId 추가
      if (updatedParams.sseUrl && !updatedParams.sseUrl.includes('sessionId=')) {
        const separator = updatedParams.sseUrl.includes('?') ? '&' : '?';
        updatedParams.sseUrl = `${updatedParams.sseUrl}${separator}sessionId=${existingSessionId}`;
      }
      
      console.log("🔄 기존 세션으로 연결 시도:", existingSessionId);
      console.log("업데이트된 연결 URL:", updatedParams.sseUrl);
      
      // 기존 연결 로직 사용
      await connectMcpServer(updatedParams);
    } else {
      console.log("🆕 세션이 없음, 새 세션 생성");
      await connectMcpServer();
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
    }
    
    console.log('🚀 서버 시작 요청:', serverId);
    const result = await api.startServer(serverId);
    
    if (result.success) {
      setNotification({ message: '서버가 시작되었습니다.', type: 'success' });
      
      // 서버 상태 갱신을 기다림 (세션 생성 확인을 위해)
      await new Promise(resolve => setTimeout(resolve, 1500));
      await refreshServerStatus();
      
      // 새로 갱신된 서버 정보 확인
      const activeSessions = await api.getActiveSessions(serverId);
      console.log('✓ 활성 세션 정보:', activeSessions);
      
      if (activeSessions && activeSessions.length > 0 && activeSessions[0].sessionId) {
        // 세션 ID 저장 - 활성 상태로 명시적 표시
        await api.saveServerSession(serverId, {
          sessionId: activeSessions[0].sessionId,
          lastConnected: new Date(),
          transportType: serverToStart?.config?.transportType || 'stdio',
          commandType: 'unknown',
          active: true  // 세션이 활성 상태임을 명시적으로 표시
        });
        console.log(`✅ Session saved: ${activeSessions[0].sessionId} (active=true)`);
      } else {
        console.log('⚠️ 활성 세션을 찾을 수 없습니다. 자동 연결은 자체 세션을 생성합니다.');
      }
      
      // 서버가 시작된 후 자동으로 세션 재사용 로직으로 연결
      // 자동 연결 useEffect에서 처리되므로 여기서는 별도로 호출하지 않음
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
              sessionId: savedSession.sessionId,
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

  const startMultipleServers = useCallback(async (): Promise<void> => {
    try {
      const api = ensureApi();
      if (!api) throw new Error('Electron API not available');
      
      const serverConfigs = servers
        .filter(server => selectedServers.has(server.id))
        .map(server => ({
          serverName: server.name,
          config: server.config || {}
        }));
      
      if (serverConfigs.length === 0) {
        setNotification({ message: '선택된 서버가 없습니다.', type: 'info' });
        return;
      }
      
      const result = await api.startMultipleServers(serverConfigs);
      
      setNotification({
        message: `${result.succeeded}/${result.total} 서버가 시작되었습니다.`,
        type: result.succeeded === result.total ? 'success' : 'info'
      });
      
      await refreshServerStatus();
    } catch (error) {
      console.error('Error starting multiple servers:', error);
      setNotification({ message: '서버 시작 중 오류가 발생했습니다.', type: 'error' });
    }
  }, [servers, selectedServers, refreshServerStatus]);

  const stopMultipleServers = useCallback(async (): Promise<void> => {
    try {
      const api = ensureApi();
      if (!api) throw new Error('Electron API not available');
      
      const serversToStop = servers.filter(server => selectedServers.has(server.id));
      const serverNames = serversToStop.map(server => server.name);
      
      if (serverNames.length === 0) {
        setNotification({ message: '선택된 서버가 없습니다.', type: 'info' });
        return;
      }
      
      // 현재 선택된 서버가 중지 대상에 포함되는지 확인
      const isSelectedServerStopping = selectedServer && 
        selectedServers.has(selectedServer.id);
      
      const result = await api.stopMultipleServers(serverNames);
      
      setNotification({
        message: `${result.succeeded}/${result.total} 서버가 중지되었습니다.`,
        type: result.succeeded === result.total ? 'success' : 'info'
      });
      
      // 각 서버의 세션 정보 업데이트
      await Promise.all(serversToStop.map(async (server) => {
        try {
          // 서버 세션 정보를 가져옴
          const savedSession = await api.getServerSession(server.id);
          if (savedSession && savedSession.sessionId) {
            // 세션을 비활성 상태로 표시
            await api.saveServerSession(server.id, {
              sessionId: savedSession.sessionId,
              lastConnected: new Date(),
              transportType: savedSession.transportType || 'stdio',
              commandType: 'unknown',
              active: false  // 비활성 상태로 표시
            });
            console.log(`✅ 서버 ${server.id} 중지됨: userServer.json 세션 정보 업데이트됨`);
          }
        } catch (sessionError) {
          console.error(`서버 ${server.id} 세션 정보 업데이트 중 오류:`, sessionError);
        }
      }));
      
      // 현재 선택된 서버가 중지 대상에 포함된 경우 클라이언트 연결 해제 및 상태 초기화
      if (isSelectedServerStopping && mcpClient) {
        console.log('🔌 중지된 서버의 클라이언트 연결 해제 중...');
        await disconnectMcpServer();
        
        // 도구 및 리소스 데이터 초기화
        clearTools();
        clearResources();
        clearResourceTemplates();
        clearPrompts();
      }
      
      await refreshServerStatus();
    } catch (error) {
      console.error('Error stopping multiple servers:', error);
      setNotification({ message: '서버 중지 중 오류가 발생했습니다.', type: 'error' });
    }
  }, [servers, selectedServers, refreshServerStatus, selectedServer, mcpClient, disconnectMcpServer, clearTools, clearResources, clearResourceTemplates, clearPrompts]);

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
    fetch(`${getMCPProxyAddress(config)}/config`)
      .then((response) => response.json())
      .then((data) => {
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

  // Render the UI
  return (
    <div className="flex h-screen bg-background">

      {multiServerMode ? (
        <div className="flex">
          <ServerManagementSidebar
            servers={servers as any[]}
            selectedServer={selectedServer as any}
            selectedServers={selectedServers}
            setSelectedServer={setSelectedServer}
            setSelectedServers={setSelectedServers}
            startServer={startServer}
            stopServer={stopServer}
            startMultiple={startMultipleServers}
            stopMultiple={stopMultipleServers}
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

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Notification Bar */}
        {notification && (
          <div className={`p-4 text-center ${
            notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          } text-white`}>
            {notification.message}
            <button 
              onClick={() => setNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {mcpClient ? (
            <TabsContainer
              serverCapabilities={serverCapabilities}
              pendingRequestsCount={pendingSampleRequests.length}
            >
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
                resourceSubscriptionsSupported={
                  serverCapabilities?.resources?.subscribe || false
                }
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
              <PromptsTab
                prompts={prompts}
                listPrompts={handleListPrompts}
                clearPrompts={clearPrompts}
                getPrompt={handleGetPrompt}
                selectedPrompt={selectedPrompt}
                setSelectedPrompt={(prompt) => {
                  setSelectedPrompt(prompt);
                }}
                handleCompletion={handleCompletion}
                completionsSupported={completionsSupported}
                promptContent={promptContent}
                nextCursor={undefined}
                error={errors.prompts}
              />
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
                {multiServerMode && selectedServer && selectedServer.status !== 'running' && (
                  <button
                    onClick={() => startServer(selectedServer.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Start Server
                  </button>
                )}
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

export default App;