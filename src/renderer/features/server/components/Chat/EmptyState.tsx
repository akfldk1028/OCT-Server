import React, { useState } from 'react';
import { 
  MessageSquare, 
  Zap, 
  Workflow, 
  Bot, 
  Sparkles, 
  ArrowRight,
  Brain,
  Code,
  Search,
  FileText,
  Play
} from 'lucide-react';
import { Button } from '@/renderer/common/components/ui/button';
import { Card } from '@/renderer/common/components/ui/card';
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
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  // 예시 질문들 (카테고리별)
  const exampleQuestions = [
    {
      category: '🤖 AI & 분석',
      icon: <Brain className="w-4 h-4" />,
      questions: [
        '현재 프로젝트의 코드를 분석해주세요',
        'README 파일을 자동으로 생성해주세요',
        '이 데이터를 시각화해서 보여주세요'
      ]
    },
    {
      category: '💻 개발 도움',
      icon: <Code className="w-4 h-4" />,
      questions: [
        'TypeScript 타입 에러를 찾아서 수정해주세요',
        '이 함수를 최적화할 방법을 알려주세요',
        '단위 테스트 코드를 작성해주세요'
      ]
    },
    {
      category: '🔍 정보 검색',
      icon: <Search className="w-4 h-4" />,
      questions: [
        '최신 AI 트렌드를 검색해주세요',
        'Next.js 14의 새로운 기능들을 알려주세요',
        '이 기술 스택의 장단점을 비교해주세요'
      ]
    },
    {
      category: '📝 문서 작업',
      icon: <FileText className="w-4 h-4" />,
      questions: [
        '회의록을 요약해주세요',
        'API 문서를 자동으로 생성해주세요',
        '이 내용을 마크다운으로 변환해주세요'
      ]
    }
  ];

  const handleExampleClick = (question: string) => {
    setSelectedExample(question);
    if (onStartChat) {
      onStartChat(question);
    }
  };

  // 모델 이름 간단하게 표시
  const getModelDisplayName = (modelId: string) => {
    const shortName = modelId.split('/').pop() || modelId;
    return shortName.toUpperCase().replace('-', ' ');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
        {/* 메인 아이콘 & 타이틀 */}
        <div className="mb-8">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI와 함께 시작해보세요!
          </h2>
          
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            MCP (Model Context Protocol) 도구들과 연결된 강력한 AI 어시스턴트가 
            당신의 작업을 도와드립니다.
          </p>
        </div>

        {/* 현재 상태 정보 */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Badge variant="secondary" className="gap-2 px-3 py-1">
            <Bot className="w-4 h-4" />
            {getModelDisplayName(currentModel)}
          </Badge>
          
          {mcpToolsCount > 0 && (
            <Badge variant="outline" className="gap-2 px-3 py-1 bg-purple-50 border-purple-200 text-purple-700">
              <Zap className="w-4 h-4" />
              {mcpToolsCount}개 도구 연결됨
            </Badge>
          )}
          
          {connectedServers.length > 0 && (
            <Badge variant="outline" className="gap-2 px-3 py-1 bg-green-50 border-green-200 text-green-700">
              <MessageSquare className="w-4 h-4" />
              {connectedServers.length}개 서버 활성
            </Badge>
          )}
        </div>

  

        {/* 빠른 액션 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          {onShowWorkflow && (
            <Button
              onClick={onShowWorkflow}
              className="gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              size="lg"
            >
              <Workflow className="w-5 h-5" />
              워크플로우 불러오기
            </Button>
          )}
          
          {onShowSettings && (
            <Button
              variant="outline"
              onClick={onShowSettings}
              className="gap-2"
              size="lg"
            >
              <Zap className="w-5 h-5" />
              도구 설정하기
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => handleExampleClick('안녕하세요! 어떤 도움이 필요하신가요?')}
            className="gap-2"
            size="lg"
          >
            <Play className="w-5 h-5" />
            채팅 시작하기
          </Button>
        </div>

        {/* 도움말 카드 */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border-0">
          <h4 className="font-semibold mb-3 text-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            사용법 가이드
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <p className="font-medium text-foreground mb-1">질문하기</p>
              <p>위의 예시를 클릭하거나 직접 질문을 입력하세요</p>
            </div>
            
            <div className="text-center">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-600 dark:text-purple-400 font-bold">2</span>
              </div>
              <p className="font-medium text-foreground mb-1">도구 활용</p>
              <p>AI가 자동으로 필요한 도구를 선택해서 사용합니다</p>
            </div>
            
            <div className="text-center">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 dark:text-green-400 font-bold">3</span>
              </div>
              <p className="font-medium text-foreground mb-1">결과 확인</p>
              <p>처리된 결과를 받아보고 추가 질문을 하세요</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EmptyState; 