import { useParams, useOutletContext } from 'react-router';
import ChatRoom from '../../server/pages/RealtimeChat'; // 기존 채팅 컴포넌트 사용

interface ChatRoomPageContext {
  isLoggedIn: boolean;
  name?: string;
  userId?: string;
  username?: string;
  avatar?: string | null;
  email?: string;
}

export default function ChatRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const context = useOutletContext<ChatRoomPageContext>();

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">잘못된 채팅방 ID입니다.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <ChatRoom />
    </div>
  );
} 