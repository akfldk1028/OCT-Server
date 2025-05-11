import { useState } from 'react';
import {
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Settings,
  Plus,
  Trash2,
  Server,
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ServerInfo {
  id: string;
  name: string;
  status: 'stopped' | 'running' | 'error' | 'starting' | 'stopping';
  type: string;
  serverType?: string;
  host?: string;
  port?: number;
  sessionId?: string;
  activeSessions?: number;
  config?: {
    command?: string;
    args?: string[];
    transportType?: 'stdio' | 'sse' | 'streamable-http';
    sseUrl?: string;
    env?: Record<string, string>;
    execution?: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
  mcpClient?: any;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting' | 'error' | 'error-connecting-to-proxy';
  lastError?: string;
}

interface ServerManagementSidebarProps {
  servers: ServerInfo[];
  selectedServer: ServerInfo | null;
  selectedServers: Set<string>;
  setSelectedServer: (server: ServerInfo | null) => void;
  setSelectedServers: (servers: Set<string>) => void;
  startServer: (serverId: string) => Promise<void>;
  stopServer: (serverId: string) => Promise<void>;
  startMultiple: () => Promise<void>;
  stopMultiple: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  addNewServer?: (serverConfig: {
    name: string;
    command: string;
    args: string[];
    transportType: 'stdio' | 'sse' | 'streamable-http';
    env?: Record<string, string>;
  }) => Promise<void>;
}

function ServerManagementSidebar({
  servers,
  selectedServer,
  selectedServers,
  setSelectedServer,
  setSelectedServers,
  startServer,
  stopServer,
  startMultiple,
  stopMultiple,
  refreshStatus,
  addNewServer,
}: ServerManagementSidebarProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAddServer, setShowAddServer] = useState(false);

  // New server form
  const [newServerName, setNewServerName] = useState('');
  const [newServerCommand, setNewServerCommand] = useState('');
  const [newServerArgs, setNewServerArgs] = useState('');
  const [newServerTransport, setNewServerTransport] = useState<
    'stdio' | 'sse' | 'streamable-http'
  >('stdio');

  const handleServerSelect = (server: ServerInfo) => {
    setSelectedServer(server);
  };

  const handleServerToggle = (serverId: string) => {
    const newSelected = new Set(selectedServers);
    if (newSelected.has(serverId)) {
      newSelected.delete(serverId);
    } else {
      newSelected.add(serverId);
    }
    setSelectedServers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedServers.size === servers.length) {
      setSelectedServers(new Set());
    } else {
      setSelectedServers(new Set(servers.map((s) => s.id)));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'stopped':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'starting':
      case 'stopping':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '실행중';
      case 'stopped':
        return '중지됨';
      case 'error':
        return '오류';
      case 'starting':
        return '시작중';
      case 'stopping':
        return '중지중';
      default:
        return status;
    }
  };

  const handleAddNewServer = async () => {
    if (addNewServer) {
      // 추가 되기전에 name 중복 체크
      const existingServer = servers.find((s) => s.name === newServerName);
      if (existingServer) {
        // TODO: 에러 표시
        alert('같은 이름의 서버가 이미 존재합니다.');
        return;
      }

      try {
        await addNewServer({
          name: newServerName,
          command: newServerCommand,
          args: newServerArgs.split(' ').filter((arg) => arg.trim()),
          transportType: newServerTransport,
          env: {},
        });

        setShowAddServer(false);
        // Reset form
        setNewServerName('');
        setNewServerCommand('');
        setNewServerArgs('');
        setNewServerTransport('stdio');
      } catch (error) {
        console.error('Failed to add server:', error);
        alert(
          `서버 추가 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Server className="w-5 h-5 mr-2" />
          <h1 className="text-lg font-semibold">MCP 서버 관리</h1>
        </div>
        <Button
          onClick={refreshStatus}
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          title="새로고침"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Batch Controls */}
      {selectedServers.size > 0 && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {selectedServers.size}개 서버 선택됨
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedServers(new Set())}
            >
              선택 해제
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={startMultiple}
              size="sm"
              className="flex-1"
              variant="default"
            >
              <Play className="w-3 h-3 mr-1" />
              일괄 시작
            </Button>
            <Button
              onClick={stopMultiple}
              size="sm"
              className="flex-1"
              variant="destructive"
            >
              <Square className="w-3 h-3 mr-1" />
              일괄 종료
            </Button>
          </div>
        </div>
      )}

      {/* Server List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* Select All Checkbox */}
          <div className="flex items-center mb-2 px-2 py-1">
            <input
              type="checkbox"
              checked={
                selectedServers.size === servers.length && servers.length > 0
              }
              onChange={handleSelectAll}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">전체 선택</span>
          </div>

          {/* Server List */}
          {servers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Server className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>서버가 없습니다</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setShowAddServer(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                서버 추가
              </Button>
            </div>
          ) : (
            servers.map((server) => (
              <div
                key={server.id}
                className={`mb-2 p-3 rounded border transition-colors ${
                  selectedServer?.id === server.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedServers.has(server.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleServerToggle(server.id);
                    }}
                    className="mr-3"
                  />
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleServerSelect(server)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="font-medium text-sm">
                          {server.name}
                        </span>
                        <span className="ml-2">
                          {getStatusIcon(server.status)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {getStatusText(server.status)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {server.config?.command || 'No command'}
                      {server.activeSessions
                        ? ` • ${server.activeSessions} 세션`
                        : ''}
                    </div>
                    {server.lastError && (
                      <div className="text-xs text-red-500 mt-1 truncate">
                        Error: {server.lastError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Server Controls */}
                <div className="flex gap-2 mt-3">
                  {server.status === 'running' ? (
                    <Button
                      key={`stop-${server.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        stopServer(server.id);
                      }}
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      종료
                    </Button>
                  ) : (
                    <Button
                      key={`start-${server.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startServer(server.id);
                      }}
                      size="sm"
                      variant="default"
                      className="flex-1"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      시작
                    </Button>
                  )}
                  <Button
                    key={`restart-${server.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Restart server
                      stopServer(server.id).then(() => {
                        setTimeout(() => startServer(server.id), 1000);
                      });
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                  <Button
                    key={`details-${server.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Show server details
                      setShowDetails(!showDetails);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Activity className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Server Details */}
      {selectedServer && (
        <div className="border-t border-gray-200 bg-gray-50">
          <Button
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between py-2 px-4"
          >
            <div className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              <span className="text-sm">서버 상세 정보</span>
            </div>
            {showDetails ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>

          {showDetails && (
            <div className="p-4 space-y-3 text-sm">
              <div>
                <label className="text-gray-600">이름:</label>
                <p className="font-medium">{selectedServer.name}</p>
              </div>
              <div>
                <label className="text-gray-600">상태:</label>
                <p className="font-medium">
                  {getStatusText(selectedServer.status)}
                </p>
              </div>
              <div>
                <label className="text-gray-600">명령어:</label>
                <p className="font-mono text-xs bg-white p-2 rounded border">
                  {selectedServer.config?.command || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-gray-600">인자:</label>
                <p className="font-mono text-xs bg-white p-2 rounded border">
                  {selectedServer.config?.args?.join(' ') || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-gray-600">전송 방식:</label>
                <p className="font-medium">
                  {selectedServer.config?.transportType || 'stdio'}
                </p>
              </div>
              {selectedServer.sessionId && (
                <div>
                  <label className="text-gray-600">세션 ID:</label>
                  <p className="font-mono text-xs bg-white p-2 rounded border">
                    {selectedServer.sessionId}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Server Modal */}
      {showAddServer && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-lg font-semibold mb-4">새 서버 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">서버 이름</label>
                <Input
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="서버 이름"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">명령어</label>
                <Input
                  value={newServerCommand}
                  onChange={(e) => setNewServerCommand(e.target.value)}
                  placeholder="실행 명령어"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">인자</label>
                <Input
                  value={newServerArgs}
                  onChange={(e) => setNewServerArgs(e.target.value)}
                  placeholder="명령어 인자"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">전송 방식</label>
                <Select
                  value={newServerTransport}
                  onValueChange={(value: 'stdio' | 'sse' | 'streamable-http') =>
                    setNewServerTransport(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">STDIO</SelectItem>
                    <SelectItem value="sse">SSE</SelectItem>
                    <SelectItem value="streamable-http">
                      Streamable HTTP
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleAddNewServer} className="flex-1">
                추가
              </Button>
              <Button
                onClick={() => setShowAddServer(false)}
                variant="outline"
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddServer(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          서버 추가
        </Button>

      </div>
    </div>
  );
}

export default ServerManagementSidebar;
