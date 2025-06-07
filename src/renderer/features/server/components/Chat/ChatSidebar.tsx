import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, X, Bot, Wrench, Plus } from 'lucide-react';
import ToolsList from './ToolsList';
import type { Tag } from './TagInput';

interface MCPBinding {
  id: string;
  serverId: string;
  status: 'active' | 'inactive' | 'error';
}

interface MCPServer {
  id: string;
  name: string;
  description?: string;
  transportType: string;
}

interface AvailableModel {
  id: string;
  name: string;
  pricing?: { prompt?: string | number };
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTag: (tag: Tag) => void;
  tools: Array<{
    name: string; 
    description?: string; 
    serverId: string; 
    serverName?: string;
    inputSchema?: {
      type: string;
      properties?: Record<string, any>;
      required?: string[];
    };
  }>;
  prompts: Array<{
    name: string; 
    description?: string; 
    serverId: string; 
    serverName?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
  resources: Array<{
    name?: string; 
    uri: string; 
    description?: string; 
    serverId: string; 
    serverName?: string;
  }>;
  currentModel?: string;
  temperature?: number;
  onModelChange?: (model: string) => void;
  onTemperatureChange?: (temperature: number) => void;
  // MCP 관련 추가
  mcpBindings?: MCPBinding[];
  availableServers?: MCPServer[];
  availableModels?: AvailableModel[];
  onToggleMCPServer?: (serverId: string) => void;
  onDisconnectMCP?: (bindingId: string) => void;
  className?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  onAddTag,
  tools = [],
  prompts = [],
  resources = [],
  currentModel = '',
  temperature = 0.7,
  onModelChange,
  onTemperatureChange,
  mcpBindings = [],
  availableServers = [],
  availableModels = [],
  onToggleMCPServer,
  onDisconnectMCP,
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <div className={`w-80 border-l bg-background h-screen flex flex-col ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h3 className="font-semibold">채팅 설정</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* AI 모델 선택 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4 text-blue-500" />
            <label className="text-sm font-medium">AI 모델</label>
          </div>
          <Select
            value={currentModel}
            onValueChange={(value) => onModelChange?.(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="모델을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="w-full">
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-muted-foreground">
                      💰 ${typeof model.pricing?.prompt === 'string' ? parseFloat(model.pricing.prompt) || 0 : model.pricing?.prompt || 0} / 1K tokens
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* 온도 설정 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🌡️</span>
            <label className="text-sm font-medium">
              창의성 ({temperature})
            </label>
          </div>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => onTemperatureChange?.(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>정확함</span>
              <span>균형</span>
              <span>창의적</span>
            </div>
          </div>
        </Card>

        {/* MCP 서버 관리 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-green-500" />
            <label className="text-sm font-medium">도구 연결</label>
            <Badge variant="outline" className="text-xs">
              {mcpBindings.filter((b) => b.status === 'active').length}개 활성
            </Badge>
          </div>
          
          <div className="space-y-3">
            {availableServers.slice(0, 3).map((server) => {
              const binding = mcpBindings.find(
                (b) => b.serverId === server.id && b.status === 'active',
              );
              return (
                <div
                  key={server.id}
                  className={`p-3 rounded-lg border transition-all ${
                    binding 
                      ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          binding ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium text-sm">{server.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {server.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={binding ? "destructive" : "default"}
                      onClick={() => {
                        if (binding) {
                          onDisconnectMCP?.(binding.id);
                        } else {
                          onToggleMCPServer?.(server.id);
                        }
                      }}
                      className="text-xs"
                    >
                      {binding ? '연결 해제' : '연결'}
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {availableServers.length > 3 && (
              <Button variant="outline" size="sm" className="w-full text-xs">
                + {availableServers.length - 3}개 더 보기
              </Button>
            )}
          </div>
        </Card>

        {/* MCP 도구들 */}
        <ToolsList
          tools={tools}
          prompts={prompts}
          resources={resources}
          onAddTag={onAddTag}
        />

        {/* 고급 설정 */}
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between py-2 font-medium text-sm">
            🔧 고급 설정
            <Plus className="w-4 h-4 transition-transform group-open:rotate-45" />
          </summary>
          <div className="mt-2 text-xs text-muted-foreground">
            <p>고급 MCP 서버 관리 기능은 별도 페이지에서 사용할 수 있습니다.</p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ChatSidebar; 