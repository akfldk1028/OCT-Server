import type { ServerItem } from '../../../types';
import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../common/components/ui/card';
import { Badge } from '../../../common/components/ui/badge';

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
  dragIcon.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; background-color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
  
  // 작은 이미지 요소 생성
  const smallImg = document.createElement('img');
  smallImg.src = imageUrl;
  smallImg.style.cssText = 'width: 24px; height: 24px; border-radius: 50%; object-fit: cover;';
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
  servers: ServerItem[];
}

export default function HelpTab({ collapsed, onDragStart, servers = [] }: HelpTabProps) {
  // allServers가 있으면 그걸 쓰고, 아니면 빈 배열
  const serverList = (servers as any).allServers ?? servers ?? [];
  if (collapsed) {
    // 접힘: 로고만 카드 (드래그 지원)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 p-2 justify-items-center">
        {serverList.map((server: ServerItem, idx: number) => (
          <div
            key={server.id}
            className="w-15 h-15 sm:w-32 bg-card rounded-xl shadow-md flex items-center justify-center hover:bg-card/80 transition-all duration-200 cursor-grab active:cursor-grabbing"
            title={server.config.name || server.name}
            draggable="true"
            onDragStart={event => {
              // 드래그 시작 전에 모든 데이터 초기화
              event.dataTransfer.clearData();
              
              // SERVER_ID 형식으로 데이터 설정
              event.dataTransfer.setData('text/plain', `SERVER_ID:${server.id}`);
              
              // 전역 변수에 서버 데이터 저장
              window.__lastDraggedServerId = server.id;
              window.__lastDraggedServer = server;
              
              // 작은 드래그 이미지 설정
              if (server.config.github_info?.ownerAvatarUrl) {
                createCustomDragImage(event, server.config.github_info.ownerAvatarUrl);
              }
              
              // 디버깅
              console.log('서버 드래그 설정 완료:', server.id);
            }}
          >
            {server.config.github_info?.ownerAvatarUrl ? (
              <img
                src={server.config.github_info.ownerAvatarUrl}
                alt={server.config.name || server.name}
                className="w-6 h-6 sm:w-6 sm:h-6 object-contain"
                // 중요: 이미지 자체의 드래그는 방지
                onDragStart={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }}
                draggable="false"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              />
            ) : (
              <span className="text-2xl">🧩</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 펼침: Card로 전체 정보
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 p-2 overflow-y-auto items-stretch">
      {serverList.map((server: ServerItem) => (
        <Card key={server.id} 
          className="flex flex-col items-center justify-between bg-transparent w-full h-full transition-colors hover:bg-card/50"
          draggable="true"
          onDragStart={event => {
            // 드래그 시작 시 로깅 추가
            console.log('펼침 상태 서버 드래그 시작:', server.name || server.id);
            
            // 중요: 모든 기본 동작 방지
            event.stopPropagation();
            
            // 중요: dataTransfer 객체의 모든 속성 초기화
            event.dataTransfer.clearData();
            
            // 서버 데이터를 안전한 방식으로 설정 - 단순한 서버 식별자만 전달
            event.dataTransfer.setData('text/plain', `SERVER_ID:${server.id}`);
            
            // 전역 변수에 서버 데이터 저장
            window.__lastDraggedServerId = server.id;
            window.__lastDraggedServer = server;
            
            // 작은 드래그 이미지 설정
            if (server.config.github_info?.ownerAvatarUrl) {
              createCustomDragImage(event, server.config.github_info.ownerAvatarUrl);
            }
            
            // 기본 드래그 효과 설정
            event.dataTransfer.effectAllowed = 'copyMove';
            
            console.log('펼침 상태 서버 드래그 설정 완료:', server.id);
          }}
        >
          <CardHeader className="flex flex-col items-center pb-0">
            {server.config.github_info?.ownerAvatarUrl ? (
              <img
                src={server.config.github_info.ownerAvatarUrl}
                alt={server.config.name || server.name}
                className="size-14 rounded-full mb-2 object-contain"
                // 중요: 이미지 자체의 드래그는 방지
                onDragStart={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }}
                draggable="false"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              />
            ) : (
              <span className="text-4xl mb-2">🧩</span>
            )}
            <span className="text-accent-foreground font-bold text-center text-base break-words w-full">
              {server.config.name || server.name}
            </span>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2 w-full px-2 py-0">
            <Badge variant="outline" className="capitalize mb-2">
              {server.status}
            </Badge>
            <span className="text-sm text-muted-foreground text-center line-clamp-3 break-words w-full" style={{display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
              {server.config.description}
            </span>
          </CardContent>
          <CardFooter className="flex justify-center w-full mt-auto pt-0 pb-2">
            <a
              href={server.config.primary_url || server.config.github_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full max-w-[120px]"
            >
              <Badge variant="secondary" className="w-full text-center cursor-pointer">깃허브</Badge>
            </a>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 