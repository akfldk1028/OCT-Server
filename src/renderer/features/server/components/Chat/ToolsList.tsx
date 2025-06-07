import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, FileText, Database } from 'lucide-react';
import type { Tag } from './TagInput';

interface ToolsListProps {
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
  onAddTag: (tag: Tag) => void;
  className?: string;
}

const ToolsList: React.FC<ToolsListProps> = ({ 
  tools = [], 
  prompts = [], 
  resources = [], 
  onAddTag, 
  className = '' 
}) => {
  // 빈 상태 체크
  const hasData = tools.length > 0 || prompts.length > 0 || resources.length > 0;

  if (!hasData) {
    return (
      <div className={`text-center py-12 text-muted-foreground ${className}`}>
        <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h4 className="font-medium mb-2">MCP 서버가 연결되지 않았습니다</h4>
        <p className="text-sm">
          설정에서 MCP 서버를 연결하면<br />
          사용 가능한 도구들이 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tools" className="text-xs">
            🔧 도구 ({tools.length})
          </TabsTrigger>
          <TabsTrigger value="prompts" className="text-xs">
            📝 프롬프트 ({prompts.length})
          </TabsTrigger>
          <TabsTrigger value="resources" className="text-xs">
            📄 리소스 ({resources.length})
          </TabsTrigger>
        </TabsList>

        {/* 도구 탭 */}
        <TabsContent value="tools" className="mt-4">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tools.length > 0 ? (
              tools.map((tool) => (
                <Card 
                  key={`${tool.serverId}-${tool.name}`}
                  className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onAddTag({
                    type: 'tool',
                    name: tool.name,
                    description: tool.description,
                    serverId: tool.serverId,
                    serverName: tool.serverName,
                    inputSchema: tool.inputSchema
                  })}
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs mt-0.5">🔧</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{tool.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {tool.serverName || tool.serverId}
                        </Badge>
                      </div>
                      {tool.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {tool.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">연결된 도구가 없습니다</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 프롬프트 탭 */}
        <TabsContent value="prompts" className="mt-4">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {prompts.length > 0 ? (
              prompts.map((prompt) => (
                <Card 
                  key={`${prompt.serverId}-${prompt.name}`}
                  className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onAddTag({
                    type: 'prompt',
                    name: prompt.name,
                    description: prompt.description,
                    serverId: prompt.serverId,
                    serverName: prompt.serverName,
                    inputSchema: prompt.arguments ? {
                      type: 'object',
                      properties: prompt.arguments.reduce((acc, arg) => ({
                        ...acc,
                        [arg.name]: { 
                          type: 'string', 
                          description: arg.description 
                        }
                      }), {}),
                      required: prompt.arguments.filter(arg => arg.required).map(arg => arg.name)
                    } : undefined
                  })}
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs mt-0.5">📝</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{prompt.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {prompt.serverName || prompt.serverId}
                        </Badge>
                      </div>
                      {prompt.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {prompt.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">연결된 프롬프트가 없습니다</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 리소스 탭 */}
        <TabsContent value="resources" className="mt-4">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {resources.length > 0 ? (
              resources.slice(0, 20).map((resource) => (
                <Card 
                  key={`${resource.serverId}-${resource.uri}`}
                  className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onAddTag({
                    type: 'resource',
                    name: resource.name || resource.uri,
                    description: resource.description,
                    serverId: resource.serverId,
                    serverName: resource.serverName
                  })}
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs mt-0.5">📄</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {resource.name || resource.uri}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {resource.serverName || resource.serverId}
                        </Badge>
                      </div>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {resource.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">연결된 리소스가 없습니다</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ToolsList; 