import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useConnection } from "../../../lib/hooks/useConnection";
import { useDraggablePane } from "../../../lib/hooks/useDraggablePane";
import useLocalStorage from "../../../lib/hooks/useLocalStorage";
import { useMcpApi } from "../../../lib/hooks/useMcpApi";
import { DEFAULT_INSPECTOR_CONFIG } from "../../../lib/constants";

import ConsoleTab from "../../../common/components/ConsoleTab";
import HistoryAndNotifications from "../../../common/components/History";
import PingTab from "../../../common/components/PingTab";
import PromptsTab, { Prompt } from "../../../common/components/PromptsTab";
import ResourcesTab from "../../../common/components/ResourcesTab";
import RootsTab from "../../../common/components/RootsTab";
import SamplingTab from "../../../common/components/SamplingTab";
import ToolsTab from "../../../common/components/ToolsTab";
import TabsContainer from "../../../common/components/inspector/TabsContainer";

// Import types
import {
  CreateMessageResult,
  LoggingLevel,
  Resource,
  Root,
  ServerNotification,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { StdErrNotification } from "../../../lib/notificationTypes";
import { ExtendedPendingRequest } from "../../../types";

// Multi-server specific imports
import ServerManagementSidebar from "../components/ServerManagementSidebar";

const CONFIG_LOCAL_STORAGE_KEY = "inspectorConfig_v1";

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

// 🔥 추가: connectionParams 타입을 위한 인터페이스
interface ConnectionParamsType {
  transportType: 'stdio' | 'sse' | 'streamable-http';
  command: string;
  args: string;
  sseUrl: string;
  env: Record<string, string>;
}

// Electron IPC API 타입 정의
declare global {
  interface Window {
    api: {
      getServerStatus: () => Promise<ServerInfo[]>;
      getFullConfigs: () => Promise<ServerInfo[]>;
      startServer: (serverId: string) => Promise<{ success: boolean; message?: string }>;
      stopServer: (serverId: string) => Promise<{ success: boolean; message?: string }>;
      restartServer: (serverId: string) => Promise<{ success: boolean; message?: string }>;
      installServer: (name: string, command: string, envVars?: Record<string, string>) => Promise<{ success: boolean; message?: string }>;
      startMultipleServers: (serverConfigs: Array<{serverName: string, config: any}>) => Promise<{
        total: number;
        succeeded: number;
        failed: number;
        results: Array<{serverName: string, status: string, error?: string}>;
      }>;
      stopMultipleServers: (serverNames: string[]) => Promise<{
        total: number;
        succeeded: number;
        failed: number;
        results: Array<{serverName: string, status: string, error?: string}>;
      }>;
      getMcpSessionId: (config: any) => Promise<string | null>;
      connectToMcpServer: (serverName: string, config: any, transportType?: 'stdio' | 'sse' | 'streamable-http') => Promise<{
        success: boolean;
        sessionId?: string;
        error?: string;
      }>;
      disconnectFromMcpServer: (sessionId: string) => Promise<boolean>;
      getActiveSessions: (serverName?: string) => Promise<any[]>;
      addServerConfig: (serverConfig: {
        name: string;
        command: string;
        args: string[];
        transportType: 'stdio' | 'sse' | 'streamable-http';
        env?: Record<string, string>;
      }) => Promise<{ success: boolean; message?: string }>;
      updateServerConfig: (serverId: string, config: any) => Promise<{ success: boolean; message?: string }>;
      removeServerConfig: (serverId: string) => Promise<{ success: boolean; message?: string }>;
    };
  }
}

const ServerPage = () => {
  // Multi-server state
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());

  // Notification for multi-server operations
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Server-specific state
  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [stdErrNotifications, setStdErrNotifications] = useState<StdErrNotification[]>([]);
  const [roots, setRoots] = useState<Root[]>([]);
  const [pendingSampleRequests, setPendingSampleRequests] = useState<ExtendedPendingRequest[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const [config, setConfig] = useLocalStorage(CONFIG_LOCAL_STORAGE_KEY, DEFAULT_INSPECTOR_CONFIG);

  const nextRequestId = useRef(0);
  const rootsRef = useRef<Root[]>([]);
  const progressTokenRef = useRef(0);
  const refreshServerStatusRef = useRef<() => Promise<void>>(async () => {});

  const { height: historyPaneHeight, handleDragStart } = useDraggablePane(300);

  // 세션 관리 상태
  const [hasActiveSessionError, setHasActiveSessionError] = useState<boolean>(false);
  const [isStatusRefreshing, setIsStatusRefreshing] = useState<boolean>(false);

  // Electron API helper
  const ensureApi = () => {
    if (!window.api) {
      throw new Error('Electron API not available. Make sure preload script is loaded correctly.');
    }
    return window.api;
  };

  // 🔥 중요: serverName 제거하고 App.tsx와 동일한 방식으로 연결
  const connectionParams = useMemo(() => {
    if (selectedServer?.config?.execution) {
      const execConfig = selectedServer.config.execution;
      
      return {
        transportType: (selectedServer.config.transportType || "stdio") as 'stdio' | 'sse' | 'streamable-http',
        command: execConfig.command,
        args: execConfig.args ? execConfig.args.join(' ') : "",
        sseUrl: selectedServer.config.sseUrl || "http://localhost:4303/mcp/sse",
        env: execConfig.env || {},
        // serverName 제거 - 이게 문제였음!
        // serverName: selectedServer.name
      };
    }
    
    return {
      transportType: "stdio" as 'stdio' | 'sse' | 'streamable-http',
      command: "npx",
      args: "-y @modelcontextprotocol/server-sequential-thinking",
      sseUrl: "http://localhost:4303/mcp/sse",
      env: {},
    };
  }, [selectedServer]);

  // Connection hook for selected server
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
    bearerToken: "",
    headerName: "",
    config,
    onNotification: (notification) => {
      setNotifications((prev) => [...prev, notification as ServerNotification]);
    },
    onStdErrNotification: (notification) => {
      setStdErrNotifications((prev) => [...prev, notification as StdErrNotification]);
    },
    onPendingRequest: (request, resolve, reject) => {
      setPendingSampleRequests((prev) => [
        ...prev,
        { id: nextRequestId.current++, request, resolve, reject },
      ]);
    },
    getRoots: () => rootsRef.current,
  });

  // API service for selected server
  const {
    errors,
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
    prompts,
    promptContent,
    listPrompts,
    getPrompt,
    clearPrompts,
    tools,
    toolResult,
    listTools,
    callTool,
    clearTools,
    ping,
    setLogLevel,
  } = useMcpApi(makeRequest, {
    resources: null,
    prompts: null,
    tools: null,
  });

  // 🔥 자동 리소스 로딩 추가
  useEffect(() => {
    if (connectionStatus === 'connected' && serverCapabilities) {
      console.log('연결 완료! 자동으로 리소스 로딩...', serverCapabilities);
      
      // 서버 capabilities에 따라 자동으로 리스트 요청
      if (serverCapabilities.resources) {
        handleListResources();
        handleListResourceTemplates();
      }
      if (serverCapabilities.prompts) {
        handleListPrompts();
      }
      if (serverCapabilities.tools) {
        handleListTools();
      }
    }
  }, [connectionStatus, serverCapabilities]);

  // Server session management
  const refreshServerStatus = useCallback(async () => {
    try {
      if (isStatusRefreshing) return;
      setIsStatusRefreshing(true);
      
      const fullConfigs = await window.api.getFullConfigs();
      
      if (!hasActiveSessionError) {
        try {
          for (const server of fullConfigs) {
            if (server.status === 'running') {
              const sessions = await window.api.getActiveSessions(server.name);
              server.activeSessions = sessions?.length || 0;
            }
          }
        } catch (error) {
          console.error('Error fetching active sessions:', error);
          setHasActiveSessionError(true);
        }
      }
      
      setServers(fullConfigs);
      
      if (selectedServer) {
        const updatedServer = fullConfigs.find(server => server.id === selectedServer.id);
        if (updatedServer && 
            (updatedServer.status !== selectedServer.status || 
             updatedServer.activeSessions !== selectedServer.activeSessions)) {
          setSelectedServer(updatedServer);
        }
      } 
    } catch (error) {
      console.error('Error refreshing server status:', error);
    } finally {
      setIsStatusRefreshing(false);
    }
  }, [isStatusRefreshing, hasActiveSessionError, selectedServer?.id]);

  // 함수 참조 업데이트
  useEffect(() => {
    refreshServerStatusRef.current = refreshServerStatus;
  }, [refreshServerStatus]);

  // Initialize with longer refresh interval
  useEffect(() => {
    const initializeServers = async () => {
      await refreshServerStatusRef.current();

      const interval = setInterval(() => {
        refreshServerStatusRef.current();
      }, 120000);
      
      return () => clearInterval(interval);
    };
    
    initializeServers();
  }, []);

  // Keep roots reference updated
  useEffect(() => {
    rootsRef.current = roots;
  }, [roots]);

  // 🔥 수정된 자동 연결 로직
  useEffect(() => {
    if (selectedServer && selectedServer.status === 'running' && !mcpClient) {
      console.log('서버가 실행 중이므로 MCP 클라이언트 연결 시도...', selectedServer.name);
      
      // App.tsx와 동일한 방식으로 연결
      const timer = setTimeout(() => {
        connectMcpServer().catch(error => {
          console.error('MCP 클라이언트 연결 실패:', error);
          setNotification({ 
            message: '서버에 연결할 수 없습니다. 서버 상태를 확인하세요.', 
            type: 'error' 
          });
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedServer, mcpClient, connectMcpServer]);

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
    listResources().catch(console.error);
  }, [listResources]);

  const handleListResourceTemplates = useCallback(() => {
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
    listPrompts().catch(console.error);
  }, [listPrompts]);

  const handleGetPrompt = useCallback((name: string, args: Record<string, string> = {}) => {
    getPrompt(name, args).catch(console.error);
  }, [getPrompt]);

  const handleListTools = useCallback(() => {
    listTools().catch(console.error);
  }, [listTools]);

  const handleCallTool = useCallback(async (name: string, params: Record<string, unknown>): Promise<void> => {
    try {
      await callTool(name, params, progressTokenRef.current++);
    } catch (error) {
      console.error('Error calling tool:', error);
      throw error;
    }
  }, [callTool]);

  const handlePing = useCallback(() => {
    ping().catch(console.error);
  }, [ping]);

  // 서버 및 클라이언트 관리 함수들
  const startServer = useCallback(async (serverId: string): Promise<void> => {
    try {
      const serverToStart = servers.find(server => server.id === serverId);
      if (serverToStart) {
        setSelectedServer(serverToStart);
      }
      
      const api = ensureApi();
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
  }, [mcpClient, connectMcpServer, refreshServerStatus, selectedServer, servers]);

  const stopServer = useCallback(async (serverId: string): Promise<void> => {
    try {
      const api = ensureApi();
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
  }, []);

  // ServerManagementSidebar props에 맞게 인자 없이 선택된 서버들을 처리하는 함수로 변경
  const startMultipleServers = useCallback(async (): Promise<void> => {
    try {
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
      
      const api = ensureApi();
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
  }, [servers, selectedServers]);

  // ServerManagementSidebar props에 맞게 인자 없이 선택된 서버들을 처리하는 함수로 변경
  const stopMultipleServers = useCallback(async (): Promise<void> => {
    try {
      const serverNames = servers
        .filter(server => selectedServers.has(server.id))
        .map(server => server.name);
      
      if (serverNames.length === 0) {
        setNotification({ message: '선택된 서버가 없습니다.', type: 'info' });
        return;
      }
      
      const api = ensureApi();
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
  }, [servers, selectedServers]);

  const addNewServer = useCallback(async (serverConfig: {
    name: string;
    command: string;
    args: string[];
    transportType: 'stdio' | 'sse' | 'streamable-http';
    env?: Record<string, string>;
  }): Promise<void> => {
    try {
      const api = ensureApi();
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
  }, []);

  // Render the UI
  return (
    <div className="flex h-screen bg-background">
      {/* Server Management Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Notification Bar */}
        {notification && (
          <div className={`p-4 text-center ${
            notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
          } text-white`}>
            {notification.message}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {selectedServer && mcpClient ? (
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
                setSelectedPrompt={setSelectedPrompt}
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
                  {servers.length === 0 ?
                    '연결할 MCP 서버가 없습니다.' :
                    selectedServer ?
                      connectionStatus === 'error' || connectionStatus === 'error-connecting-to-proxy' ?
                        `서버 "${selectedServer.name}"에 연결할 수 없습니다. (상태: ${connectionStatus})` :
                      (connectionStatus as string) === 'connecting' ?
                        `서버 "${selectedServer.name}"에 연결 시도 중입니다...` :
                      selectedServer.status !== 'running' ?
                        `서버 "${selectedServer.name}"가 실행 중이 아닙니다.` :
                        `서버 "${selectedServer.name}"는 실행 중이지만 MCP와 연결되지 않았습니다. (연결 상태: ${connectionStatus})`
                  :
                    'MCP 서버를 선택하여 인스펙터를 시작하세요.'
                  }
                </p>
                {selectedServer && selectedServer.status !== 'running' && (
                  <button
                    onClick={() => startServer(selectedServer.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    서버 시작
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* History Pane */}
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

export default ServerPage;