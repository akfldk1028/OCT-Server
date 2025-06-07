import React, { useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { InstalledServer } from '../../types/server-types';

interface ServerNodeProps {
  data: InstalledServer;
  id: string;
  selected?: boolean;
}

export default function ServerNode({ data, id, selected }: ServerNodeProps) {
  // 디버깅용 로그 추가
  useEffect(() => {
    console.log('ServerNode 렌더링 데이터:', data);
    console.log(
      'ServerNode 데이터 타입:',
      Object.prototype.toString.call(data),
    );

    // 데이터 구조 검증
    if (!data) {
      console.error('ServerNode: 데이터가 없습니다!');
          } else {
        console.log('ServerNode: 데이터를 받았습니다.', {
          id: data.id || data.original_server_id,
          serverName: data.mcp_servers?.name,
          hasInstallMethod: !!data.mcp_install_methods,
        });
      }
  }, [data]);

  // 데이터가 없는 경우 기본 노드 표시
  if (!data) {
    return (
      <div className="p-4 bg-card border border-red-500 rounded-lg flex flex-col items-center max-w-[220px]">
        <Handle
          type="target"
          position={Position.Top}
          className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
        />
        <div className="text-red-500 font-bold">잘못된 서버 데이터</div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
        />
      </div>
    );
  }

  // InstalledServer 구조에 맞춰 데이터 추출
  const serverInfo = data?.mcp_servers;
  const installMethod = data?.mcp_install_methods;
  
  // 가능한 모든 경로에서 name 추출
  const name = 
    serverInfo?.name || 
    (installMethod?.command || 'Unknown Command') ||
    String(data?.original_server_id) ||
    'Unknown Server';
    
  const description = 
    serverInfo?.description || 
    installMethod?.description ||
    'No description available';
    
  const avatarUrl =
    (serverInfo?.github_info && typeof serverInfo.github_info === 'object' 
      ? (serverInfo.github_info as any)?.ownerAvatarUrl 
      : null) || 
    'https://github.com/github.png';

  return (
    <div
      className={`relative p-4 bg-card border ${selected ? 'border-primary shadow-md ring-2 ring-primary/30' : 'border-border shadow'} rounded-lg flex flex-col items-center max-w-[220px] transition-shadow duration-200`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
      />
      <img
        src={avatarUrl}
        alt={name}
        className="w-14 h-14 rounded-full object-contain mb-3 bg-muted p-1"
      />
      <div className="text-card-foreground font-bold text-base text-center mb-1">
        {name}
      </div>
      {description && (
        <div
          className="text-xs text-muted-foreground text-center line-clamp-2 max-w-full px-2"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </div>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        ID: {data?.id ? `${String(data.id).substring(0, 8)}...` : 'New Server'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          position: 'absolute',
          bottom: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}
