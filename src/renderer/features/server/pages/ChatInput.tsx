import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(({ onSend, isStreaming }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex gap-2">
      <Textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type a message..."
        className="min-h-[60px] max-h-[200px] resize-none"
        disabled={isStreaming}
      />
      <Button
        onClick={handleSend}
        disabled={!input.trim() || isStreaming}
        size="icon"
        className="h-auto"
      >
        {isStreaming ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
});

export default ChatInput; 