// components/ChatRoom.tsx
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useStore, useDispatch } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Loader2,
  Settings,
  Plus,
  X,
  Bot,
  User,
  AlertCircle,
  Wrench,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatInput from './ChatInput';
import MCPManager from '../components/MCPManager';
import ChatSidebar from '../components/Chat/ChatSidebar';
import WorkflowListModal from '../components/Flow/WorkflowListModal';
import type { Tag } from '../components/Chat/TagInput';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { makeSSRClient } from '@/renderer/supa-client';
import { getCurrentUserProfileId } from '@/renderer/features/products/queries';

// 메시지 아이템을 memoized 컴포넌트로 분리
const MessageItem = memo(function MessageItem({ message }: { message: any }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isTool = message.role === 'tool';
  const isError = message.role === 'system';

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors',
        isUser && 'justify-end',
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          {isAssistant && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
          {isTool && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
          )}
          {isError && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      )}
      
      <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 relative group-hover:shadow-sm transition-all',
            isUser && 'bg-primary text-primary-foreground rounded-br-md',
            isAssistant && 'bg-muted/80 rounded-bl-md',
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
          
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
          
          {/* 시간 표시 */}
          <div className={cn(
            'text-xs mt-2 opacity-0 group-hover:opacity-60 transition-opacity',
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {message.timestamp && formatTime(message.timestamp)}
          </div>
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
});

export default function ChatRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useStore();

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // console.log('🎬 ChatRoom rendered with sessionId:', sessionId);

  // 세션 정보 가져오기
  const session = sessionId ? store.session.sessions[sessionId] : null;
  const room = session ? store.room.rooms[session.roomId] : null;
  const messages = sessionId ? store.chat.messages[sessionId] || [] : [];
  const chatConfig = sessionId ? store.chat.configs[sessionId] : null;
  const mcpBindings = store.mcp_coordinator?.sessionBindings[sessionId!] || [];

  // 📜 자동 스크롤 - 간단한 훅 사용
  const { containerRef, scrollToBottom } = useChatScroll();

  // 🔄 메시지 변경시 자동 스크롤
  useEffect(() => {
    // DOM 업데이트 완료 후 스크롤 (약간의 지연)
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [messages.length, isStreaming, scrollToBottom]);

  // 현재 사용자 ID 가져오기
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { client } = makeSSRClient();
        const userId = await getCurrentUserProfileId(client);
        setCurrentUserId(userId);
        console.log('👤 [ChatRoom] 현재 사용자 ID:', userId);
      } catch (error) {
        console.warn('⚠️ [ChatRoom] 사용자 정보 가져오기 실패:', error);
        setCurrentUserId(null);
      }
    };

    fetchCurrentUser();
  }, []);


  // console.log('📊 Store 상태:', {
  //   '🏠 roomStore': store.room,
  //   '📋 sessionStore': store.session,
  //   '🔌 open_routerStore': store.open_router,
  //   '💬 chatStore': store.chat,
  //   '🖥️ clientStore': store.client,
  //   '⚙️ chatConfig': store.chat.configs[sessionId!],
  // });

  // 사용 가능한 리소스들
  const availableModels = Object.values(store.open_router?.models || {});
  const availableServers = Object.values(store.mcp_registry?.servers || {});
  const activeTools = chatConfig?.activeTools || [];
  
  // MCP 리소스들 필터링
  const availableTools = store.mcp_registry ? Object.values(store.mcp_registry.tools || {})
    .filter(tool => mcpBindings.some(b => b.serverId === tool.serverId && b.status === 'active')) : [];
  const availablePrompts = store.mcp_registry ? Object.values(store.mcp_registry.prompts || {})
    .filter(prompt => mcpBindings.some(b => b.serverId === prompt.serverId && b.status === 'active')) : [];
  const availableResources = store.mcp_registry ? Object.values(store.mcp_registry.resources || {})
    .filter(resource => mcpBindings.some(b => b.serverId === resource.serverId && b.status === 'active')) : [];

  // console.log('📦 Available resources:', {
  //   '🤖 models': availableModels.length,
  //   '🖥️ MCPservers': availableServers.length,
  //   '🔧 activeTools': activeTools,
  // });

  // 세션 초기화
  useEffect(() => {
    console.log('🔄 useEffect [세션 초기화] triggered');

    if (!sessionId || !session) {
      console.log('❌ No sessionId or session, navigating to home');
      navigate('/');
    }

 
    // ChatStore 초기화 (아직 안 되어있다면)
    // if (!chatConfig) {
    //   console.log('🚀 Initializing chat session...');
    //   dispatch({
    //     type: 'chat.initializeSession',
    //     payload: {
    //       sessionId,
    //       config: {
    //         model: store.open_router?.config?.defaultModel || 'openai/gpt-4',
    //         temperature: 0.7,
    //       }
    //     }
    //   });
    // } else {
    //   console.log('✅ Chat already initialized');
    // }
  }, [sessionId, session, chatConfig]);

  // 메시지 전송
  const sendMessage = async (messageContent?: string, tags?: Tag[]) => {
    const contentToSend =
      typeof messageContent === 'string' ? messageContent : input;
    console.log('📤 sendMessage called');
    console.log('📝 Input:', contentToSend);
    console.log('🏷️ Selected tags:', tags || selectedTags);
    console.log('🔄 isStreaming:', isStreaming);

    if (!contentToSend.trim() || !sessionId || isStreaming) {
      console.log('⛔ Message sending blocked:', {
        'input empty': !contentToSend.trim(),
        'no sessionId': !sessionId,
        isStreaming,
      });
      return;
    }

    setIsStreaming(true);
    console.log('🚀 Starting message dispatch...');

    try {
      await dispatch({
        type: 'chat.sendStreamingMessage',
        payload: { 
          sessionId, 
          content: contentToSend,
          selectedTags: tags || selectedTags  // 🏷️ 선택된 태그들 전달
        },
      });
      console.log('✅ Message dispatch completed');
      
      // 메시지 전송 후 태그 초기화
      setSelectedTags([]);
      setInput('');
      
      // 📜 메시지 전송 후 스크롤
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      dispatch({
        type: 'chat.sendMessage',
        payload: {
          sessionId,
          content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        },
      });
    } finally {
      setIsStreaming(false);
      console.log('🏁 Message sending finished');
    }
  };

  // MCP 서버 연결/해제
  const toggleMCPServer = async (serverId: string) => {
    console.log('🔌 toggleMCPServer called for:', serverId);

    const existingBinding = mcpBindings.find(
      (b) => b.serverId === serverId && b.status === 'active',
    );

    console.log('🔍 Existing binding:', existingBinding);

    if (existingBinding) {
      console.log('🔴 Disconnecting MCP server...');
      await dispatch({
        type: 'mcp_coordinator.disconnectMCPFromSession',
        payload: { sessionId, bindingId: existingBinding.id },
      });
    } else {
      console.log('🟢 Connecting MCP server...');
      await dispatch({
        type: 'mcp_coordinator.connectMCPToSession',
        payload: { sessionId, serverId },
      });
    }
  };

  // MCP 서버 연결/해제 (Disconnect) 직접 구현
  const handleDisconnectMCP = async (bindingId: string) => {
    if (!sessionId || !bindingId) return;
    await dispatch({
      type: 'mcp_coordinator.disconnectMCPFromSession',
      payload: { sessionId, bindingId },
    });
  };

  // 모델 변경
  const changeModel = (model: string) => {
    console.log('🤖 Changing model to:', model);
    dispatch({
      type: 'chat.updateConfig',
      payload: {
        sessionId,
        config: { model },
      },
    });
  };

  // 태그 관리 함수들
  const addTag = (tag: Tag) => {
    setSelectedTags(prev => {
      const exists = prev.some(t => t.type === tag.type && t.name === tag.name);
      if (exists) return prev;
      return [...prev, tag];
    });
  };

  const removeTag = (type: string, name: string) => {
    setSelectedTags(prev => prev.filter(tag => !(tag.type === type && tag.name === name)));
  };

  // 스키마 기반 기본 파라미터 생성
  const generateDefaultArgs = (inputSchema?: Tag['inputSchema']): any => {
    if (!inputSchema || !inputSchema.properties) return {};
    
    const args: any = {};
    const required = inputSchema.required || [];
    
    Object.entries(inputSchema.properties).forEach(([key, prop]: [string, any]) => {
      if (required.includes(key)) {
        // 필수 파라미터에 대한 기본값 제공
        switch (prop.type) {
          case 'string':
            if (key.includes('message')) {
              args[key] = `안녕하세요! "${key}" 파라미터를 테스트하고 있습니다.`;
            } else if (key.includes('location') || key.includes('place')) {
              args[key] = '서울';
            } else if (key.includes('query') || key.includes('search')) {
              args[key] = '테스트 검색어';
            } else if (key.includes('path') || key.includes('file')) {
              args[key] = './';
            } else {
              args[key] = `테스트 ${key}`;
            }
            break;
          case 'number':
            args[key] = 1;
            break;
          case 'boolean':
            args[key] = true;
            break;
          default:
            args[key] = `테스트 ${key}`;
        }
      }
    });
    
    return args;
  };

  // 실제 MCP 작업 실행
  // 워크플로우 불러오기 함수
  const handleLoadWorkflow = async (workflowData: any) => {
    try {
      console.log('💻 [ChatRoom] 로컬 워크플로우 불러오기:', workflowData);
      
      // 워크플로우 데이터를 채팅에 메시지로 추가
      const workflowMessage = `🔧 워크플로우 "${workflowData.name}"를 로컬 환경에서 실행할 준비가 완료되었습니다.\n\n` +
        `📝 설명: ${workflowData.description || '설명 없음'}\n` +
        `💻 클라이언트 타입: ${workflowData.client_type || 'local'}\n` +
        `📊 노드 수: ${workflowData.nodes?.length || 0}개\n\n` +
        `이 워크플로우를 실행하시겠습니까?`;
      
      // 시스템 메시지로 추가
      dispatch({
        type: 'chat.addMessage',
        payload: {
          sessionId,
          message: {
            id: `workflow-${Date.now()}`,
            role: 'system',
            content: workflowMessage,
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'workflow_loaded',
              workflowData: workflowData
            }
          }
        }
      });
      
      setShowWorkflowModal(false);
      
    } catch (error) {
      console.error('❌ [ChatRoom] 워크플로우 로드 실패:', error);
      
      // 오류 메시지 추가
      dispatch({
        type: 'chat.addMessage',
        payload: {
          sessionId,
          message: {
            id: `error-${Date.now()}`,
            role: 'system',
            content: `❌ 워크플로우 로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
            timestamp: new Date().toISOString(),
            metadata: { type: 'error' }
          }
        }
      });
    }
  };

  const executeMCPAction = async (tag: Tag): Promise<string> => {
    if (!sessionId) throw new Error('세션이 없습니다');
    
    switch (tag.type) {
      case 'tool':
        console.log(`🔧 도구 실행: ${tag.name}`);
        console.log(`📋 도구 스키마:`, tag.inputSchema);
        try {
          // 스키마 정보를 활용한 파라미터 생성
          let args = generateDefaultArgs(tag.inputSchema);
          
          // 🚨 Fallback: 스키마가 없거나 args가 비어있으면 도구명 기반 기본값 제공
          if (Object.keys(args).length === 0) {
            console.log(`⚠️ 스키마 정보가 없어서 fallback 로직 사용`);
            if (tag.name === 'echo') {
              args = { message: `안녕하세요! Echo 도구를 테스트하고 있습니다.` };
            } else if (tag.name.includes('weather')) {
              args = { location: '서울' };
            } else if (tag.name.includes('search')) {
              args = { query: '테스트 검색어' };
            } else if (tag.name.includes('read') || tag.name.includes('list')) {
              args = { path: './' };
            }
          }
          
          console.log(`🎯 최종 생성된 파라미터:`, args);
          
          const result = await dispatch({
            type: 'mcp_coordinator.executeToolForSession',
            payload: { sessionId, toolName: tag.name, args }
          });
          
          // MCP 응답에서 텍스트 추출
          let resultText = '';
          if (result && result.content && Array.isArray(result.content)) {
            resultText = result.content
              .filter((item: any) => item.type === 'text')
              .map((item: any) => item.text)
              .join('\n');
          } else {
            resultText = JSON.stringify(result, null, 2);
          }
          
          return `🔧 도구 "${tag.name}" 실행 결과:\n${resultText}`;
        } catch (error) {
          throw new Error(`도구 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }

      case 'prompt':
        console.log(`📝 프롬프트 가져오기: ${tag.name}`);
        console.log(`📋 프롬프트 스키마:`, tag.inputSchema);
        try {
          // 프롬프트 파라미터 생성
          const args = generateDefaultArgs(tag.inputSchema);
          console.log(`🎯 생성된 파라미터:`, args);
          
          const content = await dispatch({
            type: 'mcp_registry.getPrompt',
            payload: { promptName: tag.name, args }
          });
          return `📝 프롬프트 "${tag.name}" 내용:\n${content}`;
        } catch (error) {
          throw new Error(`프롬프트 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }

      case 'resource':
        console.log(`📄 리소스 읽기: ${tag.name}`);
        try {
          const contents = await dispatch({
            type: 'mcp_registry.readResource',
            payload: { resourceUri: tag.name }
          });
          return `📄 리소스 "${tag.name}" 내용:\n${JSON.stringify(contents, null, 2)}`;
        } catch (error) {
          throw new Error(`리소스 읽기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }

      default:
        throw new Error(`지원하지 않는 태그 타입: ${tag.type}`);
    }
  };

  if (!session || !room) {
    console.log('⚠️ No session or room found, showing error');
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-6">
          <p className="text-muted-foreground">Session not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  console.log('🎯 Rendering full chat interface');

  return (
    <div className="flex min-h-screen w-full max-w-none bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 grid grid-rows-[auto_1fr_auto] h-screen w-full max-w-none relative">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-lg">{room.name}</h2>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">실시간</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Bot className="w-4 h-4 text-blue-500" />
                  <Badge variant="secondary" className="text-xs font-normal">
                    {chatConfig?.model?.split('/').pop() || 'No model'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{messages.length}개 메시지</span>
                </div>
                
                {mcpBindings.filter((b) => b.status === 'active').length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wrench className="w-4 h-4 text-green-500" />
                    <Badge variant="outline" className="text-xs">
                      {mcpBindings.filter((b) => b.status === 'active').length}개 도구 연결됨
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 빠른 모델 변경 */}
              {!showSettings && (
                <Select
                  value={chatConfig?.model}
                  onValueChange={(value) => changeModel(value)}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="모델 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.slice(0, 5).map((model) => (
                      <SelectItem key={model.id} value={model.id} className="text-xs">
                        {model.name.split('/').pop()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* 워크플로우 버튼 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWorkflowModal(true)}
                className="gap-2"
              >
                <Workflow className="w-4 h-4" />
                워크플로우
              </Button>
              
              <Button
                variant={showSettings ? "default" : "ghost"}
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                {showSettings ? '닫기' : '설정'}
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={containerRef} className="overflow-y-auto px-4 md:px-8 lg:px-16 xl:px-24 pt-0 min-h-0">
          <div className="py-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">AI 채팅 시작하기</h3>
                  <p className="text-muted-foreground mb-6">
                    질문이나 대화를 시작해보세요. 
                    {activeTools.length > 0 && (
                      <span className="block mt-1 text-sm">
                        🛠️ {activeTools.length}개의 도구가 준비되어 있습니다.
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => sendMessage("안녕하세요!")}>
                      👋 인사하기
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => sendMessage("오늘 날씨는 어때요?")}>
                      🌤️ 날씨 문의
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => sendMessage("코딩 도움이 필요해요")}>
                      💻 코딩 도움
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((msg) => <MessageItem key={msg.id} message={msg} />)}
              </div>
            )}

            {isStreaming && (
              <div className="flex gap-3 px-4 py-4 animate-fade-in">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-muted/50 rounded-2xl px-4 py-3 max-w-fit">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-muted-foreground">AI가 응답을 생성하고 있습니다...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 입력창: 하단 고정 */}
        <div className="border-t bg-background p-4 md:px-8 lg:px-16 xl:px-24">
          <ChatInput 
            onSend={sendMessage} 
            isStreaming={isStreaming} 
            activeTools={activeTools}
            selectedTags={selectedTags}
            onTagRemove={removeTag}
            onExecuteMCPAction={executeMCPAction}
          />
        </div>
      </div>

            {/* Settings Sidebar */}
      <ChatSidebar
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onAddTag={addTag}
        tools={availableTools}
        prompts={availablePrompts}
        resources={availableResources}
        currentModel={chatConfig?.model || ''}
        temperature={chatConfig?.temperature || 0.7}
        onModelChange={changeModel}
        onTemperatureChange={(temperature) => {
          dispatch({
            type: 'chat.updateConfig',
            payload: {
              sessionId,
              config: { temperature },
            },
          });
        }}
        mcpBindings={mcpBindings}
        availableServers={availableServers}
        availableModels={availableModels}
        onToggleMCPServer={toggleMCPServer}
        onDisconnectMCP={handleDisconnectMCP}
      />

      {/* 워크플로우 모달 (로컬 클라이언트용만) */}
      <WorkflowListModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onLoadWorkflow={handleLoadWorkflow}
        userId={currentUserId || undefined}
        filterClientType="local"
        title="로컬 워크플로우 불러오기"
        description="채팅에서 실행할 로컬 환경용 워크플로우를 선택하세요"
      />
    </div>
  );
}
