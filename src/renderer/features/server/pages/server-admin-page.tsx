// import React, {
//     useCallback,
//     useEffect,
//     useRef,
//     useState,
//   } from "react";
//   import { useConnection } from "../../../lib/hooks/useConnection";
//   import { useDraggablePane } from "../../../lib/hooks/useDraggablePane";
//   import useLocalStorage from "../../../lib/hooks/useLocalStorage";
//   import { useMcpApi } from "../../../lib/hooks/useMcpApi";
//   import { DEFAULT_INSPECTOR_CONFIG } from "../../../lib/constants";
//
//   import ConsoleTab from "../../../common/components/ConsoleTab";
//   import HistoryAndNotifications from "../../../common/components/History";
//   import PingTab from "../../../common/components/PingTab";
//   import PromptsTab, { Prompt } from "../../../common/components/PromptsTab";
//   import ResourcesTab from "../../../common/components/ResourcesTab";
//   import RootsTab from "../../../common/components/RootsTab";
//   import SamplingTab from "../../../common/components/SamplingTab";
//   import Sidebar from "../../../common/components/Sidebar";
//   import ToolsTab from "../../../common/components/ToolsTab";
//   import TabsContainer from "../../../common/components/inspector/TabsContainer";
//   import { getMCPProxyAddress } from "../../../utils/configUtils";
//
//   // Import types
//   import {
//     CreateMessageResult,
//     LoggingLevel,
//     Resource,
//     Root,
//     ServerNotification,
//     Tool,
//   } from "@modelcontextprotocol/sdk/types.js";
//   import { StdErrNotification } from "../../../lib/notificationTypes";
//   import { ExtendedPendingRequest } from "../../../types";
//
//   // Multi-server specific imports
//   import ServerManagementSidebar from "../components/ServerManagementSidebar";
//
//   const CONFIG_LOCAL_STORAGE_KEY = "inspectorConfig_v1";
//
//
//   interface ServerInfo {
//     id: string;
//     name: string;
//     status: 'stopped' | 'running' | 'error' | 'starting' | 'stopping';
//     type: string;
//     host?: string;
//     port?: number;
//     sessionId?: string;
//     activeSessions?: number;
//     config?: {
//       command?: string;
//       args?: string[];
//       transportType?: 'stdio' | 'sse' | 'streamable-http';
//       sseUrl?: string;
//       env?: Record<string, string>;
//     };
//     // Connection state for each server
//     mcpClient?: any;
//     connectionStatus?: 'connected' | 'disconnected' | 'connecting';
//     lastError?: string;
//   }
//
//   // Electron IPC API 타입 정의
//   declare global {
//     interface Window {
//       api: {
//         // 서버 관리
//         getServerStatus: () => Promise<ServerInfo[]>;
//         startServer: (serverId: string) => Promise<{ success: boolean; message?: string }>;
//         stopServer: (serverId: string) => Promise<{ success: boolean; message?: string }>;
//         restartServer: (serverId: string) => Promise<{ success: boolean; message?: string }>;
//         installServer: (name: string, command: string, envVars?: Record<string, string>) => Promise<{ success: boolean; message?: string }>;
//
//         // 멀티 서버 관리
//         startMultipleServers: (serverConfigs: Array<{serverName: string, config: any}>) => Promise<{
//           total: number;
//           succeeded: number;
//           failed: number;
//           results: Array<{serverName: string, status: string, error?: string}>;
//         }>;
//         stopMultipleServers: (serverNames: string[]) => Promise<{
//           total: number;
//           succeeded: number;
//           failed: number;
//           results: Array<{serverName: string, status: string, error?: string}>;
//         }>;
//
//         // MCP 특화 기능
//         getMcpSessionId: (config: any) => Promise<string | null>;
//         connectToMcpServer: (serverName: string, config: any, transportType?: 'stdio' | 'sse' | 'streamable-http') => Promise<{
//           success: boolean;
//           sessionId?: string;
//           error?: string;
//         }>;
//         disconnectFromMcpServer: (sessionId: string) => Promise<boolean>;
//         getActiveSessions: (serverName?: string) => Promise<any[]>;
//
//         // 서버 설정 관리
//         addServerConfig: (serverConfig: {
//           name: string;
//           command: string;
//           args: string[];
//           transportType: 'stdio' | 'sse' | 'streamable-http';
//           env?: Record<string, string>;
//         }) => Promise<{ success: boolean; message?: string }>;
//         updateServerConfig: (serverId: string, config: any) => Promise<{ success: boolean; message?: string }>;
//         removeServerConfig: (serverId: string) => Promise<{ success: boolean; message?: string }>;
//       };
//     }
//   }
//
//   const App = () => {
//     // Multi-server state
//     const [servers, setServers] = useState<ServerInfo[]>([]);
//     const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);
//     const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());
//
//     // Notification for multi-server operations
//     const [notification, setNotification] = useState<{
//       message: string;
//       type: 'success' | 'error' | 'info';
//     } | null>(null);
//
//     // Individual server state (for selected server)
//     const [command, setCommand] = useLocalStorage("lastCommand", "mcp-server-everything");
//     const [args, setArgs] = useLocalStorage("lastArgs", "");
//     const [sseUrl, setSseUrl] = useLocalStorage("lastSseUrl", "http://localhost:3000/mcp/sse");
//     const [transportType, setTransportType] = useLocalStorage<"stdio" | "sse" | "streamable-http">(
//       "lastTransportType",
//       "stdio"
//     );
//     const [bearerToken, setBearerToken] = useLocalStorage("lastBearerToken", "");
//     const [headerName, setHeaderName] = useLocalStorage("lastHeaderName", "");
//
//     // Server-specific state
//     const [notifications, setNotifications] = useState<ServerNotification[]>([]);
//     const [stdErrNotifications, setStdErrNotifications] = useState<StdErrNotification[]>([]);
//     const [roots, setRoots] = useState<Root[]>([]);
//     const [env, setEnv] = useState<Record<string, string>>({});
//     const [pendingSampleRequests, setPendingSampleRequests] = useState<ExtendedPendingRequest[]>([]);
//     const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
//     const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
//     const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
//
//     const [config, setConfig] = useLocalStorage(CONFIG_LOCAL_STORAGE_KEY, DEFAULT_INSPECTOR_CONFIG);
//
//     const nextRequestId = useRef(0);
//     const rootsRef = useRef<Root[]>([]);
//     const progressTokenRef = useRef(0);
//
//     const { height: historyPaneHeight, handleDragStart } = useDraggablePane(300);
//
//     // Electron API helper
//     const ensureApi = () => {
//       if (!window.api) {
//         throw new Error('Electron API not available. Make sure preload script is loaded correctly.');
//       }
//       return window.api;
//     };
//
//     // Connection hook for selected server
//     const {
//       connectionStatus,
//       serverCapabilities,
//       mcpClient,
//       requestHistory,
//       makeRequest,
//       sendNotification,
//       handleCompletion,
//       completionsSupported,
//       connect: connectMcpServer,
//       disconnect: disconnectMcpServer,
//     } = useConnection({
//       transportType: selectedServer?.config?.transportType || transportType,
//       command: selectedServer?.config?.command || command,
//       args: selectedServer?.config?.args?.join(' ') || args,
//       sseUrl: selectedServer?.config?.sseUrl || sseUrl,
//       env: selectedServer?.config?.env || env,
//       bearerToken,
//       headerName,
//       config,
//       onNotification: (notification) => {
//         setNotifications((prev) => [...prev, notification as ServerNotification]);
//       },
//       onStdErrNotification: (notification) => {
//         setStdErrNotifications((prev) => [...prev, notification as StdErrNotification]);
//       },
//       onPendingRequest: (request, resolve, reject) => {
//         setPendingSampleRequests((prev) => [
//           ...prev,
//           { id: nextRequestId.current++, request, resolve, reject },
//         ]);
//       },
//       getRoots: () => rootsRef.current,
//     });
//
//     // API service for selected server
//     const {
//       errors,
//       resources,
//       resourceTemplates,
//       resourceContent,
//       resourceSubscriptions,
//       listResources,
//       listResourceTemplates,
//       readResource,
//       subscribeToResource,
//       unsubscribeFromResource,
//       clearResources,
//       clearResourceTemplates,
//       prompts,
//       promptContent,
//       listPrompts,
//       getPrompt,
//       clearPrompts,
//       tools,
//       toolResult,
//       listTools,
//       callTool,
//       clearTools,
//       ping,
//       setLogLevel,
//     } = useMcpApi(makeRequest, {
//       resources: null,
//       prompts: null,
//       tools: null,
//     });
//
//     // Multi-server management functions
//     const refreshServerStatus = useCallback(async () => {
//       try {
//         const api = ensureApi();
//
//         // Get server list
//         const status = await api.getServerStatus();
//
//         // Get active MCP sessions
//         const activeServers = await api.getActiveSessions();
//
//         // Combine data
//         const updatedServers = status.map((server: any) => {
//           const mcpServerInfo = activeServers?.find(
//             (s: any) => s.serverName === server.name
//           );
//
//           return {
//             ...server,
//             id: server.name,
//             sessionId: mcpServerInfo?.sessionId || null,
//             activeSessions: mcpServerInfo?.sessionCount || 0,
//             connectionStatus: server.status === 'running' ? 'connected' : 'disconnected',
//           };
//         });
//
//         setServers(updatedServers);
//
//         // If no server is selected, select the first running one
//         if (!selectedServer && updatedServers.length > 0) {
//           const runningServer = updatedServers.find(s => s.status === 'running');
//           if (runningServer) {
//             setSelectedServer(runningServer);
//           }
//         }
//       } catch (error) {
//         console.error('Failed to refresh server status:', error);
//         showNotification('서버 상태 새로고침 실패', 'error');
//       }
//     }, [selectedServer]);
//
//     const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
//       setNotification({ message, type });
//       setTimeout(() => setNotification(null), 3000);
//     };
//
//     const startServer = async (serverId: string) => {
//       try {
//         const api = ensureApi();
//         const result = await api.startServer(serverId);
//
//         if (result.success) {
//           showNotification(`서버 ${serverId} 시작됨`, 'success');
//           await refreshServerStatus();
//         } else {
//           showNotification(result.message || `서버 ${serverId} 시작 실패`, 'error');
//         }
//       } catch (error) {
//         console.error('Failed to start server:', error);
//         showNotification(`서버 ${serverId} 시작 실패`, 'error');
//       }
//     };
//
//     const stopServer = async (serverId: string) => {
//       try {
//         const api = ensureApi();
//         const result = await api.stopServer(serverId);
//
//         if (result.success) {
//           showNotification(`서버 ${serverId} 종료됨`, 'success');
//           await refreshServerStatus();
//         } else {
//           showNotification(result.message || `서버 ${serverId} 종료 실패`, 'error');
//         }
//       } catch (error) {
//         console.error('Failed to stop server:', error);
//         showNotification(`서버 ${serverId} 종료 실패`, 'error');
//       }
//     };
//
//     const startMultipleServers = async () => {
//       try {
//         const api = ensureApi();
//         const serverConfigs = Array.from(selectedServers).map(id => {
//           const server = servers.find(s => s.id === id);
//           return {
//             serverName: id,
//             config: server?.config || {}
//           };
//         });
//
//         const result = await api.startMultipleServers(serverConfigs);
//
//         if (result.succeeded > 0) {
//           showNotification(`${result.succeeded}/${result.total} 서버 시작됨`, 'success');
//         } else {
//           showNotification('선택된 서버 시작 실패', 'error');
//         }
//
//         await refreshServerStatus();
//         setSelectedServers(new Set());
//       } catch (error) {
//         console.error('Failed to start multiple servers:', error);
//         showNotification('일괄 시작 실패', 'error');
//       }
//     };
//
//     const stopMultipleServers = async () => {
//       try {
//         const api = ensureApi();
//         const result = await api.stopMultipleServers(Array.from(selectedServers));
//
//         if (result.succeeded > 0) {
//           showNotification(`${result.succeeded}/${result.total} 서버 종료됨`, 'success');
//         } else {
//           showNotification('선택된 서버 종료 실패', 'error');
//         }
//
//         await refreshServerStatus();
//         setSelectedServers(new Set());
//       } catch (error) {
//         console.error('Failed to stop multiple servers:', error);
//         showNotification('일괄 종료 실패', 'error');
//       }
//     };
//
//     const addNewServer = async (serverConfig: {
//       name: string;
//       command: string;
//       args: string[];
//       transportType: 'stdio' | 'sse' | 'streamable-http';
//       env?: Record<string, string>;
//     }) => {
//       try {
//         const api = ensureApi();
//         const result = await api.addServerConfig(serverConfig);
//
//         if (result.success) {
//           showNotification(`서버 ${serverConfig.name} 추가됨`, 'success');
//           await refreshServerStatus();
//         } else {
//           showNotification(result.message || `서버 ${serverConfig.name} 추가 실패`, 'error');
//         }
//       } catch (error) {
//         console.error('Failed to add server:', error);
//         showNotification(`서버 ${serverConfig.name} 추가 실패`, 'error');
//       }
//     };
//
//     const connectToMcpWithSession = async (serverName: string, config: any) => {
//       try {
//         const api = ensureApi();
//         const result = await api.connectToMcpServer(
//           serverName,
//           config,
//           config.transportType || 'stdio'
//         );
//
//         if (result.success && result.sessionId) {
//           console.log(`Connected to ${serverName} with session ${result.sessionId}`);
//           await refreshServerStatus();
//         } else {
//           console.error(`Failed to connect to ${serverName}: ${result.error}`);
//         }
//       } catch (error) {
//         console.error('Failed to connect to MCP server:', error);
//       }
//     };
//
//     // Initialize
//     useEffect(() => {
//       refreshServerStatus();
//
//       // Auto-refresh every 5 seconds
//       const interval = setInterval(refreshServerStatus, 5000);
//       return () => clearInterval(interval);
//     }, [refreshServerStatus]);
//
//     // Server selection handling
//     useEffect(() => {
//       if (selectedServer && selectedServer.status === 'running') {
//         // Connect to the selected server
//         connectMcpServer();
//       } else {
//         // Disconnect if no server is selected or server is not running
//         disconnectMcpServer();
//       }
//     }, [selectedServer, connectMcpServer, disconnectMcpServer]);
//
//     // Keep roots reference updated
//     useEffect(() => {
//       rootsRef.current = roots;
//     }, [roots]);
//
//     // Handler functions remain the same as in the original app...
//     const handleApproveSampling = useCallback((id: number, result: CreateMessageResult) => {
//       setPendingSampleRequests((prev) => {
//         const request = prev.find((r) => r.id === id);
//         request?.resolve(result);
//         return prev.filter((r) => r.id !== id);
//       });
//     }, []);
//
//     const handleRejectSampling = useCallback((id: number) => {
//       setPendingSampleRequests((prev) => {
//         const request = prev.find((r) => r.id === id);
//         request?.reject(new Error("Sampling request rejected"));
//         return prev.filter((r) => r.id !== id);
//       });
//     }, []);
//
//     const handleRootsChange = useCallback(async () => {
//       await sendNotification({ method: "notifications/roots/list_changed" });
//     }, [sendNotification]);
//
//     const handleSetLogLevel = useCallback(async (level: LoggingLevel) => {
//       await setLogLevel(level);
//     }, [setLogLevel]);
//
//     const clearStdErrNotifications = useCallback(() => {
//       setStdErrNotifications([]);
//     }, []);
//
//     // API handler functions (same as original)
//     const handleListResources = useCallback(() => {
//       listResources().catch(console.error);
//     }, [listResources]);
//
//     const handleListResourceTemplates = useCallback(() => {
//       listResourceTemplates().catch(console.error);
//     }, [listResourceTemplates]);
//
//     const handleReadResource = useCallback((uri: string) => {
//       readResource(uri).catch(console.error);
//     }, [readResource]);
//
//     const handleSubscribeToResource = useCallback((uri: string) => {
//       subscribeToResource(uri).catch(console.error);
//     }, [subscribeToResource]);
//
//     const handleUnsubscribeFromResource = useCallback((uri: string) => {
//       unsubscribeFromResource(uri).catch(console.error);
//     }, [unsubscribeFromResource]);
//
//     const handleListPrompts = useCallback(() => {
//       listPrompts().catch(console.error);
//     }, [listPrompts]);
//
//     const handleGetPrompt = useCallback((name: string, args: Record<string, string> = {}) => {
//       getPrompt(name, args).catch(console.error);
//     }, [getPrompt]);
//
//     const handleListTools = useCallback(() => {
//       listTools().catch(console.error);
//     }, [listTools]);
//
//     const handleCallTool = useCallback((name: string, params: Record<string, unknown>) => {
//       callTool(name, params, progressTokenRef.current++).catch(console.error);
//     }, [callTool]);
//
//     const handlePing = useCallback(() => {
//       ping().catch(console.error);
//     }, [ping]);
//
//     // Render the UI
//     return (
//       <div className="flex h-screen bg-background">
//         {/* Server Management Sidebar */}
//         <ServerManagementSidebar
//           servers={servers}
//           selectedServer={selectedServer}
//           selectedServers={selectedServers}
//           setSelectedServer={setSelectedServer}
//           setSelectedServers={setSelectedServers}
//           startServer={startServer}
//           stopServer={stopServer}
//           startMultiple={startMultipleServers}
//           stopMultiple={stopMultipleServers}
//           refreshStatus={refreshServerStatus}
//           addNewServer={addNewServer}
//         />
//
//         {/* Main Content */}
//         <div className="flex-1 flex flex-col overflow-hidden">
//           {/* Notification Bar */}
//           {notification && (
//             <div className={`p-4 text-center ${
//               notification.type === 'success' ? 'bg-green-500' :
//               notification.type === 'error' ? 'bg-red-500' :
//               'bg-blue-500'
//             } text-white`}>
//               {notification.message}
//             </div>
//           )}
//
//           <div className="flex-1 overflow-auto">
//             {selectedServer && mcpClient ? (
//               <TabsContainer
//                 serverCapabilities={serverCapabilities}
//                 pendingRequestsCount={pendingSampleRequests.length}
//               >
//                 <ResourcesTab
//                   resources={resources}
//                   resourceTemplates={resourceTemplates}
//                   listResources={handleListResources}
//                   clearResources={clearResources}
//                   listResourceTemplates={handleListResourceTemplates}
//                   clearResourceTemplates={clearResourceTemplates}
//                   readResource={handleReadResource}
//                   selectedResource={selectedResource}
//                   setSelectedResource={setSelectedResource}
//                   resourceSubscriptionsSupported={
//                     serverCapabilities?.resources?.subscribe || false
//                   }
//                   resourceSubscriptions={resourceSubscriptions}
//                   subscribeToResource={handleSubscribeToResource}
//                   unsubscribeFromResource={handleUnsubscribeFromResource}
//                   handleCompletion={handleCompletion}
//                   completionsSupported={completionsSupported}
//                   resourceContent={resourceContent}
//                   nextCursor={undefined}
//                   nextTemplateCursor={undefined}
//                   error={errors.resources}
//                 />
//                 <PromptsTab
//                   prompts={prompts}
//                   listPrompts={handleListPrompts}
//                   clearPrompts={clearPrompts}
//                   getPrompt={handleGetPrompt}
//                   selectedPrompt={selectedPrompt}
//                   setSelectedPrompt={setSelectedPrompt}
//                   handleCompletion={handleCompletion}
//                   completionsSupported={completionsSupported}
//                   promptContent={promptContent}
//                   nextCursor={undefined}
//                   error={errors.prompts}
//                 />
//                 <ToolsTab
//                   tools={tools}
//                   listTools={handleListTools}
//                   clearTools={clearTools}
//                   callTool={handleCallTool}
//                   selectedTool={selectedTool}
//                   setSelectedTool={setSelectedTool}
//                   toolResult={toolResult}
//                   nextCursor={undefined}
//                   error={errors.tools}
//                 />
//                 <ConsoleTab />
//                 <PingTab onPingClick={handlePing} />
//                 <SamplingTab
//                   pendingRequests={pendingSampleRequests}
//                   onApprove={handleApproveSampling}
//                   onReject={handleRejectSampling}
//                 />
//                 <RootsTab
//                   roots={roots}
//                   setRoots={setRoots}
//                   onRootsChange={handleRootsChange}
//                 />
//               </TabsContainer>
//             ) : (
//               <div className="flex items-center justify-center h-full">
//                 <div className="text-center">
//                   <p className="text-lg text-gray-500 mb-4">
//                     {servers.length === 0 ?
//                       '연결할 MCP 서버가 없습니다.' :
//                       selectedServer ?
//                         `서버 "${selectedServer.name}"가 실행 중이 아닙니다.` :
//                         'MCP 서버를 선택하여 인스펙터를 시작하세요.'
//                     }
//                   </p>
//                   {selectedServer && selectedServer.status !== 'running' && (
//                     <button
//                       onClick={() => startServer(selectedServer.id)}
//                       className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//                     >
//                       서버 시작
//                     </button>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//
//           {/* History Pane */}
//           <div
//             className="relative border-t border-border"
//             style={{
//               height: `${historyPaneHeight}px`,
//             }}
//           >
//             <div
//               className="absolute w-full h-4 -top-2 cursor-row-resize flex items-center justify-center hover:bg-accent/50"
//               onMouseDown={handleDragStart}
//             >
//               <div className="w-8 h-1 rounded-full bg-border" />
//             </div>
//             <div className="h-full overflow-auto">
//               <HistoryAndNotifications
//                 requestHistory={requestHistory}
//                 serverNotifications={notifications}
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };
//
//   export default App;
