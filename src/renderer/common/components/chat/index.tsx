// components/ChatList/index.tsx
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { MessageSquare } from 'lucide-react';
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
    navigate(`/chat/${sessionId}`);
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
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="p-2">
        {chatItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            {/* 🔥 깔끔한 빈 상태 */}
            <div className="w-12 h-12 bg-sidebar-accent rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              대화를 시작해보세요
            </p>
          </div>
        ) : (
          <>
            <ChatListGroup
              title="Recent Conversations"
              items={chatItems}
              currentSessionId={currentSessionId}
              onItemClick={handleItemClick}
              onItemRename={handleItemRename}
              onItemDelete={handleItemDelete}
            />
        
          </>
        )}
      </div>
    </div>
  );
};