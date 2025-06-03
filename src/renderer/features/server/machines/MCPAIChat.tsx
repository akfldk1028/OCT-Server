import React, { useEffect, useState } from 'react';
import { useMachine } from '@xstate/react';
import { mcpChatMachine, mcpChatServices } from './machines/mcp-chat-machine';
import { RealtimeChat } from './RealtimeChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Plug, Unplug, Bot, Server } from 'lucide-react';

// MCP 서버 설정 타입
interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  description?: string;
}

// 미리 정의된 MCP 서버들
const AVAILABLE_SERVERS: MCPServerConfig[] = [
  {
    id: 'weather-server',
    name: 'Weather Service',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-weather'],
    description: '날씨 정보를 제공합니다',
  },
  {
    id: 'filesystem-server',
    name: 'File System',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    description: '파일 시스템 작업을 수행합니다',
  },
  {
    id: 'github-server',
    name: 'GitHub API',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    description: 'GitHub 저장소와 상호작용합니다',
  },
];

export function MCPAIChat() {
  const [state, send] = useMachine(mcpChatMachine, {
    services: mcpChatServices,
  });

  const [selectedServer, setSelectedServer] = useState<MCPServerConfig | null>(null);
  const [showServerList, setShowServerList] = useState(false);

  // RealtimeChat 형식으로 메시지 변환
  const chatMessages = state.context.messages.map((msg) => ({
    id: msg.id,
    content: msg.content,
    user: {
      name: msg.role === 'user' ? 'You' : 'AI Assistant',
    },
    createdAt: msg.timestamp,
  }));

  const handleConnect = (server: MCPServerConfig) => {
    send({
      type: 'CONNECT',
      serverId: server.id,
      command: server.command,
      args: server.args,
    });
    setSelectedServer(server);
    setShowServerList(false);
  };

  const handleDisconnect = () => {
    send({ type: 'DISCONNECT' });
    setSelectedServer(null);
  };

  const handleSendMessage = (message: string) => {
    if (state.matches('connected')) {
      send({ type: 'SEND_MESSAGE', content: message });
    }
  };

  // 커스텀 메시지 핸들러를 위한 래퍼
  const customSendMessage = (content: string) => {
    handleSendMessage(content);
  };

  return (
    <div className="flex flex-col h-full w-full gap-4 p-4">
      {/* 상태 헤더 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              MCP AI Assistant
            </CardTitle>
            <div className="flex items-center gap-2">
              {state.matches('connected') && selectedServer && (
                <>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Server className="w-3 h-3" />
                    {selectedServer.name}
                  </Badge>
                  <Badge variant="default" className="flex items-center gap-1">
                    <Plug className="w-3 h-3" />
                    Connected
                  </Badge>
                </>
              )}
              {state.context.availableTools.length > 0 && (
                <Badge variant="secondary">
                  {state.context.availableTools.length} tools available
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {!state.matches('connected') ? (
              <Button
                onClick={() => setShowServerList(!showServerList)}
                className="flex items-center gap-2"
              >
                <Plug className="w-4 h-4" />
                Connect to Server
              </Button>
            ) : (
              <Button
                onClick={handleDisconnect}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Unplug className="w-4 h-4" />
                Disconnect
              </Button>
            )}

            {state.matches('connected') && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => {
                  // 도구 목록 표시 토글
                  console.log('Available tools:', state.context.availableTools);
                }}
              >
                <Settings className="w-4 h-4" />
                View Tools
              </Button>
            )}
          </div>

          {/* 서버 목록 */}
          {showServerList && !state.matches('connected') && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium mb-2">Available Servers:</h4>
              {AVAILABLE_SERVERS.map((server) => (
                <Card
                  key={server.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleConnect(server)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">{server.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          {server.description}
                        </p>
                      </div>
                      <Server className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 에러 표시 */}
          {state.context.error && (
            <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded-md text-sm">
              {state.context.error}
            </div>
          )}

          {/* 상태 표시 */}
          {state.matches('connecting') && (
            <div className="mt-2 text-sm text-muted-foreground">
              Connecting to server...
            </div>
          )}
          {state.matches('processingMessage') && (
            <div className="mt-2 text-sm text-muted-foreground">
              Processing your message...
            </div>
          )}
          {state.matches('waitingForAI') && (
            <div className="mt-2 text-sm text-muted-foreground">
              AI is thinking...
            </div>
          )}
        </CardContent>
      </Card>

      {/* 채팅 인터페이스 */}
      <div className="flex-1 min-h-0">
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            <div className="h-full relative">
              {/* RealtimeChat 컴포넌트 재사용 */}
              <RealtimeChat
                roomName={`mcp-ai-${selectedServer?.id || 'default'}`}
                username="You"
                messages={chatMessages}
                onMessage={(messages) => {
                  // 새 메시지가 추가되었을 때
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.user.name === 'You') {
                    const content = lastMessage.content;
                    // 이미 처리된 메시지인지 확인
                    const alreadyProcessed = state.context.messages.some(
                      (msg) => msg.id === lastMessage.id
                    );
                    if (!alreadyProcessed) {
                      handleSendMessage(content);
                    }
                  }
                }}
              />

              {/* 연결되지 않았을 때 오버레이 */}
              {!state.matches('connected') && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      서버에 연결하여 AI 어시스턴트와 대화를 시작하세요
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 도구 사용 상태 표시 */}
      {state.matches('waitingForAI') && state.context.pendingMessage && (
        <Card className="absolute bottom-20 right-4 w-64">
          <CardContent className="p-3">
            <div className="text-sm">
              <div className="font-medium mb-1">AI가 응답 중...</div>
              {/* 도구 사용 중인 경우 표시 */}
              <div className="text-xs text-muted-foreground">
                메시지를 분석하고 필요한 도구를 사용하고 있습니다.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
