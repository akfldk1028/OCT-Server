// components/ChatPageWithMCP.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useStore, useDispatch } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ChatPageWithMCP() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const store = useStore();
  const dispatch = useDispatch();
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4');
  const [selectedServers, setSelectedServers] = useState<string[]>([]);

  // 초기화
  useEffect(() => {
    if (!sessionId) return;

    // AI 세션 초기화
    dispatch({
      type: 'aiMcpIntegration.initializeAISession',
      payload: {
        sessionId,
        model: selectedModel,
        mcpServers: selectedServers,
        tools: [],
      },
    });
  }, [sessionId]);

  // 현재 세션의 MCP 연결 상태
  const mcpConnections = store.aiMcpIntegration?.mcpConnections[sessionId!] || [];
  const chatMessages = store.chat.messages[sessionId!] || [];
  const chatConfig = store.chat.configs[sessionId!];

  // 사용 가능한 MCP 서버 목록
  const availableServers = Object.values(store.mcp_registry.servers);
  const availableModels = Object.values(store.open_router.models);

  // MCP 서버 연결/해제
  const toggleMCPServer = async (serverId: string) => {
    const isConnected = mcpConnections.some(
      c => c.serverId === serverId && c.status === 'connected'
    );

    if (isConnected) {
      await dispatch({
        type: 'aiMcpIntegration.disconnectMCPFromSession',
        payload: { sessionId, serverId },
      });
    } else {
      await dispatch({
        type: 'aiMcpIntegration.connectMCPToSession',
        payload: { sessionId, serverId },
      });
    }
  };

  // 모델 변경
  const changeModel = (model: string) => {
    setSelectedModel(model);
    dispatch({
      type: 'chat.updateConfig',
      payload: {
        sessionId,
        config: { model },
      },
    });
  };

  // 메시지 전송
  const sendMessage = async (content: string) => {
    await dispatch({
      type: 'chat.sendMessage',
      payload: { sessionId, content },
    });
  };

  return (
    <div className="flex h-full">
      {/* 사이드바 - MCP 서버 및 설정 */}
      <aside className="w-80 border-r p-4 space-y-4">
        {/* 모델 선택 */}
        <div>
          <h3 className="text-sm font-semibold mb-2">AI Model</h3>
          <Select value={selectedModel} onValueChange={changeModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ${model.pricing.prompt} / 1K tokens
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* MCP 서버 목록 */}
        <div>
          <h3 className="text-sm font-semibold mb-2">MCP Servers</h3>
          <div className="space-y-2">
            {availableServers.map(server => {
              const connection = mcpConnections.find(c => c.serverId === server.id);
              const isConnected = connection?.status === 'connected';
              
              return (
                <Card
                  key={server.id}
                  className="p-3 cursor-pointer hover:bg-accent"
                  onClick={() => toggleMCPServer(server.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{server.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {server.description}
                      </div>
                    </div>
                    <Badge variant={isConnected ? 'default' : 'outline'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  {connection?.error && (
                    <div className="text-xs text-destructive mt-1">
                      Error: {connection.error}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* 활성 도구 */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Active Tools</h3>
          <div className="flex flex-wrap gap-1">
            {chatConfig?.activeTools.map(tool => (
              <Badge key={tool} variant="secondary">
                {tool}
              </Badge>
            ))}
          </div>
        </div>
      </aside>

      {/* 메인 채팅 영역 */}
      <main className="flex-1 flex flex-col">
        {/* 메시지 영역 */}
        <div className="flex-1 overflow-auto p-4">
          {chatMessages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>

        {/* 입력 영역 */}
        <ChatInput onSend={sendMessage} />
      </main>
    </div>
  );
}

// 사용 예시: 새 채팅 생성 시
const createNewChatWithMCP = async () => {
  // 1. Room 생성
  const roomId = await dispatch({ type: 'room.createRoom', payload: 'AI Chat' });
  
  // 2. Session 생성
  const sessionId = await dispatch({ type: 'session.createSession', payload: roomId });
  
  // 3. Room에 Session 추가
  await dispatch({
    type: 'room.addSessionToRoom',
    payload: { roomId, sessionId }
  });
  
  // 4. AI-MCP 통합 초기화 (선택적으로 MCP 서버 연결)
  await dispatch({
    type: 'aiMcpIntegration.initializeAISession',
    payload: {
      sessionId,
      model: 'openai/gpt-4',
      mcpServers: ['weather-server', 'file-system-server'], // 원하는 MCP 서버
      tools: [],
    }
  });
  
  // 5. 페이지 이동
  navigate(`/chat/${sessionId}`);
};