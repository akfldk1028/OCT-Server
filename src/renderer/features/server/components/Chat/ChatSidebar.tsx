import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, X, Bot, Wrench, Database, MessageSquare, Sliders, Filter, ChevronUp } from 'lucide-react';
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
  mcpBindings?: MCPBinding[];
  availableServers?: MCPServer[];
  availableModels?: AvailableModel[];
  onToggleMCPServer?: (serverId: string) => void;
  onDisconnectMCP?: (bindingId: string) => void;
  className?: string;
}

type TabType = 'model' | 'tools' | 'prompts' | 'resources';

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
  const [activeTab, setActiveTab] = useState<TabType>('model');
  const [expandedSections, setExpandedSections] = useState<Record<TabType, boolean>>({
    model: false,
    tools: false,
    prompts: false,
    resources: false
  });
  
  if (!isOpen) return null;

  const tabs = [
    { id: 'model' as TabType, label: 'model', icon: Bot, count: availableModels.length },
    { id: 'tools' as TabType, label: 'tools', icon: Wrench, count: tools.length },
    { id: 'prompts' as TabType, label: 'prompts', icon: MessageSquare, count: prompts.length },
    { id: 'resources' as TabType, label: 'resources', icon: Database, count: resources.length }
  ];

  const activeTools = mcpBindings.filter(b => b.status === 'active').length;

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm ${className}`}>
      <div className="absolute right-0 top-0 h-full w-96 bg-background border-l border-border shadow-xl flex">
        {/* Left Tabs */}
        <div className="w-20 bg-sidebar border-r border-sidebar-border flex flex-col">
          {/* Header */}
          <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tab Buttons */}
          <div className="flex-1 py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full p-3 flex flex-col items-center gap-1 transition-all duration-200 rounded-lg mx-1 ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-black shadow-lg' 
                        : 'hover:bg-yellow-400/10 text-sidebar-foreground hover:text-yellow-400'
                    }`}
                  >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="text-xs h-5 px-1">
                      {tab.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-sidebar-border p-2 space-y-2">
            <button className="w-full p-2 flex flex-col items-center gap-1 hover:bg-sidebar-accent text-sidebar-foreground">
              <Settings className="w-5 h-5" />
              <span className="text-xs">Settings</span>
            </button>
            <button className="w-full p-2 flex flex-col items-center gap-1 hover:bg-sidebar-accent text-sidebar-foreground">
              <Filter className="w-5 h-5" />
              <span className="text-xs">More</span>
            </button>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Area */}
          <div className="flex-1 p-6 space-y-4">
            {activeTab === 'model' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">AI Model</h3>
                
                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Select Model</label>
                  <Select value={currentModel} onValueChange={onModelChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="w-full">
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ${typeof model.pricing?.prompt === 'string' ? parseFloat(model.pricing.prompt) || 0 : model.pricing?.prompt || 0} / 1K tokens
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Creativity ({temperature})
                  </label>
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
                    <span>Precise</span>
                    <span>Balanced</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Connection Status */}
                <div className="p-4 bg-muted rounded-lg">
                  <button 
                    onClick={() => setExpandedSections(prev => ({ ...prev, model: !prev.model }))}
                    className="w-full flex items-center justify-between hover:bg-muted-foreground/5 p-2 -m-2 rounded-lg transition-colors"
                  >
                    <span className="text-sm font-medium">Active Tools</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-sm">{activeTools} connected</span>
                      <ChevronUp className={`w-4 h-4 transition-transform ${expandedSections.model ? 'rotate-180' : ''} text-yellow-400`} />
                    </div>
                  </button>
                  
                  {expandedSections.model && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {mcpBindings.filter(b => b.status === 'active').length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No active tools connected
                        </div>
                      ) : (
                        mcpBindings
                          .filter(b => b.status === 'active')
                          .map((binding) => {
                            const server = availableServers.find(s => s.id === binding.serverId);
                            const serverTools = tools.filter(t => t.serverId === binding.serverId);
                            return (
                                                             <div key={binding.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                                 <div className="flex items-center gap-3">
                                   <div>
                                     <div className="inline-flex items-center px-3 py-1.5 bg-yellow-400 text-black text-xs font-bold rounded-lg shadow-sm">
                                       {server?.name || binding.serverId} ▼
                                     </div>
                                     <div className="text-xs text-muted-foreground mt-1">
                                       {serverTools.length} tool{serverTools.length !== 1 ? 's' : ''}
                                     </div>
                                   </div>
                                 </div>
                                 <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                               </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between w-full px-4 py-3 bg-pink-500 text-white rounded-xl shadow-lg mb-2">
                  <div className="text-lg font-bold">
                    Available development tools
                  </div>
                  <div className="px-2 py-1 bg-white/20 text-white text-xs font-bold rounded-lg">{tools.length}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {tools.slice(0, expandedSections.tools ? tools.length : 6).map((tool, index) => (
                    <button
                      key={tool.name}
                      onClick={() => onAddTag({ 
                        type: 'tool', 
                        name: tool.name, 
                        description: tool.description,
                        serverId: tool.serverId,
                        serverName: tool.serverName,
                        inputSchema: tool.inputSchema
                      })}
                      className="relative p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-left group"
                    >

                                              <div>
                          <div className="inline-flex items-center px-3 py-1.5 bg-pink-500 text-white text-sm font-bold rounded-xl shadow-lg mb-2 break-words max-w-full">
                            <span className="break-words">{tool.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tool.serverName}
                          </div>
                        </div>
                    </button>
                  ))}
                </div>

                {tools.length > 6 && (
                  <button 
                    onClick={() => setExpandedSections(prev => ({ ...prev, tools: !prev.tools }))}
                    className="w-full p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-dashed border-border"
                  >
                    ↓ {expandedSections.tools 
                      ? 'Show less' 
                      : `${tools.length - 6} more tools`
                    }
                  </button>
                )}
              </div>
            )}

            {activeTab === 'prompts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between w-full px-4 py-3 bg-amber-600 text-white rounded-xl shadow-lg mb-2">
                  <div className="text-lg font-bold">
                    Ready-to-use prompt templates
                  </div>
                  <div className="px-2 py-1 bg-white/20 text-white text-xs font-bold rounded-lg">{prompts.length}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {prompts.slice(0, expandedSections.prompts ? prompts.length : 6).map((prompt, index) => (
                    <button
                      key={prompt.name}
                      onClick={() => onAddTag({ 
                        type: 'prompt', 
                        name: prompt.name, 
                        description: prompt.description,
                        serverId: prompt.serverId,
                        serverName: prompt.serverName
                      })}
                      className="relative p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-left"
                    >

                                              <div>
                          <div className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white text-sm font-bold rounded-xl shadow-lg mb-2 break-words max-w-full">
                            <span className="break-words">{prompt.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {prompt.serverName}
                          </div>
                        </div>
                    </button>
                  ))}
                </div>

                {prompts.length > 6 && (
                  <button 
                    onClick={() => setExpandedSections(prev => ({ ...prev, prompts: !prev.prompts }))}
                    className="w-full p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-dashed border-border"
                  >
                    ↓ {expandedSections.prompts 
                      ? 'Show less' 
                      : `${prompts.length - 6} more prompts`
                    }
                  </button>
                )}
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between w-full px-4 py-3 bg-teal-500 text-white rounded-xl shadow-lg mb-2">
                  <div className="text-lg font-bold">
                    Connected data sources
                  </div>
                  <div className="px-2 py-1 bg-white/20 text-white text-xs font-bold rounded-lg">{resources.length}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {resources.slice(0, expandedSections.resources ? resources.length : 6).map((resource, index) => (
                    <button
                      key={resource.uri}
                      onClick={() => onAddTag({ 
                        type: 'resource', 
                        name: resource.name || resource.uri, 
                        description: resource.description,
                        serverId: resource.serverId,
                        serverName: resource.serverName
                      })}
                      className="relative p-4 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-left"
                    >

                                              <div>
                          <div className="inline-flex items-center px-3 py-1.5 bg-teal-500 text-white text-sm font-bold rounded-xl shadow-lg mb-2 break-words max-w-full">
                            <span className="break-words">{resource.name || 'Resource'}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {resource.serverName}
                          </div>
                        </div>
                    </button>
                  ))}
                </div>

                {resources.length > 6 && (
                  <button 
                    onClick={() => setExpandedSections(prev => ({ ...prev, resources: !prev.resources }))}
                    className="w-full p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-dashed border-border"
                  >
                    ↓ {expandedSections.resources 
                      ? 'Show less' 
                      : `${resources.length - 6} more resources`
                    }
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-4 bg-muted">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {activeTools > 0 ? `${activeTools} tools active` : 'No tools connected'}
              </div>
              <button className="text-xs text-primary hover:underline">
                Manage Connections
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar; 