import React, { useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ServerItem } from '../../../../types';

interface ServerNodeProps {
  data: ServerItem;
  id: string;
  selected?: boolean;
}

export default function ServerNode({ data, id, selected }: ServerNodeProps) {
  // 디버깅용 로그 추가
  useEffect(() => {
    console.log('ServerNode 렌더링 데이터:', data);
    console.log('ServerNode 데이터 타입:', Object.prototype.toString.call(data));
    
    // 데이터 구조 검증
    if (!data) {
      console.error('ServerNode: 데이터가 없습니다!');
    } else if (!data.config) {
      console.error('ServerNode: config 객체가 없습니다!', data);
    } else {
      console.log('ServerNode: 유효한 데이터를 받았습니다.', {
        id: data.id,
        name: data.name,
        configName: data.config?.name,
        hasGithubInfo: !!data.config?.github_info
      });
    }
  }, [data]);

  // 데이터가 없는 경우 기본 노드 표시
  if (!data) {
    return (
      <div className="p-4 bg-card border border-red-500 rounded-lg flex flex-col items-center max-w-[220px]">
        <Handle type="target" position={Position.Top} className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800" />
        <div className="text-red-500 font-bold">잘못된 서버 데이터</div>
        <Handle type="source" position={Position.Bottom} className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800" />
      </div>
    );
  }

  // config가 없는 경우 안전하게 처리
  const config = data?.config || {};
  const name = config?.name || data?.name || 'Unknown Server';
  const description = config?.description || 'No description available';
  const avatarUrl = config?.github_info?.ownerAvatarUrl || 'https://github.com/github.png';
  
  return (
    <div className={`relative p-4 bg-card border ${selected ? 'border-primary shadow-md ring-2 ring-primary/30' : 'border-border shadow'} rounded-lg flex flex-col items-center max-w-[220px] transition-shadow duration-200`}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)' }}
        className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
      />
      <img src={avatarUrl} alt={name} className="w-14 h-14 rounded-full object-contain mb-3 bg-muted p-1" />
      <div className="text-card-foreground font-bold text-base text-center mb-1">{name}</div>
      {description && (
        <div className="text-xs text-muted-foreground text-center line-clamp-2 max-w-full px-2"
          style={{display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient:'vertical', overflow:'hidden'}}
        >
          {description}
        </div>
      )}
      {data?.status && (
        <div className="mt-1 text-xs text-muted-foreground">
          상태: {data.status}
        </div>
      )}
      <div className="mt-2 text-xs text-muted-foreground">
        ID: {data?.id ? data.id.substring(0, 8) + '...' : 'New Server'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)' }}
        className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
} 