import { cn } from '@/lib/utils';
import { Bot, Settings, Workflow, MessageCircle, Eye, Target, Monitor, RotateCcw, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useStore, useDispatch } from '@/hooks/useStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatHeaderProps {
  roomName: string;
  sessionId: string; // 🔥 sessionId prop 추가
  aiClientId: string | null;
  overlayClientId: string | null;
  clientsStatus: {
    ai: 'idle' | 'thinking' | 'responding';
    overlay: 'idle' | 'analyzing' | 'generating';
  };
  mcpBindingsCount: number;
  overlayMode: 'chat' | 'overlay';
  setOverlayMode: (mode: 'chat' | 'overlay') => void;
  triggerOverlayGuide: (question: string) => void;
  currentModel?: string;
  availableModels: Array<{ id: string; name: string }>;
  onModelChange: (model: string) => void;
  onWorkflowClick: () => void;
  onSettingsClick: () => void;
}

export default function ChatHeader({
  roomName,
  sessionId, // 🔥 sessionId prop 받기
  aiClientId,
  overlayClientId,
  clientsStatus,
  mcpBindingsCount,
  overlayMode,
  setOverlayMode,
  triggerOverlayGuide,
  currentModel,
  availableModels,
  onModelChange,
  onWorkflowClick,
  onSettingsClick,
}: ChatHeaderProps) {
  const store = useStore();
  const dispatch = useDispatch();
  
  // 🔥 현재 선택된 창 정보 가져오기 (사용자 친화적!)
  const currentTargetWindow = store?.window?.targetWindowInfo;
  const isAttachedMode = store?.window?.isAttachedMode;
  
  // 🎯 창 선택 상태
  const [isSelectingWindow, setIsSelectingWindow] = useState(false);
  const previousTargetWindow = useRef(currentTargetWindow);
  const isWaitingForSelection = useRef(false);
  
  // 🔍 디버깅: 상태 확인
  console.log('🔍 [ChatHeader] 상태 확인:', {
    currentTargetWindow: typeof currentTargetWindow === 'string' ? currentTargetWindow : currentTargetWindow?.name,
    isAttachedMode,
    hasTargetWindow: !!currentTargetWindow,
    windowType: typeof currentTargetWindow,
    overlayMode,
    sessionId,
    aiClientId,
    isSelectingWindow
  });

  // 🔥 창 선택 완료 감지 (dispatch 방식)
  useEffect(() => {
    console.log('🔍 [ChatHeader] useEffect 트리거됨:', {
      isWaitingForSelection: isWaitingForSelection.current,
      currentTargetWindow: currentTargetWindow?.name || currentTargetWindow,
      previousTargetWindow: previousTargetWindow.current?.name || previousTargetWindow.current,
      hasCurrentWindow: !!currentTargetWindow,
      isDifferent: currentTargetWindow !== previousTargetWindow.current
    });
    
    if (isWaitingForSelection.current && currentTargetWindow) {
      // 🔥 창 이름으로 비교 (더 안전함)
      const currentWindowName = typeof currentTargetWindow === 'string' ? currentTargetWindow : currentTargetWindow.name;
      const previousWindowName = typeof previousTargetWindow.current === 'string' ? previousTargetWindow.current : previousTargetWindow.current?.name;
      
      console.log('🔍 [ChatHeader] 창 이름 비교:', {
        currentWindowName,
        previousWindowName,
        isDifferent: currentWindowName !== previousWindowName
      });
      
      if (currentWindowName !== previousWindowName) {
        console.log('🎉 [ChatHeader] 창 선택 완료 감지!');
        console.log('🔄 [ChatHeader] 이전 창:', previousWindowName);
        console.log('✅ [ChatHeader] 새로운 창:', currentWindowName);
        
        // 창 선택 완료 처리
        handleWindowSelectionComplete(currentTargetWindow);
        
        // 상태 초기화
        isWaitingForSelection.current = false;
        setIsSelectingWindow(false);
        previousTargetWindow.current = currentTargetWindow;
      }
    }
  }, [currentTargetWindow]);

  // 🔥 창 선택 완료 처리 함수
  const handleWindowSelectionComplete = async (selectedWindow: any) => {
    try {
      const windowName = typeof selectedWindow === 'string' ? selectedWindow : selectedWindow.name;
      console.log('✅ [ChatHeader] 창 선택 완료:', windowName);
      console.log('🔍 [ChatHeader] selectedWindow 전체 정보:', selectedWindow);

      // 선택된 창에 부착 (dispatch 사용)
      await dispatch({
        type: 'window.attachToTargetWindow',
        payload: selectedWindow
      });
      
      console.log('🔗 [ChatHeader] 창 부착 완료');
      
      // 🔥 AI 클라이언트가 창 선택을 알려주도록 협업 메시지 전송
      if (sessionId) {
        console.log('📝 [ChatHeader] 창 연결 완료 메시지 전송...');
        
        try {
          // 🤖 AI 클라이언트 메시지 (협업 방식)
          const successPayload = {
            type: 'chat.addMessage',
            payload: {
              sessionId,
              message: {
                id: `ai-window-notification-${Date.now()}`,
                content: `🤖 **AI Assistant • 창 연결 완료**\n\n🎯 **${windowName}** 창이 성공적으로 연결되었습니다!\n\n📊 **창 정보:**\n• 📍 위치: ${typeof selectedWindow === 'object' ? `(${selectedWindow.x}, ${selectedWindow.y})` : '정보 없음'}\n• 📏 크기: ${typeof selectedWindow === 'object' ? `${selectedWindow.width} × ${selectedWindow.height} 픽셀` : '정보 없음'}\n• 🔗 상태: 실시간 연결됨\n\n💡 이제 이 창과 관련된 모든 작업을 도와드릴 수 있습니다! 무엇을 도와드릴까요?`,
                role: 'assistant',
                timestamp: new Date().toISOString(),
                metadata: {
                  type: 'window-connection',
                  windowInfo: selectedWindow,
                  isCooperative: true,
                  avatar: 'ai',
                  clientId: aiClientId
                }
              }
            }
          };
          
          console.log('📦 [ChatHeader] 성공 메시지 페이로드:', successPayload);
          const successResult = await dispatch(successPayload);
          console.log('📨 [ChatHeader] 성공 메시지 dispatch 결과:', successResult);
          console.log('✅ [ChatHeader] AI 클라이언트 창 연결 알림 완료');
        } catch (messageError) {
          console.error('❌ [ChatHeader] 채팅 메시지 전송 실패:', messageError);
          console.error('❌ [ChatHeader] 에러 스택:', messageError instanceof Error ? messageError.stack : 'No stack');
        }
      }
    } catch (error) {
      console.error('❌ [ChatHeader] 창 선택 완료 처리 실패:', error);
    }
  };

  // 🔥 **새로운 방식**: dispatch만 사용하고 useEffect로 상태 변화 감지
  const handleStartWindowSelection = async () => {
    try {
      console.log('🖱️ [ChatHeader] 마우스 창 선택 모드 시작');
      console.log('🔍 [ChatHeader] 함수 호출됨! 버튼 클릭 이벤트 정상 작동');
      
      // 🔥 이전 창 정보 저장 (변화 감지용)
      previousTargetWindow.current = currentTargetWindow;
      isWaitingForSelection.current = true;
      setIsSelectingWindow(true);

      // 🔥 "변경" 버튼 로직: 기존 창이 있으면 변경 중 메시지 표시
      if (currentTargetWindow && isAttachedMode) {
        const windowName = typeof currentTargetWindow === 'string' ? currentTargetWindow : currentTargetWindow.name;
        console.log('🔄 [ChatHeader] 기존 창 변경 모드:', windowName);
        
        if (sessionId) {
          await dispatch({
            type: 'chat.addMessage',
            payload: {
              sessionId,
              message: {
                id: `ai-window-changing-${Date.now()}`,
                content: `🤖 **AI Assistant • 창 변경 중**\n\n🔄 현재 **${windowName}** 창에서 다른 창으로 변경하고 있습니다...\n\n📋 **진행 상황:**\n• 🎯 새로운 창 선택 대기 중\n• 🖱️ 마우스로 원하는 창을 클릭해주세요\n• ⌨️ ESC 키로 취소 가능\n\n💡 새로운 창을 선택하면 자동으로 연결됩니다!`,
                role: 'assistant',
                timestamp: new Date().toISOString(),
                metadata: {
                  type: 'window-changing',
                  previousWindowInfo: currentTargetWindow,
                  isCooperative: true,
                  avatar: 'ai',
                  clientId: aiClientId
                }
              }
            }
          });
          console.log('🔄 [ChatHeader] 창 변경 중 메시지 전송 완료');
        }
      }

      // 🔥 창 선택 시작 메시지 전송
      if (sessionId) {
        console.log('📝 [ChatHeader] 창 선택 시작 메시지 전송...');
        
        try {
          const messagePayload = {
            type: 'chat.addMessage',
            payload: {
              sessionId,
              message: {
                id: `ai-window-selection-start-${Date.now()}`,
                content: `🤖 **AI Assistant • 창 선택 모드**\n\n🎯 창 선택 모드가 시작되었습니다!\n\n📋 **사용법:**\n• 🖱️ 마우스로 원하는 창을 클릭해주세요\n• ⌨️ ESC 키로 취소 가능\n• 🔄 창이 선택되면 자동으로 연결됩니다\n\n💡 잠시만 기다려주세요...`,
                role: 'assistant',
                timestamp: new Date().toISOString(),
                metadata: {
                  type: 'window-selection-start',
                  isCooperative: true,
                  avatar: 'ai',
                  clientId: aiClientId
                }
              }
            }
          };
          
          console.log('📦 [ChatHeader] 메시지 페이로드:', messagePayload);
          const result = await dispatch(messagePayload);
          console.log('📨 [ChatHeader] dispatch 결과:', result);
          console.log('✅ [ChatHeader] 창 선택 시작 메시지 전송 완료');
        } catch (messageError) {
          console.error('❌ [ChatHeader] 창 선택 시작 메시지 전송 실패:', messageError);
        }
      }
      
      // 🔥 dispatch로 창 선택 모드 시작 (Promise 기대하지 않음)
      console.log('📤 [ChatHeader] 창 선택 모드 시작 dispatch...');
      dispatch({
        type: 'window.startWindowSelectionMode',
        payload: {}
      });
      console.log('✅ [ChatHeader] 창 선택 모드 시작 완료 - useEffect가 상태 변화를 감지할 것임');
      
    } catch (error) {
      console.error('❌ [ChatHeader] 창 선택 실패:', error);
      setIsSelectingWindow(false);
      isWaitingForSelection.current = false;
    }
  };

  // 🔥 창 선택 해제
  const handleClearWindow = async () => {
    try {
      const currentWindow = currentTargetWindow; // 해제 전에 창 정보 저장
      
      // 🔥 dispatch를 통해 창 분리
      await dispatch({
        type: 'window.detachFromTargetWindow',
        payload: {}
      });
      
      console.log('🔄 [ChatHeader] 창 선택 해제 완료');
      
      // 🔥 AI 클라이언트가 창 해제를 알려주도록 협업 메시지 전송
      if (sessionId && currentWindow) {
        const windowName = typeof currentWindow === 'string' ? currentWindow : currentWindow.name;
        // 🤖 AI 클라이언트 메시지 (협업 방식)
        await dispatch({
          type: 'chat.addMessage',
          payload: {
            sessionId,
            message: {
              id: `ai-window-disconnect-${Date.now()}`,
              content: `🤖 **AI Assistant • 창 연결 해제**\n\n🔄 **${windowName}** 창과의 연결이 해제되었습니다.\n\n📋 **변경사항:**\n• 🔗 창 연결: 해제됨\n• 💬 모드: 일반 채팅으로 전환\n• 🎯 상태: 대기 중\n\n💡 언제든지 다시 창을 선택하여 연결할 수 있습니다!`,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              metadata: {
                type: 'window-disconnection',
                previousWindowInfo: currentWindow,
                isCooperative: true,
                avatar: 'ai',
                clientId: aiClientId
              }
            }
          }
        });
        console.log('🤖 [ChatHeader] AI 클라이언트 창 해제 알림 완료');
      }
    } catch (error) {
      console.error('❌ [ChatHeader] 창 해제 실패:', error);
    }
  };

  // 🔥 테스트용: dispatch를 통한 getWindowAtPoint 호출
  const handleTestWindowApi = async () => {
    try {
      console.log('🧪 [ChatHeader] dispatch getWindowAtPoint 테스트 시작');
      
      // 현재 마우스 위치 가져오기 (임의로 설정)
      const testX = 500;
      const testY = 300;
      
      const result = await dispatch({
        type: 'window.getWindowAtPoint',
        payload: { x: testX, y: testY }
      });
      
      console.log('✅ [ChatHeader] dispatch 테스트 결과:', result);
      alert(`창 감지 결과: ${result?.name || '없음'} (${result?.x}, ${result?.y})`);
      
    } catch (error) {
      console.error('❌ [ChatHeader] dispatch 테스트 실패:', error);
      alert('dispatch 테스트 실패: ' + error);
    }
  };
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{roomName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-500">Live</span>
            
            {/* 🤖👁️ 협업 클라이언트 상태 표시 */}
            {aiClientId && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                • 🤖 AI
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  clientsStatus.ai === 'idle' ? 'bg-green-400' : 'bg-blue-400 animate-pulse'
                )}></div>
              </span>
            )}
            
            {overlayClientId && (
              <span className="text-xs text-yellow-600 font-medium flex items-center gap-1">
                • 👁️ Vision
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  clientsStatus.overlay === 'idle' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
                )}></div>
              </span>
            )}
            
            {mcpBindingsCount > 0 && (
              <span className="text-sm text-purple-600 font-medium">
                • {mcpBindingsCount} tools
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 🔥 Overlay Mode Toggle - 모던한 노란색 스타일 */}
        <div className="relative">
          <div className="flex items-center bg-yellow-50 dark:bg-yellow-950/20 rounded-full p-1 border-2 border-yellow-200 dark:border-yellow-800/50">
            <button
              onClick={() => setOverlayMode('chat')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm',
                overlayMode === 'chat'
                  ? 'bg-yellow-400 text-black shadow-md transform scale-105'
                  : 'text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
              )}
              title="채팅 모드"
            >
              <MessageCircle className="w-4 h-4" />
              <span>채팅</span>
            </button> 
            <button
              onClick={() => {
                console.log('👁️ [ChatHeader] 오버레이 모드로 전환');
                setOverlayMode('overlay');
                // 오버레이 모드로 전환 시 즉시 가이드 트리거 (더 안전하게)
                try {
                  setTimeout(() => {
                    console.log('👁️ [ChatHeader] 오버레이 가이드 트리거');
                    triggerOverlayGuide('현재 화면에서 사용할 수 있는 기능들을 알려주세요');
                  }, 500);
                } catch (error) {
                  console.error('❌ [ChatHeader] 오버레이 가이드 트리거 실패:', error);
                }
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm',
                overlayMode === 'overlay'
                  ? 'bg-yellow-400 text-black shadow-md transform scale-105'
                  : 'text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
              )}
              title="오버레이 모드 - AI가 화면을 분석해서 가이드 제공"
            >
              <Eye className="w-4 h-4" />
              <span>오버레이</span>
            </button>
          </div>
          
          {/* Mode Indicator */}
          <div className="absolute -top-2 -right-2">
            <div className={cn(
              'w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
              overlayMode === 'overlay' ? 'bg-yellow-400' : 'bg-blue-400'
            )}>
            </div>
          </div>
        </div>

        {/* 🎯 창 정보 + 변경 버튼 - 오버레이 모드일 때만 표시 */}
        {overlayMode === 'overlay' && (
          <div className="flex items-center gap-2">
            {/* 현재 선택된 창 정보 표시 */}
            {currentTargetWindow ? (
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full border-2",
                isAttachedMode 
                  ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
              )}>
                <Monitor className={cn(
                  "w-4 h-4",
                  isAttachedMode 
                    ? "text-green-600 dark:text-green-400"
                    : "text-blue-600 dark:text-blue-400"
                )} />
                <span className={cn(
                  "text-sm font-medium max-w-32 truncate",
                  isAttachedMode 
                    ? "text-green-700 dark:text-green-300"
                    : "text-blue-700 dark:text-blue-300"
                )}>
                  {currentTargetWindow.name}
                </span>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isAttachedMode 
                    ? "bg-green-500 animate-pulse"
                    : "bg-blue-500"
                )} title={isAttachedMode ? "연결됨" : "선택됨"}></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-full border-2 border-gray-300 dark:border-gray-600">
                <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">창 선택 안됨</span>
              </div>
            )}
            
            {/* 🖱️ 마우스 창 선택 버튼 */}
            <button
              onClick={handleStartWindowSelection}
              disabled={isSelectingWindow}
              className={cn(
                "flex items-center gap-1 px-3 py-2 rounded-full border-2 transition-all duration-300",
                isSelectingWindow 
                  ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 cursor-wait"
                  : "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 border-blue-300 dark:border-blue-700"
              )}
              title={isSelectingWindow ? "창 선택 중... (ESC로 취소)" : "마우스로 창 선택하기"}
            >
              {isSelectingWindow ? (
                <>
                  <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">선택 중...</span>
                </>
              ) : currentTargetWindow ? (
                <>
                  <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">변경</span>
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">선택</span>
                </>
              )}
            </button>
            
            {/* 🔄 창 선택 해제 버튼 */}
            {currentTargetWindow && (
              <button
                onClick={handleClearWindow}
                className="flex items-center gap-1 px-2 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-full border-2 border-red-300 dark:border-red-700 transition-all duration-300"
                title="창 선택 해제"
              >
                <X className="w-3 h-3 text-red-600 dark:text-red-400" />
              </button>
            )}
          </div>
        )}

        {/* Model Selector */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-2">
          <Select
            value={currentModel}
            onValueChange={onModelChange}
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
          onClick={onWorkflowClick}
          className="w-10 h-10 rounded-full bg-purple-400 hover:bg-purple-500 flex items-center justify-center transition-colors"
          title="Connect workflow"
        >
          <Workflow className="w-5 h-5 text-white" />
        </button>
        
        <button
          onClick={onSettingsClick}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        
        {/* 🧪 테스트 버튼 - dispatch getWindowAtPoint */}
        <button
          onClick={handleTestWindowApi}
          className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-full border border-orange-300 transition-colors"
          title="dispatch getWindowAtPoint 테스트"
        >
          🧪 Dispatch 테스트
        </button>
      </div>

    </div>
  );
} 