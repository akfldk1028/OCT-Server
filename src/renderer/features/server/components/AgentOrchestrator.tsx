import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/renderer/common/components/ui/card';
import { Button } from '@/renderer/common/components/ui/button';
import { Badge } from '@/renderer/common/components/ui/badge';
import { Separator } from '@/renderer/common/components/ui/separator';
import { Input } from '@/renderer/common/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/renderer/common/components/ui/select';
import { Textarea } from '@/renderer/common/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/renderer/common/components/ui/tabs';
import { ScrollArea } from '@/renderer/common/components/ui/scroll-area';
import { useStore } from 'zustand';
import { combinedStore } from '@/main/stores/combinedStore';

const AgentOrchestrator: React.FC = () => {
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [agentName, setAgentName] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [conversationAgents, setConversationAgents] = useState<string[]>([]);

  // 🔗 기존 OCT 시스템 상태 가져오기
  const agentOrchestrator = useStore(combinedStore, (state) => state.agentOrchestrator);
  const openrouter = useStore(combinedStore, (state) => state.open_router);
  const mcpRegistry = useStore(combinedStore, (state) => state.mcp_registry);

  // 모델 목록 (OpenRouter에서)
  const availableModels = Object.values(openrouter.models);
  
  // MCP 서버 목록
  const availableServers = Object.values(mcpRegistry.servers);

  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    // 상태 주기적 업데이트
    const interval = setInterval(() => {
      setStatus(agentOrchestrator.getStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, [agentOrchestrator]);

  // === Agent 생성 ===
  const handleCreateAgent = async () => {
    if (!selectedPersona) return;

    try {
      const agentId = await agentOrchestrator.createAgent(selectedPersona, {
        name: agentName || undefined,
        model: selectedModel || undefined,
        initialPrompt: customPrompt || undefined,
        mcpServers: [] // 나중에 추가 가능
      });

      console.log(`✅ Agent created: ${agentId}`);
      setAgentName('');
      setCustomPrompt('');
    } catch (error) {
      console.error('❌ Failed to create agent:', error);
    }
  };

  // === Agent에게 메시지 전송 ===
  const handleSendMessage = async (agentId: string, message: string) => {
    try {
      await agentOrchestrator.sendMessageToAgent(agentId, message);
      console.log(`💬 Message sent to agent ${agentId}`);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    }
  };

  // === Multi-Agent 대화 생성 ===
  const handleCreateConversation = async () => {
    if (conversationAgents.length < 2) return;

    try {
      const conversationId = await agentOrchestrator.createConversation(conversationAgents);
      console.log(`🗣️ Conversation created: ${conversationId}`);
      setConversationAgents([]);
    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
    }
  };

  // === MCP 서버 연결 ===
  const handleConnectMCP = async (agentId: string, serverId: string) => {
    try {
      await agentOrchestrator.connectMCPToAgent(agentId, serverId);
      console.log(`🔗 MCP server ${serverId} connected to agent ${agentId}`);
    } catch (error) {
      console.error('❌ Failed to connect MCP server:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* 🎯 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">🤖 Agent Orchestrator</h1>
        <p className="text-gray-600 mt-2">
          기존 OCT 시스템과 완전히 연동되는 Multi-Agent 관리 도구
        </p>
      </div>

      {/* 📊 현재 상태 */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle>📊 현재 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{status.agents.total}</p>
                <p className="text-sm text-gray-600">전체 Agents</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{status.conversations.total}</p>
                <p className="text-sm text-gray-600">대화 세션</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{status.personas.total}</p>
                <p className="text-sm text-gray-600">페르소나</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="create">🎭 Agent 생성</TabsTrigger>
          <TabsTrigger value="manage">🤖 Agent 관리</TabsTrigger>
          <TabsTrigger value="conversation">🗣️ Multi-Agent 대화</TabsTrigger>
          <TabsTrigger value="collaboration">🤝 자동 협력</TabsTrigger>
          <TabsTrigger value="tools">🔧 도구 연결</TabsTrigger>
        </TabsList>

        {/* === Agent 생성 탭 === */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🎭 새 Agent 생성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 페르소나 선택 */}
              <div>
                <label className="block text-sm font-medium mb-2">페르소나 선택</label>
                <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                  <SelectTrigger>
                    <SelectValue placeholder="페르소나를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentOrchestrator.personas.map((persona) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: persona.color }}
                          />
                          {persona.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent 이름 */}
              <div>
                <label className="block text-sm font-medium mb-2">Agent 이름 (선택사항)</label>
                <Input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="기본값: 페르소나 이름"
                />
              </div>

              {/* 모델 선택 */}
              <div>
                <label className="block text-sm font-medium mb-2">AI 모델 (선택사항)</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="기본 모델 사용" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.slice(0, 10).map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 커스텀 프롬프트 */}
              <div>
                <label className="block text-sm font-medium mb-2">추가 지시사항 (선택사항)</label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="이 agent에게 특별한 지시사항이나 역할을 추가로 설명해주세요..."
                  rows={3}
                />
              </div>

              <Button onClick={handleCreateAgent} className="w-full" disabled={!selectedPersona}>
                🤖 Agent 생성
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Agent 관리 탭 === */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🤖 활성 Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {Object.values(agentOrchestrator.activeAgents).map((agent) => {
                    const persona = agentOrchestrator.getPersona(agent.personaId);
                    return (
                      <Card key={agent.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: persona?.color || '#gray' }}
                              />
                              <h3 className="font-semibold">{agent.name}</h3>
                              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                                {agent.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{persona?.description}</p>
                            <p className="text-xs text-gray-500">
                              메시지: {agent.messageCount} | 모델: {agent.model}
                            </p>
                            <p className="text-xs text-gray-500">
                              MCP 서버: {agent.connectedMCPServers.length}개 연결됨
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSendMessage(agent.id, "안녕하세요! 테스트 메시지입니다.")}
                            >
                              💬 테스트 메시지
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => agentOrchestrator.removeAgent(agent.id)}
                            >
                              🗑️ 제거
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  {Object.keys(agentOrchestrator.activeAgents).length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      활성 Agent가 없습니다. 새 Agent를 생성해보세요!
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Multi-Agent 대화 탭 === */}
        <TabsContent value="conversation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🗣️ Multi-Agent 대화 생성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">참여할 Agents 선택</label>
                <div className="space-y-2">
                  {Object.values(agentOrchestrator.activeAgents).map((agent) => {
                    const persona = agentOrchestrator.getPersona(agent.personaId);
                    const isSelected = conversationAgents.includes(agent.id);
                    
                    return (
                      <div 
                        key={agent.id}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setConversationAgents(prev => prev.filter(id => id !== agent.id));
                          } else {
                            setConversationAgents(prev => [...prev, agent.id]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: persona?.color || '#gray' }}
                          />
                          <span className="font-medium">{agent.name}</span>
                          {isSelected && <Badge>선택됨</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button 
                onClick={handleCreateConversation} 
                className="w-full"
                disabled={conversationAgents.length < 2}
              >
                🗣️ 대화 시작 ({conversationAgents.length}명 선택됨)
              </Button>
            </CardContent>
          </Card>

          {/* 활성 대화 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>활성 대화</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.values(agentOrchestrator.conversations).map((conv) => (
                  <div key={conv.id} className="p-3 border rounded">
                    <h4 className="font-medium">{conv.name}</h4>
                    <p className="text-sm text-gray-600">
                      참여자: {conv.agentIds.length}명 | 메시지: {conv.messages.length}개
                    </p>
                  </div>
                ))}
                {Object.keys(agentOrchestrator.conversations).length === 0 && (
                  <p className="text-center text-gray-500 py-4">활성 대화가 없습니다.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === 자동 협력 탭 === */}
        <TabsContent value="collaboration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🤝 자동 Multi-Agent 협력</CardTitle>
              <p className="text-sm text-gray-600">
                여러 전문가 Agent들이 자동으로 협력하여 복잡한 작업을 해결합니다
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 작업 설명 입력 */}
              <div>
                <label className="block text-sm font-medium mb-2">협력할 작업 설명</label>
                <Textarea
                  placeholder="예: React 로그인 페이지를 만들어주세요. 보안, 디자인, 테스트를 모두 고려해주세요."
                  rows={3}
                  className="w-full"
                />
              </div>

              {/* 참여 Agent 선택 */}
              <div>
                <label className="block text-sm font-medium mb-2">협력에 참여할 전문가들</label>
                <div className="grid grid-cols-2 gap-3">
                  {agentOrchestrator.personas.map((persona) => (
                    <div 
                      key={persona.id}
                      className="flex items-center space-x-2 p-3 border rounded cursor-pointer hover:bg-gray-50"
                    >
                      <input 
                        type="checkbox" 
                        id={`collab-${persona.id}`}
                        className="rounded"
                      />
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: persona.color }}
                      />
                      <label 
                        htmlFor={`collab-${persona.id}`}
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        {persona.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 협력 설정 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">최대 라운드</label>
                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2라운드 (빠른 협력)</SelectItem>
                      <SelectItem value="3">3라운드 (표준)</SelectItem>
                      <SelectItem value="5">5라운드 (심화 협력)</SelectItem>
                      <SelectItem value="7">7라운드 (완전 분석)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">협력 모드</label>
                  <Select defaultValue="auto">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">🤖 완전 자동</SelectItem>
                      <SelectItem value="guided">👤 단계별 확인</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 협력 시작 버튼 */}
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => {
                  console.log('🚀 자동 협력 시작!');
                  // 실제 협력 로직 호출
                }}
              >
                🚀 협력 작업 시작
              </Button>
            </CardContent>
          </Card>

          {/* 진행 중인 협력 작업들 */}
          <Card>
            <CardHeader>
              <CardTitle>📊 진행 중인 협력 작업</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 예시 진행 중인 작업 */}
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-blue-900">React 대시보드 개발</h4>
                    <Badge className="bg-blue-100 text-blue-800">진행 중</Badge>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    코딩 어시스턴트, UI 디자이너, QA 테스터가 협력 중...
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-blue-600">
                    <span>라운드: 2/5</span>
                    <span>메시지: 12개</span>
                    <span>참여자: 3명</span>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline">📋 상태 보기</Button>
                    <Button size="sm" variant="outline">💬 대화 참여</Button>
                    <Button size="sm" variant="outline">📄 요약 생성</Button>
                  </div>
                </div>

                {/* 협력 작업이 없을 때 */}
                <div className="text-center py-8 text-gray-500">
                  <p>현재 진행 중인 협력 작업이 없습니다.</p>
                  <p className="text-sm">위에서 새로운 협력 작업을 시작해보세요!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 협력 작업 히스토리 */}
          <Card>
            <CardHeader>
              <CardTitle>📚 완료된 협력 작업</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 예시 완료된 작업 */}
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">API 문서화 프로젝트</h4>
                    <Badge variant="secondary">완료됨</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    기술 문서 작성자, 코딩 어시스턴트, QA 테스터의 협력 결과
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>완료일: 2024-01-15</span>
                    <span>총 메시지: 28개</span>
                    <span>참여자: 3명</span>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline">📄 결과 보기</Button>
                    <Button size="sm" variant="outline">🔄 재실행</Button>
                  </div>
                </div>

                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">더 많은 협력 작업을 완료하면 여기에 표시됩니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === 도구 연결 탭 === */}
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔧 MCP 서버 연결</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(agentOrchestrator.activeAgents).map((agent) => {
                  const persona = agentOrchestrator.getPersona(agent.personaId);
                  
                  return (
                    <Card key={agent.id} className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: persona?.color || '#gray' }}
                        />
                        <h4 className="font-medium">{agent.name}</h4>
                        <Badge>{agent.connectedMCPServers.length}개 연결</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {availableServers.map((server) => {
                          const isConnected = agent.connectedMCPServers.includes(server.id);
                          
                          return (
                            <Button
                              key={server.id}
                              size="sm"
                              variant={isConnected ? "default" : "outline"}
                              onClick={() => {
                                if (isConnected) {
                                  agentOrchestrator.disconnectMCPFromAgent(agent.id, server.id);
                                } else {
                                  handleConnectMCP(agent.id, server.id);
                                }
                              }}
                            >
                              {isConnected ? '🔗' : '🔌'} {server.name}
                            </Button>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
                
                {Object.keys(agentOrchestrator.activeAgents).length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Agent를 먼저 생성해주세요.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentOrchestrator; 