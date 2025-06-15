import { useParams } from 'react-router';
import ChatRoom  from './RealtimeChat'; // 경로는 실제 파일 위치에 맞게 수정

function ChatWrapper() {
  const { sessionId } = useParams<{ sessionId: string }>();
  
  return (
    <div className="h-full w-full overflow-hidden">
      <ChatRoom />
    </div>
  );
}

export default ChatWrapper;