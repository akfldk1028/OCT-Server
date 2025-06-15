import { useParams, useOutletContext } from 'react-router';
import { ChatList } from '../../../common/components/chat/index';
import { useChatCreation } from '../../../common/components/chat/useChatCreation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ChatPageContext {
  isLoggedIn: boolean;
  name?: string;
  userId?: string;
  username?: string;
  avatar?: string | null;
  email?: string;
}

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const context = useOutletContext<ChatPageContext>();
  const { createNewChat } = useChatCreation();

  return (
    <div className="flex h-full">
      {/* 채팅 리스트 사이드바 */}
      <div className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-sidebar-foreground">채팅</h2>
            <Button
              onClick={() => createNewChat()}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              새 채팅
            </Button>
          </div>
        </div>
        
        {/* 채팅 리스트 */}
        <div className="flex-1 overflow-hidden">
          <ChatList />
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {sessionId ? (
          // 특정 채팅방이 선택된 경우
          <div className="flex-1 p-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">채팅방: {sessionId}</h3>
              <p className="text-muted-foreground">
                채팅 기능을 구현 중입니다...
              </p>
            </div>
          </div>
        ) : (
          // 채팅방이 선택되지 않은 경우
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">채팅을 시작해보세요</h3>
              <p className="text-muted-foreground mb-4">
                새로운 대화를 시작하거나 기존 채팅을 선택하세요.
              </p>
              <Button onClick={() => createNewChat()}>
                <Plus className="w-4 h-4 mr-2" />
                새 채팅 시작
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 