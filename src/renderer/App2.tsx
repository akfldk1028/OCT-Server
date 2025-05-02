// import {
//   CreateMessageResult,
//   LoggingLevel,
//   Resource,
//   Root,
//   ServerNotification,
//   Tool,
// } from "@modelcontextprotocol/sdk/types.js";
// import React, {
//   useCallback,
//   useEffect,
//   useRef,
//   useState,
// } from "react";
// import { useConnection } from "./lib/hooks/useConnection";
// import { useDraggablePane } from "./lib/hooks/useDraggablePane";
// import { StdErrNotification } from "./lib/notificationTypes";
//
// // Import components
// import "./App.css";
// import ConsoleTab from "./common/components/ConsoleTab";
// import HistoryAndNotifications from "./common/components/History";
// import PingTab from "./common/components/PingTab";
// import PromptsTab, { Prompt } from "./common/components/PromptsTab";
// import ResourcesTab from "./common/components/ResourcesTab";
// import RootsTab from "./common/components/RootsTab";
// import SamplingTab from "./common/components/SamplingTab";
// import Sidebar from "./common/components/Sidebar";
// import ToolsTab from "./common/components/ToolsTab";
// import { DEFAULT_INSPECTOR_CONFIG } from "./lib/constants";
// import { getMCPProxyAddress } from "./utils/configUtils";
//
// // Import refactored modules
// import useLocalStorage from "./lib/hooks/useLocalStorage";
// import { useMcpApi } from "./lib/hooks/useMcpApi";
// import { ExtendedPendingRequest } from "./types";
// import TabsContainer from "./common/components/inspector/TabsContainer";
//
// const CONFIG_LOCAL_STORAGE_KEY = "inspectorConfig_v1";
//
// const App = () => {
//   // Use useLocalStorage hook for persistent settings
//   const [command, setCommand] = useLocalStorage("lastCommand", "mcp-server-everything");
//   const [args, setArgs] = useLocalStorage("lastArgs", "");
//   const [sseUrl, setSseUrl] = useLocalStorage("lastSseUrl", "http://localhost:3000/mcp/sse");
//   const [transportType, setTransportType] = useLocalStorage<"stdio" | "sse" | "streamable-http">(
//     "lastTransportType",
//     "stdio"
//   );
//   const [bearerToken, setBearerToken] = useLocalStorage("lastBearerToken", "");
//   const [headerName, setHeaderName] = useLocalStorage("lastHeaderName", "");
//
//   // App-level state
//   const [notifications, setNotifications] = useState<ServerNotification[]>([]);
//   const [stdErrNotifications, setStdErrNotifications] = useState<StdErrNotification[]>([]);
//   const [roots, setRoots] = useState<Root[]>([]);
//   const [env, setEnv] = useState<Record<string, string>>({});
//   const [pendingSampleRequests, setPendingSampleRequests] = useState<ExtendedPendingRequest[]>([]);
//   const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
//   const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
//   const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
//
//   // Use useLocalStorage for config with proper type handling
//   const [config, setConfig] = useLocalStorage(
//     CONFIG_LOCAL_STORAGE_KEY,
//     DEFAULT_INSPECTOR_CONFIG
//   );
//
//   const nextRequestId = useRef(0);
//   const rootsRef = useRef<Root[]>([]);
//   const progressTokenRef = useRef(0);
//
//   const { height: historyPaneHeight, handleDragStart } = useDraggablePane(300);
//
//   // Set up the connection
//   const {
//     connectionStatus,
//     serverCapabilities,
//     mcpClient,
//     requestHistory,
//     makeRequest,
//     sendNotification,
//     handleCompletion,
//     completionsSupported,
//     connect: connectMcpServer,
//     disconnect: disconnectMcpServer,
//   } = useConnection({
//     transportType,
//     command,
//     args,
//     sseUrl,
//     env,
//     bearerToken,
//     headerName,
//     config,
//     onNotification: (notification) => {
//       setNotifications((prev) => [...prev, notification as ServerNotification]);
//     },
//     onStdErrNotification: (notification) => {
//       setStdErrNotifications((prev) => [
//         ...prev,
//         notification as StdErrNotification,
//       ]);
//     },
//     onPendingRequest: (request, resolve, reject) => {
//       setPendingSampleRequests((prev) => [
//         ...prev,
//         { id: nextRequestId.current++, request, resolve, reject },
//       ]);
//     },
//     getRoots: () => rootsRef.current,
//   });
//
//   // Initialize the API service
//   const {
//     // API error states
//     errors,
//
//     // Resources related
//     resources,
//     resourceTemplates,
//     resourceContent,
//     resourceSubscriptions,
//     listResources,
//     listResourceTemplates,
//     readResource,
//     subscribeToResource,
//     unsubscribeFromResource,
//     clearResources,
//     clearResourceTemplates,
//
//     // Prompts related
//     prompts,
//     promptContent,
//     listPrompts,
//     getPrompt,
//     clearPrompts,
//
//     // Tools related
//     tools,
//     toolResult,
//     listTools,
//     callTool,
//     clearTools,
//
//     // Other API methods
//     ping,
//     setLogLevel,
//   } = useMcpApi(makeRequest, {
//     resources: null,
//     prompts: null,
//     tools: null,
//   });
//
//   // Auto-connect to previously saved serverURL after OAuth callback
//   const onOAuthConnect = useCallback(
//     (serverUrl: string) => {
//       setSseUrl(serverUrl);
//       setTransportType("sse");
//       void connectMcpServer();
//     },
//     [connectMcpServer, setSseUrl, setTransportType],
//   );
//
//   // Fetch default environment configuration
//   useEffect(() => {
//     fetch(`${getMCPProxyAddress(config)}/config`)
//       .then((response) => response.json())
//       .then((data) => {
//         setEnv(data.defaultEnvironment);
//         if (data.defaultCommand) {
//           setCommand(data.defaultCommand);
//         }
//         if (data.defaultArgs) {
//           setArgs(data.defaultArgs);
//         }
//       })
//       .catch((error) =>
//         console.error("Error fetching default environment:", error),
//       );
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);
//
//   // Keep roots reference updated
//   useEffect(() => {
//     rootsRef.current = roots;
//   }, [roots]);
//
//   // Set default hash if none exists
//   useEffect(() => {
//     if (!window.location.hash) {
//       window.location.hash = "resources";
//     }
//   }, []);
//
//   // Handler functions
//   const handleApproveSampling = useCallback((id: number, result: CreateMessageResult) => {
//     setPendingSampleRequests((prev) => {
//       const request = prev.find((r) => r.id === id);
//       request?.resolve(result);
//       return prev.filter((r) => r.id !== id);
//     });
//   }, []);
//
//   const handleRejectSampling = useCallback((id: number) => {
//     setPendingSampleRequests((prev) => {
//       const request = prev.find((r) => r.id === id);
//       request?.reject(new Error("Sampling request rejected"));
//       return prev.filter((r) => r.id !== id);
//     });
//   }, []);
//
//   const handleRootsChange = useCallback(async () => {
//     await sendNotification({ method: "notifications/roots/list_changed" });
//   }, [sendNotification]);
//
//   const handleSetLogLevel = useCallback(async (level: LoggingLevel) => {
//     await setLogLevel(level);
//   }, [setLogLevel]);
//
//   const clearStdErrNotifications = useCallback(() => {
//     setStdErrNotifications([]);
//   }, []);
//
//   // API handler functions
//   const handleListResources = useCallback(() => {
//     listResources().catch(console.error);
//   }, [listResources]);
//
//   const handleListResourceTemplates = useCallback(() => {
//     listResourceTemplates().catch(console.error);
//   }, [listResourceTemplates]);
//
//   const handleReadResource = useCallback((uri: string) => {
//     readResource(uri).catch(console.error);
//   }, [readResource]);
//
//   const handleSubscribeToResource = useCallback((uri: string) => {
//     subscribeToResource(uri).catch(console.error);
//   }, [subscribeToResource]);
//
//   const handleUnsubscribeFromResource = useCallback((uri: string) => {
//     unsubscribeFromResource(uri).catch(console.error);
//   }, [unsubscribeFromResource]);
//
//   const handleListPrompts = useCallback(() => {
//     listPrompts().catch(console.error);
//   }, [listPrompts]);
//
//   const handleGetPrompt = useCallback((name: string, args: Record<string, string> = {}) => {
//     getPrompt(name, args).catch(console.error);
//   }, [getPrompt]);
//
//   const handleListTools = useCallback(() => {
//     listTools().catch(console.error);
//   }, [listTools]);
//
//   const handleCallTool = useCallback((name: string, params: Record<string, unknown>) => {
//     callTool(name, params, progressTokenRef.current++).catch(console.error);
//   }, [callTool]);
//
//   const handlePing = useCallback(() => {
//     ping().catch(console.error);
//   }, [ping]);
//
//   // Render the UI
//   return (
//     <div className="flex h-screen bg-background">
//       <Sidebar
//         connectionStatus={connectionStatus}
//         transportType={transportType}
//         setTransportType={setTransportType}
//         command={command}
//         setCommand={setCommand}
//         args={args}
//         setArgs={setArgs}
//         sseUrl={sseUrl}
//         setSseUrl={setSseUrl}
//         env={env}
//         setEnv={setEnv}
//         config={config}
//         setConfig={setConfig}
//         bearerToken={bearerToken}
//         setBearerToken={setBearerToken}
//         headerName={headerName}
//         setHeaderName={setHeaderName}
//         onConnect={connectMcpServer}
//         onDisconnect={disconnectMcpServer}
//         stdErrNotifications={stdErrNotifications}
//         logLevel={serverCapabilities?.logging?.level || "debug"}
//         sendLogLevelRequest={handleSetLogLevel}
//         loggingSupported={!!serverCapabilities?.logging || false}
//         clearStdErrNotifications={clearStdErrNotifications}
//       />
//       <div className="flex-1 flex flex-col overflow-hidden">
//         <div className="flex-1 overflow-auto">
//           {mcpClient ? (
//             <TabsContainer
//               serverCapabilities={serverCapabilities}
//               pendingRequestsCount={pendingSampleRequests.length}
//             >
//               <ResourcesTab
//                 resources={resources}
//                 resourceTemplates={resourceTemplates}
//                 listResources={handleListResources}
//                 clearResources={clearResources}
//                 listResourceTemplates={handleListResourceTemplates}
//                 clearResourceTemplates={clearResourceTemplates}
//                 readResource={handleReadResource}
//                 selectedResource={selectedResource}
//                 setSelectedResource={setSelectedResource}
//                 resourceSubscriptionsSupported={
//                   serverCapabilities?.resources?.subscribe || false
//                 }
//                 resourceSubscriptions={resourceSubscriptions}
//                 subscribeToResource={handleSubscribeToResource}
//                 unsubscribeFromResource={handleUnsubscribeFromResource}
//                 handleCompletion={handleCompletion}
//                 completionsSupported={completionsSupported}
//                 resourceContent={resourceContent}
//                 nextCursor={undefined} // API 서비스에서 관리하므로 props 전달 불필요
//                 nextTemplateCursor={undefined} // API 서비스에서 관리하므로 props 전달 불필요
//                 error={errors.resources}
//               />
//               <PromptsTab
//                 prompts={prompts}
//                 listPrompts={handleListPrompts}
//                 clearPrompts={clearPrompts}
//                 getPrompt={handleGetPrompt}
//                 selectedPrompt={selectedPrompt}
//                 setSelectedPrompt={(prompt) => {
//                   setSelectedPrompt(prompt);
//                 }}
//                 handleCompletion={handleCompletion}
//                 completionsSupported={completionsSupported}
//                 promptContent={promptContent}
//                 nextCursor={undefined} // API 서비스에서 관리하므로 props 전달 불필요
//                 error={errors.prompts}
//               />
//               <ToolsTab
//                 tools={tools}
//                 listTools={handleListTools}
//                 clearTools={clearTools}
//                 callTool={handleCallTool}
//                 selectedTool={selectedTool}
//                 setSelectedTool={setSelectedTool}
//                 toolResult={toolResult}
//                 nextCursor={undefined} // API 서비스에서 관리하므로 props 전달 불필요
//                 error={errors.tools}
//               />
//               <ConsoleTab />
//               <PingTab onPingClick={handlePing} />
//               <SamplingTab
//                 pendingRequests={pendingSampleRequests}
//                 onApprove={handleApproveSampling}
//                 onReject={handleRejectSampling}
//               />
//               <RootsTab
//                 roots={roots}
//                 setRoots={setRoots}
//                 onRootsChange={handleRootsChange}
//               />
//             </TabsContainer>
//           ) : (
//             <div className="flex items-center justify-center h-full">
//               <p className="text-lg text-gray-500">
//                 Connect to an MCP server to start inspecting
//               </p>
//             </div>
//           )}
//         </div>
//         <div
//           className="relative border-t border-border"
//           style={{
//             height: `${historyPaneHeight}px`,
//           }}
//         >
//           <div
//             className="absolute w-full h-4 -top-2 cursor-row-resize flex items-center justify-center hover:bg-accent/50"
//             onMouseDown={handleDragStart}
//           >
//             <div className="w-8 h-1 rounded-full bg-border" />
//           </div>
//           <div className="h-full overflow-auto">
//             <HistoryAndNotifications
//               requestHistory={requestHistory}
//               serverNotifications={notifications}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
//
// export default App;
