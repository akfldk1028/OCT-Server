// components/ChatRoom.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router';
import { useStore, useDispatch } from '@/hooks/useStore';
import { Button } from '@/renderer/common/components/ui/button';
import { Card } from '@/renderer/common/components/ui/card';
import { Input } from '@/renderer/common/components/ui/input';
import ChatInput from './ChatInput';
import ChatHeader from '../components/Chat/ChatHeader';
import ChatMessages from '../components/Chat/ChatMessages';
import EmptyState from '../components/Chat/EmptyState';
import ChatSidebar from '../components/Chat/ChatSidebar';
import WorkflowListModal from '../components/Flow/WorkflowListModal';
import { useWorkflowExecution } from '../components/Chat/hooks/useWorkflowExecution';
import type { WorkflowExecutionConfig } from '../types/workflow.types';
import type { Tag } from '../components/Chat/TagInput';
import type { ServerLayoutContext } from '../types/server-types';
import { useChatScroll } from '@/hooks/use-chat-scroll';

// 🔥 새로 분리된 훅들 import
import {
  useCooperativeClients,
  useOverlayGuide,
  useChatData,
  useMCPServer,
  useTagManager,
  useChatMessage
} from '../components/Chat/hooks';

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
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  
  // 🔥 Overlay 모드 상태 관리
  const [overlayMode, setOverlayMode] = useState<'chat' | 'overlay'>('chat');

  // 🔥 새로 분리된 훅들 사용
  const { 
    aiClientId, 
    overlayClientId, 
    clientsStatus, 
    setClientsStatus 
  } = useCooperativeClients(sessionId);

  const { triggerOverlayGuide } = useOverlayGuide(sessionId);

  const {
    session,
    room,
    messages,
    chatConfig,
    mcpBindings,
    activeWorkflowExecutions,
    availableModels,
    availableServers,
    activeTools,
    availableTools,
    availablePrompts,
    availableResources
  } = useChatData(sessionId);

  const { toggleMCPServer, handleDisconnectMCP } = useMCPServer(sessionId);

  const {
    selectedTags,
    addTag,
    removeTag,
    clearTags,
    executeMCPAction
  } = useTagManager();

  // 🔥 워크플로우 실행 훅 사용
  const { 
    executionState, 
    executeWorkflow, 
    cleanupWorkflow, 
    resetExecution 
  } = useWorkflowExecution();

  // 📜 자동 스크롤 - 간단한 훅 사용
  const { containerRef, scrollToBottom } = useChatScroll();

  // 🔥 메시지 전송 훅 사용 (scrollToBottom 이후에 정의)
  const { 
    sendMessage, 
    changeModel 
  } = useChatMessage({
    sessionId,
    overlayMode,
    selectedTags,
    isStreaming,
    setIsStreaming,
    setSelectedTags: clearTags, // useTagManager의 clearTags 사용
    setInput,
    scrollToBottom,
    setClientsStatus
  });

  // 🔄 메시지 변경시 자동 스크롤 (강화된 버전)
  useEffect(() => {
    console.log('🔄 [RealtimeChat] 스크롤 useEffect 트리거됨!', {
      messagesLength: messages.length,
      isStreaming,
      lastMessageId: messages[messages.length - 1]?.id
    });
    
    // 메시지가 있을 때만 스크롤 실행
    if (messages.length > 0) {
      // 여러 단계로 스크롤 시도 (확실하게!)
      const scrollAttempts = [
        () => scrollToBottom(), // 즉시
        () => setTimeout(() => scrollToBottom(), 50), // 50ms 후
        () => setTimeout(() => scrollToBottom(), 100), // 100ms 후
        () => setTimeout(() => scrollToBottom(), 200), // 200ms 후
      ];
      
      // 모든 스크롤 시도 실행
      scrollAttempts.forEach(attempt => {
        requestAnimationFrame(() => {
          attempt();
        });
      });
      
      // 정리
      return () => {
        // 타임아웃들이 정리되도록 (최신 것만 유지)
      };
    }
  }, [messages, isStreaming, scrollToBottom]); // 🔥 messages 전체를 의존성으로!

  // 🔥 스마트 협업 메시지 전송 (AI 주도 협업 버전) - 오버레이 기능 복구!
  const sendCooperativeMessage = useCallback(async (content: string, forceOverlay: boolean = false) => {
    if (!sessionId) return;

    try {
      setClientsStatus({ 
        ai: 'thinking', 
        overlay: forceOverlay ? 'analyzing' : 'idle' 
      });
      console.log('🤖👁️ [RealtimeChat] AI 주도 협업 메시지 처리 시작:', { content, forceOverlay });

      // 🔥 오버레이 모드가 활성화된 경우 chatStore.sendOverlayMessage 사용!
      if (forceOverlay) {
        console.log('👁️ [sendCooperativeMessage] 오버레이 모드 - chatStore.sendOverlayMessage 호출');
        
        try {
          setClientsStatus(prev => ({ ...prev, overlay: 'analyzing' }));
          
          // 🎯 chatStore.sendOverlayMessage 사용 (오버레이 기능 통합!)
          await dispatch({
            type: 'chat.sendOverlayMessage',
            payload: {
              sessionId,
              content: content,
              selectedTags,
              triggerOverlay: true // 🔥 오버레이 트리거 활성화!
            }
          });
          
          console.log('✅ [sendCooperativeMessage] 오버레이 메시지 완료!');
          setClientsStatus(prev => ({ ...prev, overlay: 'idle' }));
          
        } catch (overlayError) {
          console.error('❌ [sendCooperativeMessage] 오버레이 메시지 실패:', overlayError);
          setClientsStatus(prev => ({ ...prev, overlay: 'idle' }));
          
          // 폴백: 일반 메시지로 전송
          await dispatch({
            type: 'chat.sendStreamingMessage',
            payload: {
              sessionId,
              content: content,
              selectedTags,
            }
          });
        }
      } else {
        // 🤖 일반 AI 메시지 (오버레이 없음)
        console.log('🤖 [sendCooperativeMessage] 일반 AI 메시지 전송');
        
        try {
          await dispatch({
            type: 'chat.sendStreamingMessage',
            payload: {
              sessionId,
              content: content,
              selectedTags,
            }
          });
          
          console.log('✅ [RealtimeChat] AI 메시지 전송 완료!');
          
        } catch (error) {
          console.error('❌ [sendCooperativeMessage] AI 메시지 전송 실패:', error);
          
          // 🔧 fallback: 기본 메시지 전송
          await dispatch({
            type: 'chat.sendMessage',
            payload: {
              sessionId,
              content: content,
            }
          });
        }
      }

    } catch (error) {
      console.error('❌ [sendCooperativeMessage] 전체 처리 실패:', error);
    } finally {
      setClientsStatus({ ai: 'idle', overlay: 'idle' });
    }
  }, [sessionId, availableTools, selectedTags, dispatch]);

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
    <div className="w-full flex h-full">
      {/* Main Chat Container */}
      <div className="flex-1 w-full flex flex-col h-full"> {/* 🔥 타이틀바 고려해서 h-full 사용 */}
        {/* Header */}
        <ChatHeader 
          roomName={room.name}
          sessionId={sessionId!} // 🔥 sessionId prop 전달
          aiClientId={aiClientId}
          overlayClientId={overlayClientId}
          clientsStatus={clientsStatus}
          mcpBindingsCount={mcpBindings.filter((b) => b.status === 'active').length}
          overlayMode={overlayMode}
          setOverlayMode={setOverlayMode}
          triggerOverlayGuide={triggerOverlayGuide}
          currentModel={chatConfig?.model}
          availableModels={availableModels}
          onModelChange={changeModel}
          onWorkflowClick={() => setShowWorkflowModal(true)}
          onSettingsClick={() => setShowSettings(!showSettings)}
        />

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                onShowWorkflow={() => setShowWorkflowModal(true)}
                onShowSettings={() => setShowSettings(true)}
                mcpToolsCount={availableTools.length}
                onStartChat={(message) => sendMessage(message)}
                currentModel={chatConfig?.model || 'openai/gpt-4'}
                connectedServers={mcpBindings
                  .filter(b => b.status === 'active')
                  .map(b => {
                    const server = availableServers.find(s => s.id === b.serverId);
                    return server?.name || b.serverId;
                  })
                }
              />
            </div>
          ) : (
            <ChatMessages
            ref={containerRef}
            messages={messages}
            mcpBindingsCount={mcpBindings.filter((b) => b.status === 'active').length}
            onSendMessage={sendMessage}
            isStreaming={isStreaming}
            aiClientId={aiClientId}
            overlayClientId={overlayClientId}
            clientsStatus={clientsStatus}
          />
          )}
        </div>

        {/* Chat Input - 항상 보이는 하단 고정 */}
        <div className="flex-shrink-0 border-t border-border bg-background">
          <div className="p-4">
            <ChatInput 
              onSend={sendMessage} 
              isStreaming={isStreaming} 
              activeTools={activeTools}
              selectedTags={selectedTags}
              onTagRemove={removeTag}
              onExecuteMCPAction={(tag: Tag) => executeMCPAction(tag, sessionId!)}
            />
          </div>
        </div>
      </div>

      {/* Settings Sidebar - Slide over */}
      {showSettings && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
            onClick={() => setShowSettings(false)}
          />
          <div className="fixed right-0 top-8 h-[calc(100vh-2rem)] w-80 bg-white dark:bg-gray-900 shadow-2xl z-[9999] transform transition-transform"> {/* 🔥 타이틀바 아래에 위치하도록 top-8 추가 */}
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
