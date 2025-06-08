// components/ChatRoom.tsx
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router';
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
import type { ServerLayoutContext } from '../types/server-types';
import { useChatScroll } from '@/hooks/use-chat-scroll';
import { useWorkflowExecution } from '../hook/useWorkflowExecution';
import type { WorkflowExecutionConfig } from '../types/workflow.types';

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
            isUser && 'bg-yellow-400 text-black rounded-br-md',
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
            'text-xs mt-2 opacity-60 transition-opacity',
            isUser ? 'text-black/90 drop-shadow-sm' : 'text-muted-foreground'
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

  // 🔥 useOutletContext로 userId 받기
  const { servers, clients, userId } = useOutletContext<ServerLayoutContext>();

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // 🔥 워크플로우 실행 훅 사용
  const { 
    executionState, 
    executeWorkflow, 
    cleanupWorkflow, 
    resetExecution 
  } = useWorkflowExecution();

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

  // 🔥 이제 useOutletContext에서 userId를 직접 받으므로 별도 조회 불필요
  // console.log('👤 [ChatRoom] 현재 사용자 ID (context):', userId);

  // 🚀 워크플로우 실행 상태 추적
  const activeWorkflowExecutions = store.workflow?.executions ? 
    Object.values(store.workflow.executions).filter(exec => exec.status === 'running') : [];
  
  // console.log('🔧 [ChatRoom] 활성 워크플로우 실행:', activeWorkflowExecutions.length, '개');


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
    console.log('🔌 [toggleMCPServer] 시작:', {
      serverId,
      sessionId,
      timestamp: new Date().toISOString()
    });

    try {
      const existingBinding = mcpBindings.find(
        (b) => b.serverId === serverId && b.status === 'active',
      );

      console.log('🔍 [toggleMCPServer] 기존 바인딩 확인:', {
        serverId,
        existingBinding: existingBinding ? {
          id: existingBinding.id,
          status: existingBinding.status,
          clientId: existingBinding.clientId
        } : null,
        allBindings: mcpBindings.map(b => ({
          serverId: b.serverId,
          status: b.status,
          id: b.id
        }))
      });

      if (existingBinding) {
        console.log('🔴 [toggleMCPServer] 기존 연결 해제 중...');
        const disconnectResult = await dispatch({
          type: 'mcp_coordinator.disconnectMCPFromSession',
          payload: { sessionId, bindingId: existingBinding.id },
        });
        console.log('✅ [toggleMCPServer] 연결 해제 완료:', disconnectResult);
      } else {
        console.log('🟢 [toggleMCPServer] 새 연결 시작...');
        
        // 서버 정보 확인
        const serverInfo = store.mcp_registry?.servers[serverId];
        console.log('🔧 [toggleMCPServer] 서버 정보:', {
          serverId,
          serverExists: !!serverInfo,
          serverData: serverInfo ? {
            name: serverInfo.name,
            command: serverInfo.command,
            args: serverInfo.args,
            transportType: serverInfo.transportType,
            status: serverInfo.status
          } : null
        });
        
        if (!serverInfo) {
          throw new Error(`서버 ${serverId}가 Registry에 등록되지 않았습니다.`);
        }
        
        // 🔥 MCP Coordinator가 Transport 생성부터 연결까지 모두 처리함
        // (서버 상태가 disconnected여도 connectMCPToSession에서 자동으로 처리)
        console.log('📡 [toggleMCPServer] MCP Coordinator에 연결 요청...');
        const connectResult = await dispatch({
          type: 'mcp_coordinator.connectMCPToSession',
          payload: { sessionId, serverId },
        });
        
        console.log('✅ [toggleMCPServer] 연결 요청 완료:', {
          connectResult,
          bindingId: connectResult
        });
        let attempts = 0;
        const maxAttempts = 50; // 5초 (100ms * 50)
        let connectionSuccessful = false;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
          
          // 바인딩이 생성되었는지 확인
          const newBinding = mcpBindings.find(binding => 
            binding.serverId === serverId && binding.status === 'active'
          );
          
          // 도구가 등록되었는지 확인
          const serverTools = store.mcp_registry ? Object.values(store.mcp_registry.tools || {})
            .filter(tool => tool.serverId === serverId) : [];
          
          if (newBinding && serverTools.length > 0) {
            console.log('🎉 [toggleMCPServer] 연결 및 도구 등록 완료!', {
              serverId,
              bindingId: newBinding.id,
              toolsCount: serverTools.length,
              tools: serverTools.map(t => t.name)
            });
            connectionSuccessful = true;
            break;
          }
          
          attempts++;
          if (attempts % 10 === 0) { // 1초마다 로그
            console.log(`⏳ [toggleMCPServer] 대기 중... ${attempts/10}초`);
          }
        }
        
        if (!connectionSuccessful) {
          console.warn('⚠️ [toggleMCPServer] 연결 대기 시간 초과, 그래도 계속 진행');
        }
        
        // 🔥 서버를 autoConnect로 설정하여 향후 자동 연결되도록 함
        try {
          await dispatch({
            type: 'mcp_registry.updateServerStatus',
            payload: { 
              serverId, 
              status: 'connected',
              options: { autoConnect: true }  // 🔥 자동 연결 활성화
            }
          });
          console.log('🔥 [toggleMCPServer] autoConnect 활성화됨:', serverId);
        } catch (error) {
          console.warn('⚠️ [toggleMCPServer] autoConnect 설정 실패:', error);
        }
        
        // 🔥 최종 상태 확인
        const finalServerInfo = store.mcp_registry?.servers[serverId];
        const finalServerTools = store.mcp_registry ? Object.values(store.mcp_registry.tools || {})
          .filter(tool => tool.serverId === serverId) : [];
                 const finalBinding = mcpBindings.find(binding => 
           binding.serverId === serverId && binding.status === 'active'
         );
        
                 console.log('🔍 [toggleMCPServer] 최종 상태:', {
           serverId,
           serverStatus: finalServerInfo?.status,
           autoConnect: finalServerInfo?.autoConnect,
           toolsCount: finalServerTools.length,
           tools: finalServerTools.map(t => t.name),
           id: finalBinding?.id,
           hasBinding: !!finalBinding,
           connectionSuccessful
         });
      }
    } catch (error) {
      console.error('❌ [toggleMCPServer] 실패:', {
        serverId,
        sessionId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        timestamp: new Date().toISOString()
      });
      
      // 에러를 다시 던지지 않고 로그만 남김 (상위에서 처리)
      throw error;
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

  // 🔥 깔끔하게 리팩토링된 워크플로우 실행 핸들러
  const handleLoadWorkflow = async (workflowData: any) => {
    // 🔥 디버깅: 함수 호출 확인
    console.log('🎯🎯🎯 [handleLoadWorkflow] 함수 호출됨!!! 🎯🎯🎯');
    console.log('🎯 [handleLoadWorkflow] workflowData:', workflowData);
    
    try {
      if (!workflowData?.nodes?.length) {
        console.warn('⚠️ [handleLoadWorkflow] 워크플로우 노드가 없음');
        return;
      }

      console.log('🔥 [handleLoadWorkflow] 워크플로우 실행 시작:', workflowData.name);

      // 🔥 기존 서버들 정리 (기존 함수 그대로 사용)
      await cleanupPreviousWorkflowServers();

      // 서버 노드들만 필터링하고 InstalledServer 타입으로 변환
      const serverNodes = workflowData.nodes
        .filter((node: any) => node.type === 'server')
        .map((node: any) => node.data)
        .filter((data: any) => data && data.mcp_servers);

      if (serverNodes.length === 0) {
        console.warn('⚠️ [handleLoadWorkflow] 서버 노드가 없음');
        return;
      }

      // 워크플로우 실행 설정
      const executionConfig: WorkflowExecutionConfig = {
        workflowData,
        selectedServers: serverNodes,
        onProgress: (progress) => {
          console.log(`📊 [handleLoadWorkflow] 진행률: ${progress}%`);
        },
        onComplete: async (results) => {
          console.log('🎉 [handleLoadWorkflow] 워크플로우 실행 완료:', results);
          
          // 각 성공한 서버를 채팅 세션에 연결
          const connectedServers: string[] = [];
          const failedServers: string[] = [];
          
          for (const result of results) {
            if (result.success) {
              try {
                // 🔥 성공한 서버를 채팅 세션에 연결 (toggleMCPServer가 연결 완료까지 보장)
                await toggleMCPServer(result.serverId);
                
                // 🔥 toggleMCPServer가 이미 연결 완료를 보장하므로 단순히 상태만 확인
                const updatedBindings = store.mcp_coordinator?.sessionBindings[sessionId!] || [];
                const isConnected = updatedBindings.some(b => 
                  b.serverId === result.serverId && b.status === 'active'
                );
                
                if (isConnected) {
                  connectedServers.push(result.serverName);
                  console.log('✅ [handleLoadWorkflow] 채팅 연결 완료:', result.serverName);
                } else {
                  failedServers.push(result.serverName);
                  console.warn('⚠️ [handleLoadWorkflow] 채팅 연결 실패:', result.serverName);
                }
              } catch (connectionError) {
                failedServers.push(result.serverName);
                console.warn('⚠️ [handleLoadWorkflow] 채팅 연결 오류:', result.serverName, connectionError);
              }
            } else {
              failedServers.push(result.serverName);
            }
          }
          
          // 채팅에 결과 메시지 추가
          if (sessionId) {
            let resultMessage = `🔧 워크플로우 "${workflowData.name}" 로드 완료!\n\n`;
            resultMessage += `📝 설명: ${workflowData.description || '설명 없음'}\n`;
            resultMessage += `📊 총 노드 수: ${workflowData.nodes?.length || 0}개\n`;
            resultMessage += `🖥️ 서버 노드 수: ${serverNodes.length}개\n\n`;
            
            if (connectedServers.length > 0) {
              resultMessage += `✅ **연결된 MCP 서버들** (${connectedServers.length}개):\n`;
              connectedServers.forEach(serverName => {
                resultMessage += `  🔗 ${serverName}\n`;
              });
              resultMessage += `\n💡 이제 채팅에서 이 서버들의 도구를 바로 사용할 수 있습니다!\n`;
            }
            
            if (failedServers.length > 0) {
              resultMessage += `\n⚠️ **연결 실패** (${failedServers.length}개):\n`;
              failedServers.forEach(serverName => {
                resultMessage += `  ❌ ${serverName}\n`;
              });
              resultMessage += `\n🔧 실패한 서버들은 설정을 확인해주세요.`;
            }
            
            await dispatch({
              type: 'chat.addMessage',
              payload: {
                sessionId,
                message: {
                  id: `workflow-loaded-${Date.now()}`,
                  role: 'system',
                  content: resultMessage,
                  timestamp: new Date().toISOString(),
                  metadata: {
                    type: 'workflow_loaded',
                    workflowData,
                    connectedServers,
                    failedServers,
                    serverCount: serverNodes.length
                  }
                }
              }
            });
          }
          
          setShowWorkflowModal(false);
          setTimeout(() => scrollToBottom(), 100);
        },
        onError: async (error) => {
          console.error('❌ [handleLoadWorkflow] 워크플로우 실행 실패:', error);
          
          if (sessionId) {
            await dispatch({
              type: 'chat.addMessage',
              payload: {
                sessionId,
                message: {
                  id: `workflow-error-${Date.now()}`,
                  content: `❌ 워크플로우 실행 중 오류 발생: ${error.message}`,
                  role: 'system',
                  timestamp: new Date().toISOString(),
                  metadata: {
                    type: 'workflow-error',
                    error: error.message
                  }
                }
              }
            });
          }
        }
      };

      // 워크플로우 실행
      await executeWorkflow(executionConfig);

    } catch (error) {
      console.error('❌ [handleLoadWorkflow] 전체 실행 실패:', error);
    }
  };

  // 🧹 기존 워크플로우 서버들 정리 (새 워크플로우 로드 시) - 기존 로직 유지
  const cleanupPreviousWorkflowServers = async () => {
    try {
      console.log('🧹 [cleanupPreviousWorkflowServers] 시작...');
      
      // 현재 등록된 서버들 중 워크플로우 서버들 찾기 (id가 "workflow-"로 시작)
      const currentServers = Object.values(store.mcp_registry?.servers || {});
      const workflowServerIds = currentServers
        .filter(server => server.id.startsWith('workflow-'))
        .map(server => server.id);
      
      if (workflowServerIds.length === 0) {
        console.log('🧹 [cleanupPreviousWorkflowServers] 정리할 서버 없음');
        return;
      }
      
      console.log('🧹 [cleanupPreviousWorkflowServers] 정리할 서버:', workflowServerIds.length, '개');
      
      // 1️⃣ 세션에서 연결 해제
      for (const serverId of workflowServerIds) {
        try {
          const existingBinding = mcpBindings.find(
            (b) => b.serverId === serverId && b.status === 'active'
          );
          
          if (existingBinding) {
            console.log('🔌 [cleanupPreviousWorkflowServers] 세션 연결 해제:', serverId);
            await dispatch({
              type: 'mcp_coordinator.disconnectMCPFromSession',
              payload: { sessionId, bindingId: existingBinding.id },
            });
          }
        } catch (disconnectError) {
          console.warn('⚠️ [cleanupPreviousWorkflowServers] 세션 연결 해제 실패:', serverId, disconnectError);
        }
      }
      
      // 2️⃣ Registry에서 서버 제거 (도구, 프롬프트, 리소스도 함께 정리됨)
      for (const serverId of workflowServerIds) {
        try {
          console.log('🗑️ [cleanupPreviousWorkflowServers] Registry에서 제거:', serverId);
          await dispatch({
            type: 'mcp_registry.unregisterServer',
            payload: serverId
          });
        } catch (unregisterError) {
          console.warn('⚠️ [cleanupPreviousWorkflowServers] Registry 제거 실패:', serverId, unregisterError);
        }
      }
      
      console.log('✅ [cleanupPreviousWorkflowServers] 정리 완료');
      
    } catch (error) {
      console.warn('⚠️ [cleanupPreviousWorkflowServers] 실패:', error);
      // 정리 실패해도 새 워크플로우 로드는 계속 진행
    }
  };

  const executeMCPAction = async (tag: Tag): Promise<string> => {
    if (!sessionId) throw new Error('세션이 없습니다');
    
    switch (tag.type) {
      case 'tool':
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


  return (
    <div className="min-h-screen w-full flex">
      {/* Main Chat Container */}
      <div className="flex-1 max-w-5xl mx-auto flex flex-col h-screen">
        {/* Minimal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{room.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-500">Live</span>
                {mcpBindings.filter((b) => b.status === 'active').length > 0 && (
                  <span className="text-sm text-blue-600 font-medium">
                    • {mcpBindings.filter((b) => b.status === 'active').length} tools connected
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-2">
              <Select
                value={chatConfig?.model}
                onValueChange={(value) => changeModel(value)}
              >
                <SelectTrigger className="border-0 bg-transparent text-sm font-medium focus:ring-0 shadow-none">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.slice(0, 5).map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name.split('/').pop()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Action Buttons */}
            <button
              onClick={() => setShowWorkflowModal(true)}
              className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center transition-colors"
              title="Connect workflow"
            >
              <Workflow className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto px-8 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-r from-blue-400 to-purple-600 rounded-3xl flex items-center justify-center">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Start a conversation
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  Ask me anything or try one of these suggestions
                  {mcpBindings.filter((b) => b.status === 'active').length > 0 && (
                    <span className="block mt-2 text-sm text-blue-600 font-medium">
                      ✨ {mcpBindings.filter((b) => b.status === 'active').length} powerful tools are ready to help
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {[
                    { text: "👋 Say hello", message: "Hello! How are you today?" },
                    { text: "🌤️ Weather", message: "What's the weather like?" },
                    { text: "💻 Coding help", message: "I need help with coding" },
                    ...(mcpBindings.filter((b) => b.status === 'active').length > 0 ? [
                      { text: "🔧 Use tools", message: "Use the connected tools to help me with a task" }
                    ] : [])
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(suggestion.message)}
                      className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => <MessageItem key={msg.id} message={msg} />)}
              
              {isStreaming && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 inline-block">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-500">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-6">
          <div className="max-w-3xl mx-auto">
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
      </div>

      {/* Settings Sidebar - Slide over */}
      {showSettings && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setShowSettings(false)}
          />
          <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform">
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
          </div>
        </>
      )}

      {/* Workflow Modal */}
      <WorkflowListModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onLoadWorkflow={handleLoadWorkflow}
        userId={userId}
        filterClientType="local"
        title="🔧 Connect Workflow"
        description="Load a workflow and automatically connect MCP servers to your chat"
      />
    </div>
  );
}
