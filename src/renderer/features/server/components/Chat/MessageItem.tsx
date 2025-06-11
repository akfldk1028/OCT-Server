import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, Wrench, AlertCircle } from 'lucide-react';

interface MessageItemProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
    timestamp?: string;
    metadata?: {
      isCooperative?: boolean;
      avatar?: string;
      clientId?: string;
      type?: 'overlay-start' | 'overlay-success' | 'overlay-error' | 'window-connection' | 'window-disconnection';
      toolName?: string;
      windowInfo?: any;
    };
  };
  aiClientId?: string | null;
  overlayClientId?: string | null;
}

const MessageItem = memo(function MessageItem({ message, aiClientId, overlayClientId }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isTool = message.role === 'tool';
  const isError = message.role === 'system';
  
  // 🔥 클라이언트 ID 기반 협업 메시지 감지
  const messageClientId = message.metadata?.clientId;
  const isAIClient = messageClientId === aiClientId;
  const isOverlayClient = messageClientId === overlayClientId;
  const isCooperative = isAIClient || isOverlayClient || message.metadata?.isCooperative;
  const overlayType = message.metadata?.type;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={cn(
        'group flex gap-2 px-2 py-2 hover:bg-muted/30 transition-colors', // 🔥 간격 줄임: gap-3 px-4 py-3 → gap-2 px-2 py-2
        isUser && 'justify-end',
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          {isAssistant && !isCooperative && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center"> {/* 🔥 크기 줄임: w-8 h-8 → w-6 h-6 */}
              <Bot className="w-4 h-4 text-white" /> {/* 🔥 아이콘 크기 줄임: w-5 h-5 → w-4 h-4 */}
            </div>
          )}
          {isAssistant && isAIClient && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30"> {/* 🔥 크기 줄임 */}
              <span className="text-xs font-bold text-white">🤖</span> {/* 🔥 텍스트 크기 줄임: text-sm → text-xs */}
            </div>
          )}
          {isAssistant && isOverlayClient && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30"> {/* 🔥 크기 줄임 */}
              <span className="text-xs font-bold text-white">👁️</span> {/* 🔥 텍스트 크기 줄임 */}
            </div>
          )}
          {isTool && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center"> {/* 🔥 크기 줄임 */}
              <Wrench className="w-4 h-4 text-white" /> {/* 🔥 아이콘 크기 줄임 */}
            </div>
          )}
          {isError && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center"> {/* 🔥 크기 줄임 */}
              <AlertCircle className="w-4 h-4 text-white" /> {/* 🔥 아이콘 크기 줄임 */}
            </div>
          )}
        </div>
      )}
      
      <div className={cn('flex flex-col gap-1 max-w-[95%]', isUser && 'items-end')}> {/* 🔥 최대 너비 증가: max-w-[90%] → max-w-[95%] */}
        <div
          className={cn(
            'rounded-xl px-3 py-2 relative group-hover:shadow-sm transition-all', // 🔥 패딩 줄임: rounded-2xl px-4 py-3 → rounded-xl px-3 py-2
            isUser && 'bg-yellow-400 text-black rounded-br-md',
            isAssistant && !isCooperative && 'bg-muted/80 rounded-bl-md',
            isAssistant && isCooperative && 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-2 border-yellow-300 dark:border-yellow-600 rounded-bl-md shadow-lg shadow-yellow-500/20',
            isTool && 'bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/50 dark:to-green-950/50 border border-blue-200 dark:border-blue-800',
            isError && 'bg-destructive/10 text-destructive border border-destructive/20',
          )}
        >
          {isTool && (
            <div className="flex items-center gap-2 text-xs font-medium mb-2 text-blue-600 dark:text-blue-400">
              <Wrench className="w-3 h-3" />
              <span>도구: {message.metadata?.toolName}</span>
            </div>
          )}
          
          {isCooperative && (
            <div className="flex items-center gap-2 text-xs font-medium mb-3 text-yellow-700 dark:text-yellow-400 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 px-3 py-1.5 rounded-full border border-yellow-300 dark:border-yellow-600">
              {overlayType === 'overlay-start' && (
                <>
                  <span className="animate-spin">🔍</span>
                  <span className="font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">Overlay Vision</span>
                  <span className="text-yellow-600 dark:text-yellow-400">• 화면 분석 중</span>
                </>
              )}
              {overlayType === 'overlay-success' && (
                <>
                  <span className="animate-bounce">👁️</span>
                  <span className="font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">Overlay Vision</span>
                  <span className="text-yellow-600 dark:text-yellow-400">• 분석 완료!</span>
                </>
              )}
              {overlayType === 'overlay-error' && (
                <>
                  <span>⚠️</span>
                  <span className="font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Overlay Vision</span>
                  <span className="text-red-600 dark:text-red-400">• 오류 발생</span>
                </>
              )}
              {!overlayType && (
                <>
                  <span className="animate-bounce">👁️</span>
                  <span className="font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">Overlay Vision</span>
                  <span className="text-yellow-600 dark:text-yellow-400">• 화면 가이드</span>
                </>
              )}
            </div>
          )}
          
          <div className="whitespace-pre-wrap leading-snug text-sm"> {/* 🔥 줄 간격 줄이고 텍스트 크기 줄임: leading-relaxed → leading-snug, text-sm 추가 */}
            {message.content}
          </div>
          
          {/* 시간 표시 */}
          <div className={cn(
            'text-xs mt-2 opacity-60 transition-opacity',
            isUser ? 'text-black/90 drop-shadow-sm' : 'text-muted-foreground'
          )}>
            {message.timestamp && formatTime(message.timestamp)}
          </div>
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center"> {/* 🔥 크기 줄임: w-8 h-8 → w-6 h-6 */}
            <User className="w-4 h-4 text-white" /> {/* 🔥 아이콘 크기 줄임: w-5 h-5 → w-4 h-4 */}
          </div>
        </div>
      )}
    </div>
  );
});

export default MessageItem; 