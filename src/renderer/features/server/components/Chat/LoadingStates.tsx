import { Bot, Eye } from 'lucide-react';

interface LoadingStatesProps {
  isStreaming: boolean;
  aiClientId: string | null;
  overlayClientId: string | null;
  clientsStatus: {
    ai: 'idle' | 'thinking' | 'responding';
    overlay: 'idle' | 'analyzing' | 'generating';
  };
}

export default function LoadingStates({
  isStreaming,
  aiClientId,
  overlayClientId,
  clientsStatus,
}: LoadingStatesProps) {
  if (!isStreaming) return null;

  return (
    <div className="space-y-3">
      {/* 🤖 AI Assistant 상태 */}
      {aiClientId && clientsStatus.ai !== 'idle' && (
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 relative">
            <Bot className="w-4 h-4 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
          </div>
          <div className="flex-1">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl px-4 py-3 inline-block border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  🤖 AI Assistant {clientsStatus.ai === 'thinking' ? 'analyzing...' : 'responding...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 👁️ Overlay Vision 상태 */}
      {overlayClientId && clientsStatus.overlay !== 'idle' && (
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 relative">
            <Eye className="w-4 h-4 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-ping"></div>
          </div>
          <div className="flex-1">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl px-4 py-3 inline-block border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-yellow-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                  👁️ Overlay Vision {clientsStatus.overlay === 'analyzing' ? 'capturing screen...' : 'generating guide...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 기본 로딩 (협업 클라이언트가 초기화되지 않은 경우) */}
      {(!aiClientId || clientsStatus.ai === 'idle') && (!overlayClientId || clientsStatus.overlay === 'idle') && (
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
  );
} 