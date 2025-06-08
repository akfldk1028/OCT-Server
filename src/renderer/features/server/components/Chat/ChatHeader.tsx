import { cn } from '@/lib/utils';
import { Bot, Settings, Workflow, MessageCircle, Eye } from 'lucide-react';
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
      </div>
    </div>
  );
} 