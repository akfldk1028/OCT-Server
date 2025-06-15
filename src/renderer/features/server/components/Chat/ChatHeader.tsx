// components/ChatHeader.tsx
import { cn } from '@/lib/utils';
import { Bot, Settings, Workflow, MessageCircle, Eye, Target, Monitor, RotateCcw, X, Zap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useStore, useDispatch } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  // 🔥 창 선택 완료 처리 함수
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
        } catch (messageError) {
          console.error('❌ [ChatHeader] 채팅 메시지 전송 실패:', messageError);
        }
      }
    } catch (error) {
      console.error('❌ [ChatHeader] 창 선택 완료 처리 실패:', error);
    }
  };

  // 🔥 창 선택 시작
  const handleStartWindowSelection = async () => {
    try {
      previousTargetWindow.current = currentTargetWindow;
      isWaitingForSelection.current = true;
      setIsSelectingWindow(true);

      if (currentTargetWindow && isAttachedMode && sessionId) {
        const windowName = typeof currentTargetWindow === 'string' ? currentTargetWindow : currentTargetWindow.name;
        const message = createWindowChangingMessage(windowName, currentTargetWindow, aiClientId);
        await sendChatMessage(dispatch, { sessionId, message });
      }

      if (sessionId) {
        try {
          const message = createWindowSelectionStartMessage(aiClientId);
          await sendChatMessage(dispatch, { sessionId, message });
        } catch (messageError) {
          console.error('❌ [ChatHeader] 창 선택 시작 메시지 전송 실패:', messageError);
        }
      }
      
      const result = await dispatch({
        type: 'window.startWindowSelectionMode',
        payload: {}
      });
      
      if (!result) {
        setIsSelectingWindow(false);
        isWaitingForSelection.current = false;
      }
      
    } catch (error) {
      console.error('❌ [ChatHeader] 창 선택 실패:', error);
      setIsSelectingWindow(false);
      isWaitingForSelection.current = false;
    }
  };

  // 🔥 창 선택 해제
  const handleClearWindow = async () => {
    try {
      const currentWindow = currentTargetWindow;
      
      setIsSelectingWindow(false);
      isWaitingForSelection.current = false;
      
      await dispatch({
        type: 'window.detachFromTargetWindow',
        payload: {}
      });
      
      if (sessionId && currentWindow) {
        const message = createWindowDisconnectedMessage(currentWindow, aiClientId);
        await sendChatMessage(dispatch, { sessionId, message });
      }
    } catch (error) {
      console.error('❌ [ChatHeader] 창 해제 실패:', error);
      setIsSelectingWindow(false);
      isWaitingForSelection.current = false;
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* 🔥 왼쪽: 채팅 정보 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">{roomName}</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
              
              {/* 🔥 상태 배지들 */}
              <div className="flex items-center gap-1">
                {aiClientId && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs">
                    <Bot className="w-3 h-3 mr-1" />
                    AI
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full ml-1",
                      clientsStatus.ai === 'idle' ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'
                    )}></div>
                  </Badge>
                )}
                
                {overlayClientId && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Vision
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full ml-1",
                      clientsStatus.overlay === 'idle' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                    )}></div>
                  </Badge>
                )}
                
                {mcpBindingsCount > 0 && (
                  <Badge variant="outline" className="h-5 px-2 text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    {mcpBindingsCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 오른쪽: 컨트롤 */}
      <div className="flex items-center gap-2">
        {/* 🔥 모드 토글 */}
        <div className="flex items-center bg-muted rounded-lg p-1">
          <Button
            variant={overlayMode === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setOverlayMode('chat')}
            className="h-7 px-3"
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            채팅
          </Button>
          <Button
            variant={overlayMode === 'overlay' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setOverlayMode('overlay');
              setTimeout(() => {
                triggerOverlayGuide('현재 화면에서 사용할 수 있는 기능들을 알려주세요');
              }, 500);
            }}
            className="h-7 px-3"
          >
            <Eye className="w-3 h-3 mr-1" />
            오버레이
          </Button>
        </div>

        {/* 🔥 창 선택 (오버레이 모드에서만) */}
        {overlayMode === 'overlay' && (
          <div className="flex items-center gap-2">
            {currentTargetWindow ? (
              <Badge 
                variant={isAttachedMode ? "default" : "secondary"} 
                className="h-7 px-3 gap-2"
              >
                <Monitor className="w-3 h-3" />
                <span className="max-w-24 truncate">
                  {typeof currentTargetWindow === 'string' ? currentTargetWindow : currentTargetWindow.name}
                </span>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isAttachedMode ? "bg-emerald-400 animate-pulse" : "bg-blue-400"
                )}></div>
              </Badge>
            ) : (
              <Badge variant="outline" className="h-7 px-3 gap-2">
                <Monitor className="w-3 h-3" />
                창 선택 안됨
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartWindowSelection}
              disabled={isSelectingWindow}
              className="h-7 px-3"
            >
              {isSelectingWindow ? (
                <>
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                  선택 중...
                </>
              ) : currentTargetWindow ? (
                <>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  변경
                </>
              ) : (
                <>
                  <Target className="w-3 h-3 mr-1" />
                  선택
                </>
              )}
            </Button>
            
            {currentTargetWindow && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearWindow}
                className="h-7 w-7 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {/* 🔥 모델 선택 */}
        <Select value={currentModel} onValueChange={onModelChange}>
          <SelectTrigger className="w-32 h-7 text-xs">
            <SelectValue placeholder="모델 선택" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.slice(0, 5).map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-xs">
                {model.name.split('/').pop()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* 🔥 액션 버튼들 */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onWorkflowClick}
            className="h-7 w-7 p-0"
          >
            <Workflow className="w-3 h-3" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSettingsClick}
            className="h-7 w-7 p-0"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}