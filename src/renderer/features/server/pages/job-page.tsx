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
  const refreshServerStatus = useCallback(async () => {
    if (!multiServerMode) return;
    
    try {
      const api = ensureApi();
      if (!api) return;
      
      console.log("Refreshing server status...");
      const fullConfigs = await api.getFullConfigs();
      console.log("Full configs received:", fullConfigs);
      setServers(fullConfigs);
      
      if (selectedServer) {
        const updatedServer = fullConfigs.find(server => server.id === selectedServer.id);
        if (updatedServer) {
          console.log("Updated selected server:", updatedServer);
          setSelectedServer(updatedServer);
        }
      }
    } catch (error) {
      console.error('Error refreshing server status:', error);
    }
  }, [multiServerMode, selectedServer?.id]);

  const startServer = useCallback(async (serverId: string): Promise<void> => {
    try {
      const api = ensureApi();
      if (!api) throw new Error('Electron API not available');
      
      // 🔥 서버 시작 시 해당 서버를 자동으로 선택
      const serverToStart = servers.find(server => server.id === serverId);
      if (serverToStart) {
        console.log("Auto-selecting server on start:", serverToStart.name);
        setSelectedServer(serverToStart);
      }
      
      const result = await api.startServer(serverId);
      
      if (result.success) {
        setNotification({ message: '서버가 시작되었습니다.', type: 'success' });
        await refreshServerStatus();
      } else {
        setNotification({ message: `서버 시작 실패: ${result.message}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error starting server:', error);
      setNotification({ message: '서버 시작 중 오류가 발생했습니다.', type: 'error' });
    }
  }, [servers, refreshServerStatus]);

  const stopServer = useCallback(async (serverId: string): Promise<void> => {
    try {
      const api = ensureApi();
      if (!api) throw new Error('Electron API not available');
      
      const result = await api.stopServer(serverId);
      
      if (result.success) {
        setNotification({ message: '서버가 중지되었습니다.', type: 'success' });
        await refreshServerStatus();
      } else {
        setNotification({ message: `서버 중지 실패: ${result.message}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error stopping server:', error);
      setNotification({ message: '서버 중지 중 오류가 발생했습니다.', type: 'error' });
    }
  }, [refreshServerStatus]);

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
      
      const serverNames = servers
        .filter(server => selectedServers.has(server.id))
        .map(server => server.name);
      
      if (serverNames.length === 0) {
        setNotification({ message: '선택된 서버가 없습니다.', type: 'info' });
        return;
      }
      
      const result = await api.stopMultipleServers(serverNames);
      
      setNotification({
        message: `${result.succeeded}/${result.total} 서버가 중지되었습니다.`,
        type: result.succeeded === result.total ? 'success' : 'info'
      });
      
      await refreshServerStatus();
    } catch (error) {
      console.error('Error stopping multiple servers:', error);
      setNotification({ message: '서버 중지 중 오류가 발생했습니다.', type: 'error' });
    }
  }, [servers, selectedServers, refreshServerStatus]);

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
  useEffect(() => {
    if (multiServerMode) {
      console.log("Initializing multi-server mode...");
      refreshServerStatus();
    }
  }, [multiServerMode, refreshServerStatus]);

  // 🔥 Auto-connect when server is selected and running
  useEffect(() => {
    console.log("=== Auto-connect Logic ===");
    console.log("multiServerMode:", multiServerMode);
    console.log("selectedServer:", selectedServer);
    console.log("selectedServer status:", selectedServer?.status);
    console.log("mcpClient:", mcpClient ? "exists" : "null");
    
    if (multiServerMode && selectedServer && selectedServer.status === 'running' && !mcpClient) {
      console.log('Auto-connecting to selected server...', selectedServer.name);
      console.log('Connection params:', connectionParams);
      
      const timer = setTimeout(() => {
        console.log('Starting connection attempt...');
        connectMcpServer().then(() => {
          console.log('Connection successful!');
        }).catch(error => {
          console.error('Auto-connect failed:', error);
          setNotification({ 
            message: `서버 연결 실패: ${error.message}`, 
            type: 'error' 
          });
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    console.log("========================");
  }, [multiServerMode, selectedServer, mcpClient, connectMcpServer, connectionParams]);

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

  // 🔥 Auto-load resources when connected
// 🔥 Auto-connect when server is selected and running
// 🔥 Auto-connect when server is selected and running
useEffect(() => {
  console.log("=== Auto-connect Logic ===");
  console.log("multiServerMode:", multiServerMode);
  console.log("selectedServer:", selectedServer);
  console.log("selectedServer status:", selectedServer?.status);
  console.log("mcpClient:", mcpClient ? "exists" : "null");
  console.log("connectionStatus:", connectionStatus);
  
  // 🔥 Error 상태이거나 이미 연결 중이면 연결 시도하지 않음
  if (connectionStatus === 'error' || connectionStatus === 'connecting') {
    console.log("Skipping connection due to error/connecting status");
    return;
  }
  
  if (multiServerMode && selectedServer && selectedServer.status === 'running' && !mcpClient) {
    console.log('Auto-connecting to selected server...', selectedServer.name);
    console.log('Connection params:', connectionParams);
    
    const timer = setTimeout(() => {
      console.log('Starting connection attempt...');
      console.log('About to call connectMcpServer()');
      connectMcpServer().then(() => {
        console.log('Connection successful!');
      }).catch(error => {
        console.error('Auto-connect failed:', error);
        setNotification({ 
          message: `서버 연결 실패: ${error.message}`, 
          type: 'error' 
        });
        
        // 🔥 연결 실패 시 상태 리셋
        setTimeout(() => {
          if (connectionStatus === 'error') {
            console.log('Resetting connection status after error');
            // 상태 리셋 (disconnect 호출)
            disconnectMcpServer();
          }
        }, 5000); // 5초 후 리셋
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }
  console.log("========================");
}, [multiServerMode, selectedServer, mcpClient, connectionStatus, connectMcpServer, disconnectMcpServer, connectionParams]);

  // Render the UI
  return (
    <div className="flex h-screen bg-background">
      {/* 🔥 Debug Panel */}
      {/* <div className="w-80 p-4 bg-gray-100 text-xs overflow-y-auto">
        <h3 className="font-bold mb-2">Debug Info</h3>
        <div className="space-y-2">
          <div>MultiServer: {multiServerMode ? 'ON' : 'OFF'}</div>
          <div>Selected Server: {selectedServer ? selectedServer.name : 'None'}</div>
          <div>Connection Status: {connectionStatus}</div>
          <div>MCP Client: {mcpClient ? 'Connected' : 'Not connected'}</div>
          <div>Resources: {resources ? resources.length : 0}</div>
          <div>Prompts: {prompts ? prompts.length : 0}</div>
          <div>Tools: {tools ? tools.length : 0}</div>
          <div>Server Status: {selectedServer?.status || 'N/A'}</div>
        </div>
      </div> */}

      {/* Conditional Sidebar */}
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