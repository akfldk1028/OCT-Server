// components/ChatList/index.tsx
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatListGroup } from './ChatListGroup';
import { useStore, useDispatch } from '@/hooks/useStore';



interface ChatItem {
  roomId: string;
  sessionId: string;
  title: string;
  createdAt: Date;
  lastMessage?: string;
  messageCount: number;
}

export const ChatList: React.FC = () => {
  const { sessionId: currentSessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useStore();

  // Room, Session, Chat 데이터를 결합하여 ChatItem 생성
  const chatItems = useMemo(() => {
    const items: ChatItem[] = [];
    
    Object.values(store.room.rooms).forEach(room => {
      const sessionId = room.sessions[0];
      if (!sessionId) return;
      
      const session = store.session.sessions[sessionId];
      if (!session) return;
      
      const messages = store.chat.messages[sessionId] || [];
      const lastMessage = messages[messages.length - 1];
      
      items.push({
        roomId: room.id,
        sessionId: session.id,
        title: room.name,
        createdAt: new Date(room.createdAt),
        lastMessage: lastMessage?.content,
        messageCount: messages.length
      });
    });
    
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [store.room.rooms, store.session.sessions, store.chat.messages]);



  const handleItemClick = (sessionId: string) => {
    navigate(`/jobs/chat/${sessionId}`);
  };

  const handleItemRename = (roomId: string, newTitle: string) => {
    dispatch({
      type: 'room.updateRoom',
      payload: { roomId, updates: { name: newTitle } }
    });
  };

  const handleItemDelete = (item: ChatItem) => {
    // 비동기 작업은 즉시 실행 (await 사용 X)
    dispatch({ type: 'chat.clearSession', payload: item.sessionId });
    dispatch({ type: 'session.deleteSession', payload: item.sessionId });
    dispatch({ type: 'room.deleteRoom', payload: item.roomId });
  
    if (currentSessionId === item.sessionId) {
      navigate('/');
    }
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-3">
        {chatItems.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No conversations yet
          </p>
        ) : (
          <>
            <ChatListGroup
              title="Today"
              currentSessionId={currentSessionId}
              onItemClick={handleItemClick}
              onItemRename={handleItemRename}
              onItemDelete={handleItemDelete as (item: ChatItem) => void}
            />
        
          </>
        )}
      </div>
    </ScrollArea>
  );
};