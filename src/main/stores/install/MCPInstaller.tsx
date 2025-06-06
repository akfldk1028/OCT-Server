// // renderer/components/MCPInstaller.tsx
// import React, { useEffect, useState } from 'react';
// import { useBridgeStore } from '@zubridge/react';

// export function MCPInstaller({ serverName, config }: { serverName: string; config: any }) {
//   const installerState = useBridgeStore('installer');
//   const [isInstalling, setIsInstalling] = useState(false);
  
//   const progress = installerState.installProgress[serverName];
  
//   const handleInstall = async () => {
//     setIsInstalling(true);
    
//     try {
//       const result = await window.electron.ipcRenderer.invoke('mcp:install', {
//         serverName,
//         config,
//         preferredMethod: 'npx', // 선호하는 방법 지정 가능
//       });
      
//       if (result.success) {
//         console.log('설치 완료!');
//       } else {
//         console.error('설치 실패:', result.error);
//       }
//     } finally {
//       setIsInstalling(false);
//     }
//   };
  
//   if (progress) {
//     return (
//       <div className="install-progress">
//         <h3>{progress.status}</h3>
//         <div className="progress-bar">
//           <div 
//             className="progress-fill" 
//             style={{ width: `${progress.percent}%` }}
//           />
//         </div>
//         <p>{progress.currentStep}</p>
//         {progress.percent < 100 && (
//           <button onClick={() => window.electron.ipcRenderer.invoke('mcp:cancelInstall', serverName)}>
//             취소
//           </button>
//         )}
//       </div>
//     );
//   }
  
//   return (
//     <div className="install-button-container">
//       <button 
//         onClick={handleInstall} 
//         disabled={isInstalling}
//       >
//         {isInstalling ? '설치 중...' : 'MCP 서버 설치'}
//       </button>
//     </div>
//   );
// } = async () => {
//     setIsInstalling(true);
    
//     try {
//       const result = await window.electron.ipcRenderer.invoke('mcp:install', {
//         serverName,
//         preferredMethod: 'npx', // 선호하는 방법 지정 가능
//       });
      
//       if (result.success) {
//         console.log('설치 완료!');
//       } else {
//         console.error('설치 실패:', result.error);
//       }
//     } finally {
//       setIsInstalling(false);
//     }
//   };
  
//   if (progress) {
//     return (
//       <div className="install-progress">
//         <h3>{progress.status}</h3>
//         <div className="progress-bar">
//           <div 
//             className="progress-fill" 
//             style={{ width: `${progress.percent}%` }}
//           />
//         </div>
//         <p>{progress.currentStep}</p>
//         {progress.percent < 100 && (
//           <button onClick={() => window.electron.ipcRenderer.invoke('mcp:cancelInstall', serverName)}>
//             취소
//           </button>
//         )}
//       </div>
//     );
//   }
  
//   return (
//     <div className="install-button-container">
//       <button 
//         onClick={handleInstall} 
//         disabled={isInstalling}
//       >
//         {isInstalling ? '설치 중...' : 'MCP 서버 설치'}
//       </button>
//     </div>
//   );
// }

// // 설치된 서버 목록 컴포넌트
// export function InstalledServersList() {
//   const installerState = useBridgeStore('installer');
//   const installedServers = Object.entries(installerState.installedServers);
  
//   if (installedServers.length === 0) {
//     return <div>설치된 서버가 없습니다.</div>;
//   }
  
//   return (
//     <div className="installed-servers">
//       <h2>설치된 MCP 서버</h2>
//       {installedServers.map(([name, info]) => (
//         <div key={name} className="server-item">
//           <h3>{name}</h3>
//           <p>설치 방법: {info.installMethod}</p>
//           <p>설치 경로: {info.installedPath}</p>
//           <p>설치 시간: {new Date(info.installedAt).toLocaleString()}</p>
//         </div>
//       ))}
//     </div>
//   );
// }

// // 설치 큐 관리 컴포넌트
// export function InstallQueue() {
//   const installerState = useBridgeStore('installer');
//   const { installQueue, currentInstalling } = installerState;
  
//   const handleProcessQueue = async () => {
//     await window.electron.ipcRenderer.invoke('mcp:processQueue');
//   };
  
//   if (installQueue.length === 0 && !currentInstalling) {
//     return null;
//   }
  
//   return (
//     <div className="install-queue">
//       <h3>설치 대기열</h3>
//       {currentInstalling && (
//         <div className="current-installing">
//           <strong>현재 설치 중:</strong> {currentInstalling}
//         </div>
//       )}
//       {installQueue.length > 0 && (
//         <>
//           <ul>
//             {installQueue.map((item, index) => (
//               <li key={item.serverName}>
//                 {index + 1}. {item.serverName} (우선순위: {item.priority})
//               </li>
//             ))}
//           </ul>
//           <button onClick={handleProcessQueue}>
//             큐 처리 시작
//           </button>
//         </>
//       )}
//     </div>
//   );
// }


// 🎯 사용자가 설치 버튼을 누르면 일어나는 일

// 1️⃣ React 컴포넌트 (사용자가 보는 UI)
// renderer/components/ServerCard.tsx
// import React, { useState } from 'react';

// interface ServerCardProps {
//   serverId: string;
//   serverName: string;
//   description: string;
//   installMethods: Array<{
//     id: number;
//     command: string;
//     description: string;
//   }>;
// }

// export function ServerCard({ serverId, serverName, description, installMethods }: ServerCardProps) {
//   const [isInstalling, setIsInstalling] = useState(false);
//   const [selectedMethod, setSelectedMethod] = useState(installMethods[0]?.command || 'npm');
  
//   const handleInstall = async () => {
//     setIsInstalling(true);
    
//     try {
//       // IPC로 main 프로세스에 설치 요청
//       const result = await window.electron.ipcRenderer.invoke('installServer', 
//         serverId,  // 서버 ID
//         selectedMethod,  // 설치 방법 (npm, docker, etc.)
//         {}  // 환경 변수 (필요시)
//       );
      
//       if (result.success) {
//         alert(`${serverName} 설치 완료!`);
//       } else {
//         alert(`설치 실패: ${result.error}`);
//       }
//     } catch (error) {
//       console.error('설치 중 오류:', error);
//       alert('설치 중 오류가 발생했습니다.');
//     } finally {
//       setIsInstalling(false);
//     }
//   };
  
//   return (
//     <div className="server-card">
//       <h3>{serverName}</h3>
//       <p>{description}</p>
      
//       {/* 설치 방법 선택 */}
//       <select 
//         value={selectedMethod} 
//         onChange={(e) => setSelectedMethod(e.target.value)}
//         disabled={isInstalling}
//       >
//         {installMethods.map(method => (
//           <option key={method.id} value={method.command}>
//             {method.description || method.command}
//           </option>
//         ))}
//       </select>
      
//       {/* 설치 버튼 */}
//       <button 
//         onClick={handleInstall}
//         disabled={isInstalling}
//       >
//         {isInstalling ? '설치 중...' : '설치'}
//       </button>
//     </div>
//   );
// }
