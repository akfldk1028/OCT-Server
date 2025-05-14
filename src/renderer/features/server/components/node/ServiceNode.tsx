import React from 'react';
import { Handle, Position } from '@xyflow/react';

// ReactFlow 노드 프롭스 타입
interface ServiceNodeProps {
  data: {
    name: string;
    icon: string;
    description?: string;
  };
  selected?: boolean;
  id: string;
}

export default function ServiceNode({ data, selected, id }: ServiceNodeProps) {
  // 데이터 없으면 에러 표시
  if (!data || !data.name) {
    return (
      <div className="p-3 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 border border-red-300 dark:border-red-800 rounded-md shadow-md">
        <Handle 
          type="target" 
          position={Position.Top} 
          className="!w-6 !h-6 !bg-red-500 !border-2 !border-white dark:!border-gray-800" 
          style={{ width: '24px', height: '24px', top: '-12px', background: 'red', zIndex: 10 }}
        />
        <div className="text-center font-medium">에러: 데이터 없음</div>
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="!w-6 !h-6 !bg-red-500 !border-2 !border-white dark:!border-gray-800" 
          style={{ width: '24px', height: '24px', bottom: '-12px', background: 'red', zIndex: 10 }}
        />
      </div>
    );
  }

  return (
    <div 
      className={`p-4 bg-card border ${selected ? 'border-primary shadow-md ring-2 ring-primary/30' : 'border-border shadow'} rounded-lg flex flex-col items-center max-w-[220px] transition-shadow duration-200`}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
      />
      
      <img 
        src={data.icon} 
        alt={data.name} 
        className="w-14 h-14 rounded-full object-contain mb-3 bg-muted p-1" 
        onError={(e) => {
          // 이미지 로드 실패 시 fallback
          e.currentTarget.src = 'https://github.com/teslamotors.png';
        }}
      />
      
      <div className="text-card-foreground font-bold text-base text-center mb-1">{data.name}</div>
      
      {data.description && (
        <div className="text-xs text-muted-foreground text-center line-clamp-2 max-w-full px-2"
          style={{display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient:'vertical', overflow:'hidden'}}
        >
          {data.description}
        </div>
      )}
      
      <div className="mt-2 text-xs text-muted-foreground">
        ID: {id.substring(0, 8)}...
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
} 