// components/ChatList/ChatListItem.tsx
import React, { useState } from 'react';
import { MessageSquare, MoreHorizontal, Edit3, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChatListItemProps {
  roomId: string;
  sessionId: string;
  title: string;
  lastMessage?: string;
  createdAt: Date;
  messageCount: number;
  isActive: boolean;
  onClick: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  roomId,
  sessionId,
  title,
  lastMessage,
  createdAt,
  messageCount,
  isActive,
  onClick,
  onRename,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  // 🔥 시간 포맷팅 (간단하게)
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '방금';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-2 py-2 rounded-lg transition-colors cursor-pointer",
        isActive 
          ? "bg-sidebar-accent text-sidebar-foreground" 
          : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
      )}
      onClick={!isEditing ? onClick : undefined}
    >
      {/* 🔥 간단한 아이콘 */}
      <div className="flex-shrink-0">
        <div className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        )}>
          <MessageSquare className="w-3 h-3" />
        </div>
      </div>
      
      {/* 🔥 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setEditTitle(title);
                setIsEditing(false);
              }
            }}
            className="w-full bg-background border border-border rounded px-2 py-1 text-sm outline-none focus:border-primary"
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">
                {title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{getTimeAgo(createdAt)}</span>
                {messageCount > 0 && (
                  <span>• {messageCount}개</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 🔥 액션 버튼 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => setIsEditing(true)}
            className="cursor-pointer"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            이름 변경
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="cursor-pointer text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};