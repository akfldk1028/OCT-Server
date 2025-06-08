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
import MCPManager from '../components/MCPManager';
import ChatSidebar from '../components/Chat/ChatSidebar';
import WorkflowListModal from '../components/Flow/WorkflowListModal';
import { useWorkflowExecution } from '../hook/useWorkflowExecution';
import type { WorkflowExecutionConfig } from '../types/workflow.types';
import type { Tag } from '../components/Chat/TagInput';
import type { ServerLayoutContext } from '../types/server-types';
import { useChatScroll } from '@/hooks/use-chat-scroll';

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
  
  // 🔥 Overlay 모드 상태 관리
  const [overlayMode, setOverlayMode] = useState<'chat' | 'overlay'>('chat');
  
  // 🔥 협업 클라이언트 상태 관리
  const [aiClientId, setAiClientId] = useState<string | null>(null);
  const [overlayClientId, setOverlayClientId] = useState<string | null>(null);
  const [clientsStatus, setClientsStatus] = useState({
    ai: 'idle' as 'idle' | 'thinking' | 'responding',
    overlay: 'idle' as 'idle' | 'analyzing' | 'generating'
  });

  // 🤖👁️ 협업 클라이언트 초기화 (조용하게, 토글만 준비)
  useEffect(() => {
    if (!sessionId) return;
    
    // 🔥 토글 상태만 준비하고 실제 실행은 채팅 시에만
    let mounted = true;
    
    const prepareCooperativeMode = () => {
      if (!mounted) return;
      
      try {
        // 🔥 가상 ID만 생성 (실제 동작은 메시지 전송 시)
        const tempAiId = `ai-${sessionId}-${Date.now()}`;
        const tempOverlayId = `overlay-${sessionId}-${Date.now()}`;
        
        setAiClientId(tempAiId);
        setOverlayClientId(tempOverlayId);
        
        console.log('🤝 [RealtimeChat] 협업 모드 준비 완료 (아직 비활성)');
        
      } catch (error) {
        console.error('❌ [RealtimeChat] 협업 모드 준비 실패:', error);
      }
    };

    // 조용하게 준비만
    const timeoutId = setTimeout(prepareCooperativeMode, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [sessionId]);

  // 🔥 Overlay 가이드 트리거 (chatStore.sendOverlayMessage 직접 호출)
  const triggerOverlayGuide = useCallback(async (question?: string) => {
    const finalQuestion = question || '이 화면에서 할 수 있는 작업들을 알려주세요';
    console.log('👁️ [RealtimeChat] Overlay 가이드 트리거:', finalQuestion);
    
    if (!sessionId) {
      console.error('❌ [triggerOverlayGuide] sessionId 없음');
      return;
    }
    
    try {
      // 🎯 chatStore.sendOverlayMessage 직접 호출하여 오버레이 실행
      await dispatch({
        type: 'chat.sendOverlayMessage',
        payload: {
          sessionId,
          content: finalQuestion,
          selectedTags: [],
          triggerOverlay: true // 🔥 오버레이 트리거 활성화!
        }
      });
      console.log('✅ [RealtimeChat] Overlay 가이드 트리거 완료');
    } catch (error) {
      console.error('❌ [RealtimeChat] Overlay 가이드 실패:', error);
    }
  }, [sessionId, dispatch]);

  // 📝 sendMessage 함수 참조 (나중에 정의됨)

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

  // 🔥 협업 메시지 전송 시스템 (AI + Overlay 협업)
  const sendMessage = async (messageContent?: string, tags?: Tag[]) => {
    const contentToSend =
      typeof messageContent === 'string' ? messageContent : input;
    console.log('📤 [RealtimeChat] 협업 sendMessage 호출');
    console.log('📝 Content:', contentToSend);
    console.log('🏷️ Tags:', tags || selectedTags);
    console.log('🤖👁️ Mode:', overlayMode);
    console.log('🤖 AI Client:', aiClientId);
    console.log('👁️ Overlay Client:', overlayClientId);

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
      // 🔥 새로운 협업 메시지 시스템 사용
      await sendCooperativeMessage(contentToSend, overlayMode === 'overlay');
      
      console.log('✅ [RealtimeChat] 협업 메시지 전송 완료');
      
      // 메시지 전송 후 정리
      setSelectedTags([]);
      setInput('');
      
      // 📜 스크롤 (더 강력하게!)
      console.log('📜 [sendMessage] 메시지 전송 완료 - 스크롤 강제 실행!');
      
      // 즉시 스크롤
      scrollToBottom();
      
      // 추가 스크롤 시도들
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(() => scrollToBottom(), 100);
        setTimeout(() => scrollToBottom(), 200);
        setTimeout(() => scrollToBottom(), 500);
      });
    } catch (error) {
      console.error('❌ [RealtimeChat] 협업 메시지 전송 실패:', error);
      
      // 폴백: 기본 메시지 전송
      dispatch({
        type: 'chat.sendMessage',
        payload: {
          sessionId,
          content: `❌ 협업 메시지 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    } finally {
      setIsStreaming(false);
      console.log('🏁 [RealtimeChat] 협업 메시지 처리 완료');
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
              
              // 🔥 AI에게 새로운 도구 추가 알림 (직접 호출)
              try {
                console.log('🤖 [handleLoadWorkflow] AI에게 새로운 도구 알림 전송:', connectedServers);
                await dispatch({
                  type: 'chat.notifyNewToolsAdded',
                  payload: {
                    sessionId: sessionId!,
                    connectedServers,
                    message: `🎉 **워크플로우 실행 완료!**\n\n🔧 새로운 MCP 서버가 연결되었습니다:\n${connectedServers.map(name => `• ${name}`).join('\n')}\n\n💡 이제 이 서버들의 도구를 채팅에서 바로 사용할 수 있습니다!`
                  }
                });
                console.log('✅ [handleLoadWorkflow] AI 알림 전송 완료');
              } catch (notifyError) {
                console.error('❌ [handleLoadWorkflow] AI 알림 전송 실패:', notifyError);
              }
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
                    serverCount: serverNodes.length,
                    hasNewTools: connectedServers.length > 0 // 🔥 AI가 새로운 도구 인식용 플래그
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
        {/* Header */}
        <ChatHeader 
          roomName={room.name}
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
        <div className="flex-1 overflow-hidden min-h-0">
          {messages.length === 0 && !isStreaming ? (
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

        {/* Chat Input */}
        <div className="border-t border-border p-6">
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
