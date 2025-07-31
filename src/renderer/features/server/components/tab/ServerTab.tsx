import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ServerItem } from '../../../../types';
import type { Database } from '../../../../database.types';

// 🔥 server-layout.tsx에서 정의한 정확한 타입 사용
type InstalledServer = Database['public']['Tables']['user_mcp_usage']['Row'] & {
  mcp_install_methods: Database['public']['Tables']['mcp_install_methods']['Row'] | null;
  mcp_servers: Database['public']['Tables']['mcp_servers']['Row'] | null;
  mcp_configs?: Database['public']['Tables']['mcp_configs']['Row'][];
};

// 전역 변수 타입 선언 (TypeScript에서 필요)
declare global {
  interface Window {
    __lastDraggedServerId?: string;
    __lastDraggedServer?: ServerItem;
  }
}

/**
 * 커스텀 드래그 이미지를 생성하는 함수
 */
function createCustomDragImage(event: React.DragEvent, imageUrl: string) {
  // setDragImage를 지원하는지 확인
  if (!event.dataTransfer.setDragImage) {
    return; // 지원하지 않으면 종료
  }

  // 크기가 조절된 드래그 이미지 설정
  const dragIcon = document.createElement('div');
  dragIcon.style.cssText =
    'width: 32px; height: 32px; border-radius: 50%; background-color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';

  // 작은 이미지 요소 생성
  const smallImg = document.createElement('img');
  smallImg.src = imageUrl;
  smallImg.style.cssText =
    'width: 24px; height: 24px; border-radius: 50%; object-fit: cover;';
  dragIcon.appendChild(smallImg);

  // 문서에 추가 (필요함)
  document.body.appendChild(dragIcon);

  // 드래그 이미지 설정
  event.dataTransfer.setDragImage(dragIcon, 16, 16);

  // 잠시 후 제거 (화면에 남지 않도록)
  setTimeout(() => {
    document.body.removeChild(dragIcon);
  }, 0);
}

interface HelpTabProps {
  collapsed: boolean;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  servers: InstalledServer[];
}

export default function ServerTab({
  collapsed,
  onDragStart,
  servers = [],
}: HelpTabProps) {
  console.log('🔍 [ServerTab] 받은 설치된 서버들:', servers);
  if (collapsed) {
    // 접힘: 로고만 카드 (드래그 지원)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 p-2 justify-items-center">
        {servers.map((server: InstalledServer) => (
          <div
            key={server.id}
            className="w-15 h-15 sm:w-32 bg-card rounded-xl shadow-md flex items-center justify-center hover:bg-card/80 transition-all duration-200 cursor-grab active:cursor-grabbing"
            title={server.mcp_servers?.name || `서버 ${server.original_server_id}`}
            draggable="true"
            onDragStart={(event) => {
              // 드래그 시작 전에 모든 데이터 초기화
              event.dataTransfer.clearData();

              // SERVER_ID 형식으로 데이터 설정
              event.dataTransfer.setData(
                'text/plain',
                `SERVER_ID:${server.id}`,
              );

              // 전역 변수에 서버 데이터 저장
              window.__lastDraggedServerId = String(server.id);
              window.__lastDraggedServer = server as any;

              // 디버깅
              console.log('서버 드래그 설정 완료:', server.id);
            }}
          >
            {/* 🔥 축소 상태에서도 실제 아이콘 표시 */}
            {server.mcp_servers?.local_image_path ? (
              <img
                src={server.mcp_servers.local_image_path}
                alt={server.mcp_servers.name || 'Server'}
                className="w-8 h-8 rounded object-cover"
                onError={(e) => {
                  // 이미지 로드 실패시 fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            {/* 🔥 Fallback avatar */}
            <div 
              className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm ${
                server.mcp_servers?.local_image_path ? 'hidden' : ''
              }`}
              style={{ 
                backgroundColor: server.mcp_servers?.fallback_avatar_color || '#6366f1' 
              }}
            >
              {server.mcp_servers?.fallback_avatar_initials || server.mcp_servers?.name?.slice(0, 2).toUpperCase() || '🧩'}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 펼침: Card로 전체 정보
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 p-2 overflow-y-auto items-stretch">
      {servers.map((server: InstalledServer) => (
        <Card
          key={server.id}
          className="flex flex-col items-center justify-between bg-transparent w-full h-full transition-colors hover:bg-card/50"
          draggable="true"
          onDragStart={(event) => {
            // 드래그 시작 시 로깅 추가
            console.log(
              '펼침 상태 서버 드래그 시작:',
              server.mcp_servers?.name || server.id,
            );

            // 중요: 모든 기본 동작 방지
            event.stopPropagation();

            // 중요: dataTransfer 객체의 모든 속성 초기화
            event.dataTransfer.clearData();

            // 서버 데이터를 안전한 방식으로 설정 - 단순한 서버 식별자만 전달
            event.dataTransfer.setData('text/plain', `SERVER_ID:${server.id}`);

            // 전역 변수에 서버 데이터 저장
            window.__lastDraggedServerId = String(server.id);
            window.__lastDraggedServer = server as any;

            // 기본 드래그 효과 설정
            event.dataTransfer.effectAllowed = 'copyMove';

            console.log('펼침 상태 서버 드래그 설정 완료:', server.id);
          }}
        >
          <CardHeader className="flex flex-col items-center pb-0">
            {/* 🔥 실제 서버 아이콘/이미지 표시 */}
            {server.mcp_servers?.local_image_path ? (
              <img
                src={server.mcp_servers.local_image_path}
                alt={server.mcp_servers.name || 'Server'}
                className="w-12 h-12 mb-2 rounded-lg object-cover"
                onError={(e) => {
                  // 이미지 로드 실패시 fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            {/* 🔥 Fallback avatar (initials + color) */}
            <div 
              className={`w-12 h-12 mb-2 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
                server.mcp_servers?.local_image_path ? 'hidden' : ''
              }`}
              style={{ 
                backgroundColor: server.mcp_servers?.fallback_avatar_color || '#6366f1' 
              }}
            >
              {server.mcp_servers?.fallback_avatar_initials || server.mcp_servers?.name?.slice(0, 2).toUpperCase() || '🧩'}
            </div>
            <span className="text-accent-foreground font-bold text-center text-base break-words w-full">
              {server.mcp_servers?.name || `서버 ${server.original_server_id}`}
            </span>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2 w-full px-2 py-2">
            <Badge variant="outline" className="capitalize mb-2">
              {server.install_status === 'success' ? '설치됨' : server.install_status || 'Unknown'}
            </Badge>
            {server.mcp_install_methods?.command && (
              <Badge variant="outline" className="text-xs">
                {server.mcp_install_methods.command}
              </Badge>
            )}
    
          </CardContent>
         
        </Card>
      ))}
    </div>
  );
}
