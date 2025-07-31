import React from 'react';
import { MessageSquare, Zap, Workflow, Bot, Play } from 'lucide-react';
import { Button } from '@/renderer/common/components/ui/button';
import { Badge } from '@/renderer/common/components/ui/badge';

interface EmptyStateProps {
  onShowWorkflow?: () => void;
  onShowSettings?: () => void;
  mcpToolsCount?: number;
  onStartChat?: (message: string) => void;
  currentModel?: string;
  connectedServers?: string[];
}

const EmptyState: React.FC<EmptyStateProps> = ({
  onShowWorkflow,
  onShowSettings,
  mcpToolsCount = 0,
  onStartChat,
  currentModel = 'openai/gpt-4',
  connectedServers = []
}) => {
  const handleStartChat = () => {
    if (onStartChat) {
      onStartChat('안녕하세요! 어떤 도움이 필요하신가요?');
    }
  };

  // 모델 이름 간단하게 표시
  const getModelDisplayName = (modelId: string) => {
    const shortName = modelId.split('/').pop() || modelId;
    return shortName.toUpperCase().replace('-', ' ');
  };

  return (
    <div className="text-center max-w-sm mx-auto px-4">
      {/* 🔥 심플한 아이콘 */}
      <div className="w-16 h-16 mx-auto bg-primary rounded-2xl flex items-center justify-center mb-6">
        <Bot className="w-8 h-8 text-primary-foreground" />
      </div>

      {/* 🔥 간단한 타이틀 */}
      <h2 className="text-2xl font-semibold mb-3 text-foreground">
        새로운 대화 시작
      </h2>
      
      <p className="text-muted-foreground mb-6">
        AI와 대화를 시작해보세요
      </p>

      {/* 🔥 상태 정보 - 간단하게 */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Badge variant="secondary" className="gap-1 text-xs">
          <Bot className="w-3 h-3" />
          {getModelDisplayName(currentModel)}
        </Badge>
        
        {mcpToolsCount > 0 && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Zap className="w-3 h-3" />
            {mcpToolsCount}개 도구
          </Badge>
        )}
        
        {connectedServers.length > 0 && (
          <Badge variant="outline" className="gap-1 text-xs">
            <MessageSquare className="w-3 h-3" />
            {connectedServers.length}개 서버
          </Badge>
        )}
      </div>

      {/* 🔥 액션 버튼들 - 세로 배치로 깔끔하게 */}
      <div className="space-y-3">
        <Button
          onClick={handleStartChat}
          className="w-full gap-2"
          size="lg"
        >
          <Play className="w-4 h-4" />
          채팅 시작하기
        </Button>
        
        {onShowWorkflow && (
          <Button
            variant="outline"
            onClick={onShowWorkflow}
            className="w-full gap-2"
          >
            <Workflow className="w-4 h-4" />
            워크플로우 불러오기
          </Button>
        )}
        
        {onShowSettings && (
          <Button
            variant="ghost"
            onClick={onShowSettings}
            className="w-full gap-2"
          >
            <Zap className="w-4 h-4" />
            도구 설정
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState; 