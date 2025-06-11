import { forwardRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import EmptyState from './EmptyState';
import LoadingStates from './LoadingStates';

interface ChatMessagesProps {
  messages: any[];
  mcpBindingsCount: number;
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
  aiClientId: string | null;
  overlayClientId: string | null;
  clientsStatus: {
    ai: 'idle' | 'thinking' | 'responding';
    overlay: 'idle' | 'analyzing' | 'generating';
  };
}

const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  function ChatMessages({
    messages,
    mcpBindingsCount,
    onSendMessage,
    isStreaming,
    aiClientId,
    overlayClientId,
    clientsStatus,
  }, ref) {
    return (
      <div ref={ref} className="h-full overflow-y-auto px-2 py-2"> {/* 🔥 패딩 줄임: px-8 py-6 → px-2 py-2 */}
        <div className="w-full space-y-2"> {/* 🔥 mx-auto 제거하고 w-full로 전체 너비 사용 */}
          {messages.map((msg) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              aiClientId={aiClientId}
              overlayClientId={overlayClientId}
            />
          ))}
          
          <LoadingStates
            isStreaming={isStreaming}
            aiClientId={aiClientId}
            overlayClientId={overlayClientId}
            clientsStatus={clientsStatus}
          />
        </div>
      </div>
    );
  }
);

export default ChatMessages; 