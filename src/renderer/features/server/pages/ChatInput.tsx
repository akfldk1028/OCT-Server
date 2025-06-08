import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/renderer/common/components/ui/button';
import { Textarea } from '@/renderer/common/components/ui/textarea';
import { Loader2, Send, MessageSquare, Zap } from 'lucide-react';
import TagInput, { type Tag } from '../components/Chat/TagInput';

interface ChatInputProps {
  onSend: (message: string, tags?: Tag[]) => void;
  isStreaming: boolean;
  activeTools?: string[];
  selectedTags?: Tag[];
  onTagRemove?: (type: string, name: string) => void;
  onExecuteMCPAction?: (tag: Tag) => Promise<string>;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(({ onSend, isStreaming, activeTools = [], selectedTags = [], onTagRemove, onExecuteMCPAction }) => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    
    // ✨ 태그 정보와 함께 메시지 전송 (AI가 도구를 사용하도록)
    onSend(input, selectedTags);
    setInput('');
  };

  // 자동 포커스
  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  const getPlaceholderText = () => {
    if (isStreaming) return "AI가 응답 중입니다...";
    if (activeTools.length > 0) return `메시지를 입력하세요... (${activeTools.length}개 도구 사용 가능)`;
    return "메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)";
  };

  return (
    <div className="relative">
      {/* 선택된 태그 표시 */}
      {selectedTags.length > 0 && onTagRemove && (
        <TagInput 
          tags={selectedTags}
          onTagRemove={onTagRemove}
        />
      )}
      
      {/* 활성 도구 표시 */}
      {activeTools.length > 0 && !isStreaming && selectedTags.length === 0 && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <Zap className="w-3 h-3 text-blue-500" />
          <span>사용 가능한 도구: {activeTools.slice(0, 3).join(', ')}</span>
          {activeTools.length > 3 && <span>외 {activeTools.length - 3}개</span>}
        </div>
      )}
      
      <div className={`flex gap-3 p-4 bg-background border rounded-xl transition-all duration-200 ${
        isFocused ? 'ring-2 ring-yellow-400/20 border-yellow-400/30' : 'border-border'
      } ${isStreaming ? 'opacity-75' : ''}`}>
        
        {/* 메시지 아이콘 */}
        <div className="flex-shrink-0 mt-2">
          <MessageSquare className={`w-5 h-5 transition-colors ${
            isFocused ? 'text-yellow-400' : 'text-muted-foreground'
          }`} />
        </div>

        {/* 입력 영역 */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={getPlaceholderText()}
            className="min-h-[50px] max-h-[150px] resize-none border-0 p-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60"
            disabled={isStreaming}
            rows={1}
          />
          
          {/* 입력 힌트 */}
          {isFocused && !isStreaming && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
              <span>💡 <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> 전송</span>
              <span><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> 줄바꿈</span>
            </div>
          )}
        </div>

        {/* 전송 버튼 */}
        <div className="flex-shrink-0">
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className={`h-10 w-10 rounded-lg transition-all duration-200 ${
              input.trim() && !isStreaming 
                ? 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg hover:shadow-xl' 
                : ''
            }`}
            variant={input.trim() && !isStreaming ? "default" : "ghost"}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className={`w-4 h-4 transition-transform ${
                input.trim() ? 'scale-110' : 'scale-100'
              }`} />
            )}
          </Button>
        </div>
      </div>

      {/* 문자 수 카운터 (긴 메시지일 때만 표시) */}
      {input.length > 100 && (
        <div className="text-xs text-muted-foreground mt-1 text-right">
          {input.length} characters
        </div>
      )}
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput; 