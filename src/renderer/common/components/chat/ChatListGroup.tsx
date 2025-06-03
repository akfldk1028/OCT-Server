// components/ChatList/ChatListGroup.tsx
import React from 'react';
import { ChatListItem } from './ChatListItem';

interface ChatItem {
  roomId: string;
  sessionId: string;
  title: string;
  lastMessage?: string;
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
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase">
        {title}
      </h3>
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