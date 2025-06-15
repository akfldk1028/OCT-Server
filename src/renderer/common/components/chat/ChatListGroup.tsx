// components/ChatList/ChatListGroup.tsx
import React from 'react';
import { ChatListItem } from './ChatListItem';

interface ChatItem {
  roomId: string;
  sessionId: string;
  title: string;
  createdAt: Date;
  lastMessage?: string;
  messageCount: number;
}

interface ChatListGroupProps {
  title: string;
  items: ChatItem[];
  currentSessionId?: string;
  onItemClick: (sessionId: string) => void;
  onItemRename: (roomId: string, newTitle: string) => void;
  onItemDelete: (item: ChatItem) => void;
}

export const ChatListGroup: React.FC<ChatListGroupProps> = ({
  title,
  items,
  currentSessionId,
  onItemClick,
  onItemRename,
  onItemDelete,
}) => {
  // 🔥 items가 undefined이거나 빈 배열인 경우 처리
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-4">
      {/* 🔥 깔끔한 섹션 헤더 */}
      <div className="px-2 mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-xs text-muted-foreground">
          {items.length}
        </span>
      </div>
      
      {/* 🔥 채팅 아이템들 */}
      <div className="space-y-1">
        {items.map((item) => (
          <ChatListItem
            key={item.sessionId}
            {...item}
            isActive={currentSessionId === item.sessionId}
            onClick={() => onItemClick(item.sessionId)}
            onRename={(newTitle) => onItemRename(item.roomId, newTitle)}
            onDelete={() => onItemDelete(item)}
          />
        ))}
      </div>
    </div>
  );
};