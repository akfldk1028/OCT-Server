import { cn } from '@/lib/utils';
import { Bot, Settings, Workflow, MessageCircle, Eye, Target, Monitor, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
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
  
  // 🎯 창 선택 상태
  const [isSelectingWindow, setIsSelectingWindow] = useState(false);

  // 🔥 현재 선택된 창 정보 가져오기 (사용자 친화적!)
  const currentTargetWindow = store?.window?.targetWindowInfo;
  const isAttachedMode = store?.window?.isAttachedMode;

  // 🔥 **새로운 방식**: 마우스 커서로 창 직접 선택 (dispatch 사용)
  const handleStartWindowSelection = async () => {
    try {
      console.log('🖱️ [ChatHeader] 마우스 창 선택 모드 시작');
      setIsSelectingWindow(true);

      // 🔥 dispatch를 통해 windowStore action 호출
      const selectedWindow = await dispatch({
        type: 'window.startWindowSelectionMode',
        payload: {}
      });
      
      if (selectedWindow) {
        console.log('✅ [ChatHeader] 창 선택 완료:', selectedWindow.name);

        // 선택된 창에 부착
        await dispatch({
          type: 'window.attachToTargetWindow',
          payload: selectedWindow
        });
        
        console.log('🔗 [ChatHeader] 창 부착 완료');
      } else {
        console.log('❌ [ChatHeader] 창 선택 취소됨');
      }
      
    } catch (error) {
      console.error('❌ [ChatHeader] 창 선택 실패:', error);
    } finally {
      setIsSelectingWindow(false);
    }
  };

  // 🔥 창 선택 해제
  const handleClearWindow = async () => {
    try {
      // 🔥 dispatch를 통해 창 분리
      await dispatch({
        type: 'window.detachFromTargetWindow',
        payload: {}
      });
      
      console.log('🔄 [ChatHeader] 창 선택 해제 완료');
    } catch (error) {
      console.error('❌ [ChatHeader] 창 해제 실패:', error);
    }
  };

  // 🔥 테스트용: window.api.getWindowAtPoint 직접 호출
  const handleTestWindowApi = async () => {
    try {
      console.log('🧪 [ChatHeader] window.api.getWindowAtPoint 테스트 시작');
      
      // 현재 마우스 위치 가져오기 (임의로 설정)
      const testX = 500;
      const testY = 300;
      
      // @ts-ignore - window.api는 preload에서 정의됨
      const result = await window.api.getWindowAtPoint(testX, testY);
      
      console.log('✅ [ChatHeader] window.api 테스트 결과:', result);
      alert(`창 감지 결과: ${result?.name || '없음'} (${result?.x}, ${result?.y})`);
      
    } catch (error) {
      console.error('❌ [ChatHeader] window.api 테스트 실패:', error);
      alert('window.api 테스트 실패: ' + error);
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
            {currentTargetWindow && isAttachedMode ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-full border-2 border-green-300 dark:border-green-700">
                <Monitor className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300 max-w-32 truncate">
                  {currentTargetWindow.name}
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="연결됨"></div>
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
        
        {/* 🧪 테스트 버튼 - window.api.getWindowAtPoint */}
        <button
          onClick={handleTestWindowApi}
          className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-full border border-orange-300 transition-colors"
          title="window.api.getWindowAtPoint 테스트"
        >
          🧪 API 테스트
        </button>
      </div>

    </div>
  );
} 