// components/ChatHeader.tsx
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
import { 
  sendChatMessage, 
  createWindowConnectedMessage, 
  createWindowDisconnectedMessage,
  createWindowSelectionStartMessage,
  createWindowChangingMessage 
} from './utils/chatMessages';

interface ChatHeaderProps {
  roomName: string;
  sessionId: string;
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
  sessionId,
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
  
  const currentTargetWindow = store?.window?.targetWindowInfo;
  const isAttachedMode = store?.window?.isAttachedMode;
  
  const [isSelectingWindow, setIsSelectingWindow] = useState(false);
  const previousTargetWindow = useRef(currentTargetWindow);
  const isWaitingForSelection = useRef(false);
  
  // 🔥 창 선택 완료 감지
  useEffect(() => {
    if (isWaitingForSelection.current && currentTargetWindow) {
      const currentWindowName = typeof currentTargetWindow === 'string' ? currentTargetWindow : currentTargetWindow.name;
      const previousWindowName = typeof previousTargetWindow.current === 'string' ? previousTargetWindow.current : previousTargetWindow.current?.name;
      
      if (currentWindowName !== previousWindowName) {
        handleWindowSelectionComplete(currentTargetWindow);
        isWaitingForSelection.current = false;
        setIsSelectingWindow(false);
        previousTargetWindow.current = currentTargetWindow;
      }
    }
  }, [currentTargetWindow]);

  // 🔥 창 선택 완료 처리 함수 (유틸리티 함수 사용)
  const handleWindowSelectionComplete = async (selectedWindow: any) => {
    try {
      const windowName = typeof selectedWindow === 'string' ? selectedWindow : selectedWindow.name;
      console.log('✅ [ChatHeader] 창 선택 완료:', windowName);

      await dispatch({
        type: 'window.attachToTargetWindow',
        payload: selectedWindow
      });
      
      if (sessionId) {
        try {
          const message = createWindowConnectedMessage(selectedWindow, aiClientId);
          await sendChatMessage(dispatch, { sessionId, message });
          console.log('✅ [ChatHeader] AI 클라이언트 창 연결 알림 완료');
        } catch (messageError) {
          console.error('❌ [ChatHeader] 채팅 메시지 전송 실패:', messageError);
        }
      }
    } catch (error) {
      console.error('❌ [ChatHeader] 창 선택 완료 처리 실패:', error);
    }
  };

  // 🔥 창 선택 시작 (유틸리티 함수 사용)
  const handleStartWindowSelection = async () => {
    try {
      console.log('🖱️ [ChatHeader] 마우스 창 선택 모드 시작');
      
      previousTargetWindow.current = currentTargetWindow;
      isWaitingForSelection.current = true;
      setIsSelectingWindow(true);

      // 기존 창이 있으면 변경 중 메시지 표시
      if (currentTargetWindow && isAttachedMode && sessionId) {
        const windowName = typeof currentTargetWindow === 'string' ? currentTargetWindow : currentTargetWindow.name;
        const message = createWindowChangingMessage(windowName, currentTargetWindow, aiClientId);
        await sendChatMessage(dispatch, { sessionId, message });
      }

      // 창 선택 시작 메시지
      if (sessionId) {
        try {
          const message = createWindowSelectionStartMessage(aiClientId);
          await sendChatMessage(dispatch, { sessionId, message });
          console.log('✅ [ChatHeader] 창 선택 시작 메시지 전송 완료');
        } catch (messageError) {
          console.error('❌ [ChatHeader] 창 선택 시작 메시지 전송 실패:', messageError);
        }
      }
      
      const result = await dispatch({
        type: 'window.startWindowSelectionMode',
        payload: {}
      });
      
      // 🔥 창 선택 모드 시작 실패 시 상태 초기화
      if (!result) {
        console.warn('⚠️ [ChatHeader] 창 선택 모드 시작 실패');
        setIsSelectingWindow(false);
        isWaitingForSelection.current = false;
      }
      
    } catch (error) {
      console.error('❌ [ChatHeader] 창 선택 실패:', error);
      setIsSelectingWindow(false);
      isWaitingForSelection.current = false;
    }
  };

  // 🔥 창 선택 해제 (유틸리티 함수 사용)
  const handleClearWindow = async () => {
    try {
      const currentWindow = currentTargetWindow;
      
      // 🔥 상태 초기화 먼저 실행
      setIsSelectingWindow(false);
      isWaitingForSelection.current = false;
      
      await dispatch({
        type: 'window.detachFromTargetWindow',
        payload: {}
      });
      
      console.log('🔄 [ChatHeader] 창 선택 해제 완료');
      
      if (sessionId && currentWindow) {
        const message = createWindowDisconnectedMessage(currentWindow, aiClientId);
        await sendChatMessage(dispatch, { sessionId, message });
        console.log('🤖 [ChatHeader] AI 클라이언트 창 해제 알림 완료');
      }
    } catch (error) {
      console.error('❌ [ChatHeader] 창 해제 실패:', error);
      // 🔥 에러 발생 시에도 상태 초기화
      setIsSelectingWindow(false);
      isWaitingForSelection.current = false;
    }
  };

  // 테스트용 함수
  const handleTestWindowApi = async () => {
    try {
      console.log('🧪 [ChatHeader] dispatch getWindowAtPoint 테스트 시작');
      
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
    <div className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-800"> {/* 🔥 패딩 줄임: p-6 → p-2 */}
      <div className="flex items-center gap-2"> {/* 🔥 간격 줄임: gap-4 → gap-2 */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"> {/* 🔥 크기 줄임: w-10 h-10 → w-6 h-6 */}
          <Bot className="w-3 h-3 text-white" /> {/* 🔥 아이콘 크기 줄임: w-5 h-5 → w-3 h-3 */}
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{roomName}</h1> {/* 🔥 제목 크기 줄임: text-xl → text-sm */}
          <div className="flex items-center gap-1"> {/* 🔥 간격 줄임: gap-2 → gap-1, mt-1 제거 */}
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> {/* 🔥 점 크기 줄임: w-2 h-2 → w-1.5 h-1.5 */}
            <span className="text-xs text-gray-500">Live</span> {/* 🔥 텍스트 크기 줄임: text-sm → text-xs */}
            
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
        {/* Overlay Mode Toggle */}
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
          
          <div className="absolute -top-2 -right-2">
            <div className={cn(
              'w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
              overlayMode === 'overlay' ? 'bg-yellow-400' : 'bg-blue-400'
            )}>
            </div>
          </div>
        </div>

        {/* 창 정보 + 버튼들 - 오버레이 모드일 때만 표시 */}
        {overlayMode === 'overlay' && (
          <div className="flex items-center gap-2">
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