// // 새 채팅 세션 시작 (Sidebar에서)
// const startNewChatWithMCP = async () => {
//     // 1. Room 생성
//     const roomPromise = new Promise<string>((resolve) => {
//       setPendingRoomCreation({
//         resolve,
//         beforeIds: Object.keys(store.room.rooms)
//       });
//     });
    
//     dispatch({ type: 'room.createRoom', payload: 'AI Chat with Tools' });
//     const roomId = await roomPromise;
    
//     // 2. Session 생성
//     const sessionPromise = new Promise<string>((resolve) => {
//       setPendingSessionCreation({
//         resolve,
//         beforeIds: Object.keys(store.session.sessions)
//       });
//     });
    
//     dispatch({ type: 'session.createSession', payload: roomId });
//     const sessionId = await sessionPromise;
    
//     // 3. Room에 Session 추가
//     dispatch({
//       type: 'room.addSessionToRoom',
//       payload: { roomId, sessionId }
//     });
    
//     // 4. ChatStore 초기화
//     dispatch({
//       type: 'chat.initializeSession',
//       payload: {
//         sessionId,
//         config: {
//           model: 'openai/gpt-4',
//           temperature: 0.7
//         }
//       }
//     });
    
//     // 5. MCP 서버 연결 (선택적)
//     const weatherServerId = 'weather-mcp-server';
//     await dispatch({
//       type: 'aiMcpCoordinator.createSessionBinding',
//       payload: { sessionId, serverId: weatherServerId }
//     });
    
//     // 6. 페이지 이동
//     navigate(`/chat/${sessionId}`);
//   };
  
//   // 채팅 페이지에서 MCP 연결 관리
//   const ChatPageMCPControls = ({ sessionId }: { sessionId: string }) => {
//     const store = useStore();
//     const dispatch = useDispatch();
    
//     // 현재 연결된 MCP 서버들
//     const bindings = store.aiMcpCoordinator?.sessionBindings[sessionId] || [];
//     const availableServers = Object.values(store.mcp_registry.servers);
    
//     const connectServer = async (serverId: string) => {
//       await dispatch({
//         type: 'aiMcpCoordinator.createSessionBinding',
//         payload: { sessionId, serverId }
//       });
//     };
    
//     const disconnectBinding = async (bindingId: string) => {
//       await dispatch({
//         type: 'aiMcpCoordinator.removeSessionBinding',
//         payload: { sessionId, bindingId }
//       });
//     };
    
//     return (
//       <div className="p-4 border-b">
//         <h3 className="text-sm font-semibold mb-2">MCP Servers</h3>
        
//         {/* 연결된 서버들 */}
//         <div className="flex gap-2 mb-2">
//           {bindings.map(binding => (
//             <Badge
//               key={binding.id}
//               variant="secondary"
//               className="cursor-pointer"
//               onClick={() => disconnectBinding(binding.id)}
//             >
//               {binding.serverId}
//               <X className="w-3 h-3 ml-1" />
//             </Badge>
//           ))}
//         </div>
        
//         {/* 연결 가능한 서버들 */}
//         <Select onValueChange={connectServer}>
//           <SelectTrigger className="w-full">
//             <SelectValue placeholder="Connect MCP Server..." />
//           </SelectTrigger>
//           <SelectContent>
//             {availableServers
//               .filter(server => !bindings.some(b => b.serverId === server.id))
//               .map(server => (
//                 <SelectItem key={server.id} value={server.id}>
//                   <div>
//                     <div className="font-medium">{server.name}</div>
//                     <div className="text-xs text-muted-foreground">
//                       {server.description}
//                     </div>
//                   </div>
//                 </SelectItem>
//               ))}
//           </SelectContent>
//         </Select>
//       </div>
//     );
//   };