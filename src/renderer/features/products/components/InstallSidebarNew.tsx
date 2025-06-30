// renderer/features/products/components/InstallSidebarNew.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { CopyIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../../../common/components/ui/sheet'
import { Button } from '../../../common/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../../common/components/ui/tabs'
import { Input } from '../../../common/components/ui/input'
import { Label } from '../../../common/components/ui/label'
import { Tables } from '../../../database.types'
import { useStore, useDispatch } from '../../../hooks/useStore'
import { MCPServerDetailView } from "../types/MCPServerDetailTypes"
import { useOutletContext } from 'react-router'
import { supabase } from '../../../supa-client'
import type { Database } from '../../../supa-client'
import { checkUserServerInstallStatus, getUserServerAllInstallRecords } from '../queries'

// 🔥 새로운 커스텀 훅들
import { useInstallStatus } from '../hooks/useInstallStatus'
import { useEnvironmentVariables } from '../hooks/useEnvironmentVariables'

interface InstallSidebarProps {
  product: MCPServerDetailView
  onClose: () => void
  isOpen: boolean
}

// 🔥 기존 useInstaller 훅 - 단순화
function useInstaller(serverName: string) {
  const store = useStore();
  const installer = store.installer;

  return {
    progress: installer?.installProgress?.[serverName] || null,
    availableMethods: installer?.availableMethods || {},
    installedServer: installer?.installedServers?.[serverName] || null,
    isInstalling: installer?.installProgress?.[serverName]?.percent > 0 && 
                  installer?.installProgress?.[serverName]?.percent < 100,
  };
}

