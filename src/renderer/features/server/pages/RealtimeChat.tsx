// components/ChatRoom.tsx
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useStore, useDispatch } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatInput from './ChatInput';
import MCPManager from '../components/MCPManager';

// 메시지 아이템을 memoized 컴포넌트로 분리
const MessageItem = memo(function MessageItem({ message }: { message: any }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isTool = message.role === 'tool';
  const isError = message.role === 'system';

  return (
    <div
      key={message.id}
      className={cn(
        'group flex gap-3 px-4 py-3 hover:bg-muted/50',
        isUser && 'justify-end',
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          {isAssistant && <Bot className="w-6 h-6" />}
          {isError && <AlertCircle className="w-6 h-6 text-destructive" />}
        </div>
      )}
      <div
        className={cn('flex flex-col gap-1 max-w-[70%]', isUser && 'items-end')}
      >
        <div
          className={cn(
            'rounded-lg px-3 py-2',
            isUser && 'bg-primary text-primary-foreground',
            isAssistant && 'bg-muted',
            isTool && 'bg-blue-50 dark:bg-blue-950',
            isError && 'bg-destructive/10 text-destructive',
          )}
        >
          {isTool && (
            <div className="text-xs font-medium mb-1">
              Tool: {message.metadata?.toolName}
            </div>
          )}
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0">
          <User className="w-6 h-6" />
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // console.log('🎬 ChatRoom rendered with sessionId:', sessionId);

  // 세션 정보 가져오기
  const session = sessionId ? store.session.sessions[sessionId] : null;
  const room = session ? store.room.rooms[session.roomId] : null;
  const messages = sessionId ? store.chat.messages[sessionId] || [] : [];
  const chatConfig = sessionId ? store.chat.configs[sessionId] : null;
  const mcpBindings = store.mcp_coordinator?.sessionBindings[sessionId!] || [];

  console.log('📊 Store 상태:', {
    '🏠 roomStore': store.room,
    '📋 sessionStore': store.session,
    '🔌 open_routerStore': store.open_router,
    '💬 chatStore': store.chat,
    '🖥️ clientStore': store.client,
    '⚙️ chatConfig': store.chat.configs[sessionId!],
  });

  // 사용 가능한 리소스들
  const availableModels = Object.values(store.open_router?.models || {});
  const availableServers = Object.values(store.mcp_registry?.servers || {});
  const activeTools = chatConfig?.activeTools || [];

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

  // 자동 스크롤
  useEffect(() => {
    console.log('📜 Auto-scrolling to bottom (messages changed)');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 메시지 전송
  const sendMessage = async (messageContent?: string) => {
    const contentToSend =
      typeof messageContent === 'string' ? messageContent : input;
    console.log('📤 sendMessage called');
    console.log('📝 Input:', contentToSend);
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
        payload: { sessionId, content: contentToSend },
      });
      console.log('✅ Message dispatch completed');
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
    <div className="flex flex-col min-h-screen w-full max-w-none bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full max-w-none relative">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{room.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{chatConfig?.model || 'No model'}</Badge>
              <span>•</span>
              <span>{messages.length} messages</span>
              {mcpBindings.filter((b) => b.status === 'active').length > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {mcpBindings.filter((b) => b.status === 'active').length}{' '}
                    MCP servers
                  </span>
                </>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log('⚙️ Settings toggle clicked');
              setShowSettings(!showSettings);
            }}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-0 md:px-8 lg:px-32 xl:px-64 pt-0">
          <div className="py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
            )}

            {isStreaming && (
              <div className="flex gap-3 px-4 py-3">
                <Bot className="w-6 h-6" />
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* 입력창: 하단 고정 + 아래로 띄우기 */}
        <div className="sticky left-0 right-0 bottom-6 z-20 border-t p-4 md:px-8 lg:px-32 xl:px-64 bg-background w-full">
          <ChatInput onSend={sendMessage} isStreaming={isStreaming} />
          {activeTools.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Wrench className="w-3 h-3" />
              <span>Active tools:</span>
              {activeTools.map((tool) => (
                <Badge key={tool} variant="secondary" className="text-xs">
                  {tool}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings Sidebar */}
      {showSettings && (
        <div className="w-96 border-l p-6 space-y-6 bg-background">
          <h3 className="font-semibold">Chat Settings</h3>
          <MCPManager sessionId={sessionId!} />

          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">AI Model</label>
            <Select
              value={chatConfig?.model}
              onValueChange={(value) => {
                console.log('🎯 Model selected:', value);
                changeModel(value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => {
                  return (
                    <SelectItem key={model.id} value={model.id}>
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${model.pricing?.prompt || 0} / 1K tokens
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* MCP Servers */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              MCP Servers
            </label>
            <div className="space-y-2">
              {availableServers.map((server) => {
                const binding = mcpBindings.find(
                  (b) => b.serverId === server.id && b.status === 'active',
                );
                return (
                  <Card
                    key={server.id}
                    className={cn(
                      'p-3 cursor-pointer transition-colors',
                      binding && 'border-primary',
                    )}
                    onClick={() => {
                      if (binding) {
                        handleDisconnectMCP(binding.id);
                      } else {
                        toggleMCPServer(server.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{server.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {server.description}
                        </div>
                      </div>
                      {binding ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={e => {
                            e.stopPropagation();
                            handleDisconnectMCP(binding.id);
                          }}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={e => {
                            e.stopPropagation();
                            toggleMCPServer(server.id);
                          }}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Temperature: {chatConfig?.temperature || 0.7}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={chatConfig?.temperature || 0.7}
              onChange={(e) => {
                console.log('🌡️ Temperature changed:', e.target.value);
                dispatch({
                  type: 'chat.updateConfig',
                  payload: {
                    sessionId,
                    config: { temperature: parseFloat(e.target.value) },
                  },
                });
              }}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
