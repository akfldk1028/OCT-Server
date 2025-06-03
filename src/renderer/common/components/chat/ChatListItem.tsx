// components/ChatList/ChatListItem.tsx
import React, { useState } from 'react';
import { MessageSquare, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
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

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors relative",
        isActive && "bg-accent"
      )}
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0" />
      
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
          className="flex-1 bg-transparent border-b border-primary outline-none text-sm"
          autoFocus
        />
      ) : (
        <button
          onClick={onClick}
          className="flex-1 text-left truncate text-sm"
        >
          <div className="font-medium truncate">{title}</div>
          {lastMessage && (
            <div className="text-xs text-muted-foreground truncate">
              {lastMessage}
            </div>
          )}
        </button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};