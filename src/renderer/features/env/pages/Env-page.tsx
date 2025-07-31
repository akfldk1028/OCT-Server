import { useParams, useOutletContext } from 'react-router';
import { ChatList } from '../../../common/components/chat/index';
import { useChatCreation } from '../../../common/components/chat/useChatCreation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Settings, Server, Key, Edit, Copy, Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react';
import { ServerLayoutContext } from '../types/env-types';
import { useState, useEffect } from 'react';

export default function EnvPage() {
  const { servers, clients } = useOutletContext<ServerLayoutContext>();
  
  // 🔥 각 서버별 ENV를 KEY=VALUE 형태로 관리
  const [envData, setEnvData] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [editingServers, setEditingServers] = useState<Record<number, boolean>>({});

  console.log('🔍 [EnvPage] 데이터:', { servers: servers.length, clients: clients.length });

  // 🔥 기존 ENV 데이터 로드
  useEffect(() => {
    const loadExistingEnvData = () => {
      const allEnvData: Record<string, string> = {};
      
      servers.forEach((server) => {
        // 기존 user_env_variables에서 ENV 데이터 파싱
        if (server.user_env_variables) {
          try {
            const userEnvVars = server.user_env_variables as Record<string, any>;
            Object.entries(userEnvVars).forEach(([key, value]) => {
              allEnvData[`${server.id}-${key}`] = String(value || '');
            });
          } catch (error) {
            console.warn('ENV 데이터 파싱 실패:', error);
          }
        }

        // mcp_configs에서 기본값들도 로드
        if (server.mcp_configs) {
          server.mcp_configs.forEach((config) => {
            const configKey = `${server.id}-${config.config_name || 'unknown'}`;
            if (!allEnvData[configKey] && config.env) {
              try {
                const configEnv = config.env as Record<string, any>;
                Object.entries(configEnv).forEach(([key, value]) => {
                  const fullKey = `${server.id}-${key}`;
                  if (!allEnvData[fullKey]) {
                    allEnvData[fullKey] = String(value || '');
                  }
                });
              } catch (error) {
                console.warn('Config ENV 파싱 실패:', error);
              }
            }
          });
        }
      });

      setEnvData(allEnvData);
    };

    loadExistingEnvData();
  }, [servers]);

  // 서버 편집 모드 토글
  const toggleEditMode = (serverId: number) => {
    setEditingServers(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  // ENV 값 업데이트
  const updateEnvValue = (key: string, value: string) => {
    setEnvData(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  // 서버별 ENV를 KEY=VALUE 형태로 변환
  const generateEnvText = (serverId: number) => {
    const serverKeys = Object.keys(envData).filter(key => key.startsWith(`${serverId}-`));
    return serverKeys
      .map(key => {
        const envKey = key.replace(`${serverId}-`, '');
        const envValue = envData[key] || '';
        return `${envKey}=${envValue}`;
      })
      .join('\n');
  };

  // ENV 텍스트에서 개별 키-값으로 파싱
  const parseEnvText = (serverId: number, envText: string) => {
    const lines = envText.split('\n');
    const newEnvData = { ...envData };
    
    // 기존 서버 데이터 삭제
    Object.keys(newEnvData).forEach(key => {
      if (key.startsWith(`${serverId}-`)) {
        delete newEnvData[key];
      }
    });

    // 새 데이터 파싱
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && trimmedLine.includes('=') && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        if (key.trim()) {
          newEnvData[`${serverId}-${key.trim()}`] = value.trim();
        }
      }
    });

    setEnvData(newEnvData);
    setHasChanges(true);
  };

  // 모든 변경사항 저장
  const saveAllChanges = async () => {
    console.log('💾 [EnvPage] 모든 환경변수 저장:', envData);
    
    // 서버별로 ENV 데이터 그룹핑
    const serverEnvMap: Record<number, Record<string, string>> = {};
    
    Object.entries(envData).forEach(([key, value]) => {
      const [serverIdStr, ...keyParts] = key.split('-');
      const serverId = parseInt(serverIdStr);
      const envKey = keyParts.join('-');
      
      if (!serverEnvMap[serverId]) {
        serverEnvMap[serverId] = {};
      }
      serverEnvMap[serverId][envKey] = value;
    });

    console.log('📊 [EnvPage] 서버별 ENV 데이터:', serverEnvMap);
    
    // TODO: 실제 DB 저장 로직 구현 (user_env_variables 필드 업데이트)
    // await updateUserEnvVariables(serverId, serverEnvMap[serverId]);
    
    setHasChanges(false);
  };

  // 서버 상태별 색상
  const getServerStatusColor = (server: any) => {
    const success = server.install_status === 'success';
    const failed = server.install_status === 'failed';
    return success ? 'bg-green-500' : failed ? 'bg-red-500' : 'bg-yellow-500';
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        {/* 🔥 컴팩트 헤더 */}
        <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">환경변수 관리</h1>
            <p className="text-sm text-gray-600">{servers.length}개 서버 • {Object.keys(envData).length}개 환경변수</p>
          </div>
          
          {hasChanges && (
            <Button onClick={saveAllChanges} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              저장
            </Button>
          )}
        </div>

        {/* 서버 목록이 없는 경우 */}
        {servers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Server className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">설치된 MCP 서버가 없습니다</h3>
            <p className="text-sm text-gray-600">먼저 MCP 서버를 설치한 후 환경변수를 설정하세요</p>
          </div>
        ) : (
          /* 🔥 초컴팩트 서버 리스트 */
          <div className="space-y-2">
            {servers.map((server) => {
              const serverEnvText = generateEnvText(server.id);
              const hasExistingEnv = serverEnvText.trim().length > 0;
              const isEditing = editingServers[server.id];
              const envCount = serverEnvText.split('\n').filter(line => line.trim() && !line.startsWith('#')).length;
              
              return (
                <div key={server.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* 🔥 초컴팩트 헤더 (한 줄) */}
                  <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full ${getServerStatusColor(server)} flex-shrink-0`} />
                      
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {server.mcp_servers?.name || '알 수 없는 서버'}
                        </h3>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {server.install_status || 'unknown'}
                        </Badge>
                        
                        {hasExistingEnv && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            <Key className="w-3 h-3 mr-1" />
                            {envCount}
                          </Badge>
                        )}
                        
                        <span className="text-xs text-gray-500">{server.total_runs || 0}회</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEditMode(server.id)}
                        className="h-7 px-2 text-xs"
                      >
                        {isEditing ? (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            완료
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-3 h-3 mr-1" />
                            {hasExistingEnv ? '보기' : '설정'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 🔥 확장 영역 (편집 모드일 때만) */}
                  {isEditing && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* 좌측: 간단한 정보 */}
                        <div className="lg:col-span-1 space-y-2">
                          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">서버 정보</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">설치일:</span>
                              <span className="text-gray-700">{new Date(server.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">실행 상태:</span>
                              <span className="text-gray-700">{server.execution_status || 'never_run'}</span>
                            </div>
                          </div>
                        </div>

                        {/* 우측: ENV 편집 */}
                        <div className="lg:col-span-3">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-medium text-gray-700">환경변수 (KEY=VALUE)</Label>
                            {hasExistingEnv && (
                              <span className="text-xs text-gray-500">{envCount}개 설정됨</span>
                            )}
                          </div>

                          <Textarea
                            placeholder="API_KEY=your_api_key_here&#10;DATABASE_URL=postgresql://user:pass@localhost:5432/db&#10;DEBUG=true"
                            value={serverEnvText}
                            onChange={(e) => parseEnvText(server.id, e.target.value)}
                            className="min-h-[120px] font-mono text-xs resize-none"
                            spellCheck={false}
                          />

                          {/* 추천 템플릿 (있는 경우만, 매우 컴팩트) */}
                          {server.mcp_configs && server.mcp_configs.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <h5 className="text-xs font-medium text-gray-700 mb-2">추천 템플릿</h5>
                              <div className="flex flex-wrap gap-1">
                                {server.mcp_configs.map((config) => {
                                  if (!config.env) return null;
                                  
                                  try {
                                    const configEnv = config.env as Record<string, any>;
                                    return Object.entries(configEnv).map(([key, value]) => (
                                      <button
                                        key={`${config.id}-${key}`}
                                        onClick={() => {
                                          const currentEnv = generateEnvText(server.id);
                                          const newLine = `${key}=${String(value || '')}`;
                                          const updatedEnv = currentEnv ? `${currentEnv}\n${newLine}` : newLine;
                                          parseEnvText(server.id, updatedEnv);
                                        }}
                                        className="inline-flex items-center px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs font-mono text-blue-800 hover:bg-blue-100 transition-colors"
                                      >
                                        <Plus className="w-2.5 h-2.5 mr-1" />
                                        {key}
                                      </button>
                                    ));
                                  } catch {
                                    return null;
                                  }
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 