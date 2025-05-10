// // src/renderer/App.tsx 또는 적절한 컴포넌트 파일

// import React, { useState, useEffect, useCallback } from 'react';
// import { useLocalStorage } from './hooks/useLocalStorage'; // 필요에 따라 구현
// import { ClaudeDesktopIntegration } from '../common/integration/ClaudeDesktopIntegration';

// const MCPClientApp = () => {
//   // 서버 상태 관리
//   const [serverStatus, setServerStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
//   // 연결된 서버 정보
//   const [connectedServer, setConnectedServer] = useState<{
//     name: string;
//     host: string;
//     port: number;
//   } | null>(null);
  
//   // Claude Desktop 연결 상태
//   const [isClaudeConnected, setIsClaudeConnected] = useState(false);
  
//   // 서버 목록 (실제 구현에서는 API로 가져오거나 상태 관리 라이브러리 사용)
//   const [serverList, setServerList] = useState<Array<{
//     id: string;
//     name: string;
//     status: string;
//     type: string;
//   }>>([]);
  
//   // 서버 상태 새로고침
//   const refreshServerStatus = useCallback(async () => {
//     try {
//       // Electron IPC 또는 API 호출을 통해 서버 상태 가져오기
//       const servers = await window.electron.invoke('server:getStatus');
//       setServerList(servers);
      
//       // 현재 연결된 서버 확인
//       const activeServer = servers.find(server => server.status === 'running');
//       if (activeServer) {
//         setServerStatus('connected');
//         setConnectedServer({
//           name: activeServer.name,
//           host: 'localhost',  // 실제로는 서버 설정에서 가져와야 함
//           port: 4303  // 실제로는 서버 설정에서 가져와야 함
//         });
        
//         // Claude Desktop 연결 상태 확인
//         const isConnected = await window.electron.invoke('server:isConnectedToClaudeDesktop', activeServer.name);
//         setIsClaudeConnected(isConnected);
//       } else {
//         setServerStatus('disconnected');
//         setConnectedServer(null);
//         setIsClaudeConnected(false);
//       }
//     } catch (error) {
//       console.error('서버 상태 가져오기 실패:', error);
//       setServerStatus('disconnected');
//     }
//   }, []);
  
//   // 컴포넌트 마운트 시 서버 상태 확인
//   useEffect(() => {
//     refreshServerStatus();
    
//     // 주기적으로 상태 갱신 (선택적)
//     const interval = setInterval(refreshServerStatus, 5000);
//     return () => clearInterval(interval);
//   }, [refreshServerStatus]);
  
//   // Claude Desktop 연결 토글
//   const toggleClaudeDesktopConnection = async () => {
//     if (!connectedServer) return;
    
//     try {
//       if (isClaudeConnected) {
//         // 연결 해제
//         await window.electron.invoke('server:disconnectFromClaudeDesktop', connectedServer.name);
//         setIsClaudeConnected(false);
//       } else {
//         // 연결
//         await window.electron.invoke('server:connectToClaudeDesktop', connectedServer.name);
//         setIsClaudeConnected(true);
//       }
//     } catch (error) {
//       console.error('Claude Desktop 연결 변경 실패:', error);
//     }
//   };
  
//   return (
//     <div className="app-container">
//       <header className="app-header">
//         <h1>MCP 서버 클라이언트</h1>
//         <div className="server-status">
//           상태: {serverStatus === 'connected' ? 
//             <span className="status-connected">연결됨 ({connectedServer?.name})</span> : 
//             <span className="status-disconnected">연결 안됨</span>
//           }
//         </div>
//       </header>
      
//       <main className="app-content">
//         {serverStatus === 'connected' ? (
//           <div className="connected-view">
//             <div className="server-info-card">
//               <h2>{connectedServer?.name}</h2>
//               <p>호스트: {connectedServer?.host}</p>
//               <p>포트: {connectedServer?.port}</p>
              
//               <div className="action-buttons">
//                 <button
//                   className={`claude-button ${isClaudeConnected ? 'connected' : ''}`}
//                   onClick={toggleClaudeDesktopConnection}
//                 >
//                   {isClaudeConnected ? 'Claude Desktop 연결 해제' : 'Claude Desktop에 연결'}
//                 </button>
                
//                 {/* 다른 작업 버튼들 */}
//                 <button className="inspect-button" onClick={() => window.open(`http://${connectedServer?.host}:${connectedServer?.port}/inspector`)}>
//                   Inspector 열기
//                 </button>
//               </div>
//             </div>
            
//             {/* 서버 기능 UI 컴포넌트들 */}
//             <div className="server-features">
//               {/* 예: 도구 목록, 리소스 탐색기 등 */}
//             </div>
//           </div>
//         ) : (
//           <div className="disconnected-view">
//             <p>MCP 서버가 실행 중이 아닙니다.</p>
//             <button onClick={refreshServerStatus}>상태 새로고침</button>
//           </div>
//         )}
//       </main>
      
//       {/* 서버 목록 사이드바 또는 다이얼로그 */}
//       <aside className="server-list">
//         <h3>사용 가능한 서버</h3>
//         <ul>
//           {serverList.map(server => (
//             <li key={server.id} className={`server-item ${server.status === 'running' ? 'active' : ''}`}>
//               <span className="server-name">{server.name}</span>
//               <span className={`server-status-badge ${server.status}`}>{server.status}</span>
//             </li>
//           ))}
//         </ul>
//       </aside>
//     </div>
//   );
// };

// export default MCPClientApp;