export function InstallSidebarNew({ product, onClose, isOpen }: InstallSidebarProps) {
  const dispatch = useDispatch();
  const { userId } = useOutletContext<{
    isLoggedIn: boolean;
    name: string;
    userId: string;
    username: string;
    avatar: string | null;
    email: string;
  }>();

  // 🔥 기본 데이터 처리 - 메모이제이션
  const { installMethods, configOptions, isZeroInstall, processedMethods, commandGroups, commands } = useMemo(() => {
    const methods = product.install_methods || [];
    const configs = product.config_options || [];
    const zeroInstall = methods.length === 0;

    // 설치 방법 전처리 (모든 방법 포함, 필터링 없음)
    const processed: any[] = [];
    
    if (zeroInstall) {
      configs.forEach((config) => {
        processed.push({
          command: config.command,
          args: config.args,
          env: config.env || {},
          platform: config.platform || 'unknown',
          config_name: config.config_name,
          is_recommended: config.is_recommended,
          is_zero_install: true,
          description: `${(config.platform || 'unknown').toUpperCase()}로 설치`,
          config_id: config.id,
          id: config.id
        });
      });
    } else {
      methods.forEach((method) => {
        if (method.is_zero_install) {
          processed.unshift(method);
        } else if (method.is_multi_command && method.multi_command) {
          const multiCmd = method.multi_command;
          if (multiCmd.commands && Array.isArray(multiCmd.commands)) {
            multiCmd.commands.forEach((cmd: any) => {
              processed.push({
                ...method,
                command: cmd.command,
                args: cmd.args,
                env: multiCmd.env || method.env || {}
              });
            });
          }
        } else if (method.command) {
          processed.push(method);
        } else if (method.is_zero_install) {
          processed.push(method);
        }
      });
    }

    // 우선순위 정렬
    const sorted = [...processed].sort((a, b) => {
      if (a.is_zero_install && !b.is_zero_install) return -1;
      if (!a.is_zero_install && b.is_zero_install) return 1;
      if (a.command === 'npx' && b.command !== 'npx') return -1;
      if (a.command !== 'npx' && b.command === 'npx') return 1;
      return 0;
    });

    // 명령어별 그룹화
    const groups: Record<string, any[]> = {};
    sorted.forEach((method) => {
      let groupKey = method.command;
      if (method.is_zero_install && !groupKey) {
        groupKey = 'zero-install';
      }
      
      if (groupKey) {
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(method);
      }
    });

    // Zero-install인데 그룹이 비어있으면 기본 그룹 생성
    if (Object.keys(groups).length === 0 && zeroInstall) {
      groups['zero-install'] = [{
        command: null,
        args: [],
        env: {},
        is_zero_install: true,
        description: 'Zero-Install Server (설치 불필요)'
      }];
    }

    return {
      installMethods: methods,
      configOptions: configs,
      isZeroInstall: zeroInstall,
      processedMethods: sorted,
      commandGroups: groups,
      commands: Object.keys(groups)
    };
  }, [product.install_methods, product.config_options]);

  const [activeCommand, setActiveCommand] = useState(commands[0] || '');

  // 🔥 커스텀 훅들 사용
  const serverId = String(product.id ?? '');
  const { progress, availableMethods, installedServer, isInstalling } = useInstaller(serverId);
  
  const {
    dbInstallStatus,
    isCheckingDb,
    dbCheckRetryCount,
    isActuallyInstalled,
    actualInstallMethods,
    refreshInstallStatus
  } = useInstallStatus({ 
    userId: userId || '', 
    productId: product.id || 0 
  });

  const {
    envValues,
    envErrors,
    handleEnvChange,
    isEnvValid
  } = useEnvironmentVariables({ 
    commandGroups, 
    activeCommand 
  });

  // 🔥 설치 상태 메시지 - 메모이제이션
  const installStatusMessage = useMemo(() => {
    if (dbCheckRetryCount > 0) {
      return `🔄 설치 상태 확인 중... (${dbCheckRetryCount}/3번째 재시도)`;
    }
    if (isCheckingDb) return '🔍 설치 상태 확인 중...';
    
    if (dbInstallStatus.length > 0) {
      const methods = actualInstallMethods.map(m => m.command || 'unknown').join(', ');
      return `✅ 설치 완료 (${methods}) - ${dbInstallStatus.length}개 방법`;
    }
    
    if (installedServer && !dbInstallStatus.length) {
      return `✅ 설치 완료 (${installedServer.installMethod}) - 동기화 대기 중`;
    }
    
    if (progress?.error) return `❌ 설치 실패: ${progress.error}`;
    if (progress?.percent === 100) return `✅ ${progress.status}`;
    if (progress) return `${progress.status} (${progress.percent}%) - ${progress.currentStep || ''}`;
    
    return '';
  }, [dbCheckRetryCount, isCheckingDb, dbInstallStatus, actualInstallMethods, installedServer, progress]);

  // 🔥 설치 핸들러 - useCallback으로 최적화
  const handleInstall = useCallback(async (serverId: string, command: string) => {
    if (isInstalling || isActuallyInstalled) return;

    const currentMethods = commandGroups[command] || [];
    const currentMethod = currentMethods[0];
    
    const defaultEnvVars = currentMethod?.env || {};
    const userEnvVars = envValues[command] || {};
    const commandEnvVars = { ...defaultEnvVars, ...userEnvVars };

    try {
      const isZeroInstallRequest = currentMethod?.is_zero_install || 
                                   currentMethods.some((m: any) => m.is_zero_install);
      
      await dispatch({
        type: 'installer.installServer',
        payload: {
          serverName: serverId,
          config: {
            is_zero_install: isZeroInstallRequest,
            type: command,
            install_method: command,
            env: commandEnvVars,
            package: product.name,
            source: product.github_url,
            description: product.description,
            command: currentMethod?.command || (command === 'zero-install' ? null : command),
            args: currentMethod?.args || [],
            install_method_id: currentMethod?.config_id || currentMethod?.id || null,
            ...commandEnvVars
          },
          preferredMethod: command,
          selectedInstallMethod: currentMethod,
          userProfileId: userId
        }
      });

      // 설치 완료 후 DB 상태 새로고침
      setTimeout(refreshInstallStatus, 3000);
    } catch (error) {
      console.error('설치 중 오류:', error);
    }
  }, [isInstalling, isActuallyInstalled, commandGroups, envValues, dispatch, product, userId, refreshInstallStatus]);

  // 🔥 제거 핸들러 - 간단한 DB 삭제
  const handleUninstall = useCallback(async (serverId: string) => {
    try {
      console.log('🗑️ [handleUninstall] 제거 시작:', serverId, { userId });
      
      if (!userId) {
        console.error('❌ [handleUninstall] userId가 없습니다');
        return;
      }
      
      const serverIdNum = parseInt(serverId);
      if (isNaN(serverIdNum)) {
        console.error('❌ [handleUninstall] 잘못된 serverId:', serverId);
        return;
      }
      
      // user_mcp_usage에서 해당 서버의 모든 기록 삭제
      console.log('🗑️ [handleUninstall] DB에서 제거 중...', {
        profile_id: userId,
        original_server_id: serverIdNum
      });
      
      const { error } = await supabase
        .from('user_mcp_usage')
        .delete()
        .eq('profile_id', userId)
        .eq('original_server_id', serverIdNum);
      
      if (error) {
        console.error('❌ [handleUninstall] DB 제거 실패:', error);
        throw error;
      }
      
      console.log('✅ [handleUninstall] DB에서 제거 완료');
      
      // 상태 새로고침
      setTimeout(refreshInstallStatus, 1000);
      
    } catch (error) {
      console.error('❌ [handleUninstall] 제거 중 오류:', error);
      setTimeout(refreshInstallStatus, 1000);
    }
  }, [userId, refreshInstallStatus]);

  // 🔥 기타 유틸리티 함수들
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const capitalize = useCallback((s: string) => {
    return s === 'zero-install' ? 'Zero-Install' : s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  // 🔥 설치 버튼 활성화 여부 - OS 호환성 체크 포함
  const isInstallButtonEnabled = useCallback((command: string) => {
    // 🔥 OS 호환성 체크
    const isWindows = availableMethods.powershell === true;
    const isMacOS = availableMethods.brew === true;
    
    // PowerShell은 Windows에서만
    if (command === 'powershell' && !isWindows) {
      console.log(`❌ [InstallSidebar] PowerShell은 Windows에서만 사용 가능`);
      return false;
    }
    
    // Brew는 macOS에서만  
    if (command === 'brew' && !isMacOS) {
      console.log(`❌ [InstallSidebar] Brew는 macOS에서만 사용 가능`);
      return false;
    }
    
    const methodAvailable = availableMethods[command] !== false;
    const currentMethods = commandGroups[command] || [];
    const isZero = currentMethods.some((method: any) => method.is_zero_install);
    const hasEnvVars = currentMethods[0]?.env && Object.keys(currentMethods[0].env).length > 0;
    
    // Zero-install이면 항상 활성화
    if (isZero) return !isInstalling;
    
    // 환경변수가 있으면 유효성 검사, 없으면 방법만 확인
    return hasEnvVars 
      ? (isEnvValid && methodAvailable && !isInstalling)
      : (methodAvailable && !isInstalling);
  }, [availableMethods, commandGroups, isInstalling, isEnvValid]);

  // 🔥 사용 가능한 설치 방법 확인
  useEffect(() => {
    if (Object.keys(availableMethods).length === 0) {
      dispatch({ type: 'installer.checkAvailableMethods', payload: {} });
    }
  }, [availableMethods, dispatch]);

  // 조건부 렌더링
  if (!isZeroInstall && commands.length === 0) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[720px] overflow-y-auto bg-background border-l border-border">
        {/* 🌲 타이틀바 여백 + 헤더 */}
        <div className="pt-12 pb-8">
          <SheetHeader className="space-y-4">
            <div className="flex items-center gap-3">
          
              <div>
                <SheetTitle className="text-2xl font-bold text-foreground">
                  Installation Center
                </SheetTitle>
                <SheetDescription className="text-muted-foreground text-base mt-1">
                  선택한 서버의 설치 방법을 확인하고 실행하세요
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* 🌲 설치 상태 요약 카드 */}
          {installStatusMessage && (
            <div className={`mt-6 p-4 rounded-xl border ${
              installStatusMessage.includes('✅') 
                ? 'bg-primary/5 border-primary/20 text-primary' 
                : installStatusMessage.includes('❌') 
                ? 'bg-destructive/5 border-destructive/20 text-destructive'
                : 'bg-accent/5 border-accent/20 text-accent-foreground'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  installStatusMessage.includes('✅') ? 'bg-primary' :
                  installStatusMessage.includes('❌') ? 'bg-destructive' : 'bg-accent'
                }`} />
                <span className="font-medium">{installStatusMessage}</span>
              </div>
            </div>
          )}

          {/* 🌲 진행 바 */}
          {progress && progress.percent > 0 && progress.percent < 100 && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">설치 진행률</span>
                <span className="text-primary font-medium">{progress.percent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          <Tabs value={activeCommand} onValueChange={setActiveCommand} className="mt-8">
            {/* 🌲 깔끔한 탭 리스트 */}
            <TabsList className="flex w-full bg-muted/50 p-1 rounded-xl h-12 gap-1 justify-start">
              {commands.map((cmd) => {
                const hasZeroInstall = commandGroups[cmd]?.some(method => method.is_zero_install);
                const isUnavailable = availableMethods[cmd] === false;
                
                return (
                  <TabsTrigger 
                    key={cmd} 
                    value={cmd}
                    className={`
                      relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
                      flex-1 max-w-[140px]
                      ${isUnavailable ? 'opacity-50 cursor-not-allowed' : ''}
                      data-[state=active]:bg-background data-[state=active]:shadow-sm
                      data-[state=active]:text-foreground hover:bg-background/50
                    `}
                    disabled={isUnavailable}
                  >
                    <div className="flex items-center justify-center gap-2 w-full">
                      {hasZeroInstall && <span className="text-primary text-xs">⚡</span>}
                      <span className="truncate">{capitalize(cmd)}</span>
                      {isUnavailable && <span className="text-destructive text-xs">✗</span>}
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {commands.map((cmd) => {
              const opts = cmd === 'zero-install' 
                ? commandGroups[cmd] || [] 
                : processedMethods.filter((o) => o.command === cmd);
              
              const display = opts.map(({ command, args, is_zero_install }) => {
                if (is_zero_install) {
                  return {
                    type: 'zero-install',
                    description: 'No installation required',
                    command: command || null,
                    args: args || []
                  };
                }
                return { command, args: args || [] };
              });

              const jsonString = JSON.stringify(display, null, 2);
              const description = opts[0]?.description || '';
              const env = opts[0]?.env || {};
              const hasEnvVars = Object.keys(env).length > 0;
              const commandEnvValues = envValues[cmd] || {};
              const commandErrors = envErrors[cmd] || [];
              const isZero = opts.some((opt: any) => opt.is_zero_install);

              return (
                <TabsContent key={cmd} value={cmd} className="mt-6 space-y-6">
               

                  {/* 🌲 Zero-install 특별 배지 */}
                  {isZero && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                          <span className="text-primary-foreground text-xl">⚡</span>
                        </div>
                        <div>
                          <h3 className="text-primary font-bold text-lg">Zero-Install Server</h3>
                          <p className="text-primary/80 text-sm mt-1">
                            별도 설치 과정 없이 바로 실행 가능한 서버입니다
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 🌲 Configuration 코드 블록 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 bg-accent rounded-full"></span>
                        Configuration
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(jsonString)}
                        className="border-border hover:bg-accent/10 hover:border-accent/30"
                      >
                        <CopyIcon className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="bg-muted/30 px-4 py-2 border-b border-border">
                        <span className="text-xs font-mono text-muted-foreground">JSON</span>
                      </div>
                      <div className="p-4 bg-muted/10">
                        <pre className="text-sm font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-words">
                          {jsonString}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* 🌲 환경변수 설정 */}
                  {hasEnvVars && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Environment Variables
                      </h3>
                      <div className="bg-card border border-border rounded-xl p-6">
                        <div className="space-y-4">
                          {Object.entries(env).map(([key, defaultValue]) => (
                            <div key={key} className="space-y-2">
                              <Label 
                                htmlFor={`env-${cmd}-${key}`} 
                                className="text-sm font-semibold text-foreground flex items-center gap-2"
                              >
                                <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                                {key}
                                <span className="text-xs text-muted-foreground font-normal ml-auto">
                                  기본값: {String(defaultValue)}
                                </span>
                              </Label>
                              <Input
                                id={`env-${cmd}-${key}`}
                                value={commandEnvValues[key] || ''}
                                onChange={(e) => handleEnvChange(cmd, key, e.target.value)}
                                className={`
                                  transition-all duration-200 bg-background
                                  ${commandErrors.includes(key) 
                                    ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
                                    : "border-border focus:border-primary focus:ring-primary/20"
                                  }
                                `}
                                placeholder={String(defaultValue)}
                                disabled={isInstalling}
                              />
                              {commandErrors.includes(key) && (
                                <p className="text-destructive text-xs flex items-center gap-2">
                                  <span className="w-1 h-1 bg-destructive rounded-full"></span>
                                  이 필드는 필수입니다
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 🌲 액션 버튼 영역 */}
                  <div className="pt-6 border-t border-border">
                    {(opts.length > 0 || isZero) && (
                      <div className="flex items-center gap-3">
                        {/* 설치 버튼 */}
                        {!isActuallyInstalled && !isCheckingDb && (
                          <Button
                            onClick={() => handleInstall(serverId, cmd)}
                            disabled={!isInstallButtonEnabled(cmd)}
                            className={`
                              flex-1 h-12 font-semibold transition-all duration-200
                              ${isInstallButtonEnabled(cmd)
                                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                              }
                            `}
                          >
                            {isInstalling ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                                Installing...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>🚀</span>
                                Install Server
                              </div>
                            )}
                          </Button>
                        )}

                        {/* 확인 중 */}
                        {isCheckingDb && (
                          <div className="flex items-center gap-3 flex-1">
                            <Button 
                              disabled 
                              className="flex-1 h-12 bg-muted text-muted-foreground cursor-not-allowed"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div>
                                Checking Status...
                              </div>
                            </Button>
                            {dbCheckRetryCount > 0 && (
                              <Button 
                                onClick={refreshInstallStatus} 
                                variant="outline" 
                                className="h-12 px-6 border-primary/30 text-primary hover:bg-primary/10"
                              >
                                🔄 Refresh
                              </Button>
                            )}
                          </div>
                        )}

                        {/* 새로고침 버튼 */}
                        {!isCheckingDb && dbInstallStatus.length === 0 && !isActuallyInstalled && (
                          <Button
                            onClick={refreshInstallStatus}
                            variant="outline"
                            className="h-12 px-6 border-primary/30 text-primary hover:bg-primary/10"
                          >
                            🔄 Refresh Status
                          </Button>
                        )}

                        {/* 설치 완료 */}
                        {isActuallyInstalled && !isInstalling && !isCheckingDb && (
                          <Button
                            disabled
                            className="flex-1 h-12 bg-primary/10 text-primary border border-primary/20 cursor-not-allowed"
                          >
                            <div className="flex items-center gap-2">
                              <span>✅</span>
                              Installed ({dbInstallStatus.length > 0 ? dbInstallStatus.length : 1})
                            </div>
                          </Button>
                        )}

                        {/* 제거 버튼 */}
                        {isActuallyInstalled && !isCheckingDb && (
                          <Button
                            onClick={() => handleUninstall(serverId)}
                            disabled={isInstalling}
                            variant="destructive"
                            className="h-12 px-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                          >
                            {progress?.status.includes('제거') ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin"></div>
                                Removing...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>🗑️</span>
                                Uninstall
                              </div>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
