// main/stores/installer/installerStore.ts
import { createStore } from 'zustand/vanilla';
import { InstallerState, InstallProgress, InstallResult, InstalledServer, InstallQueueItem } from './installer-types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

// Store imports
import { mcpRegistryStore } from '../mcp/mcpRegistryStore';
import { transportStore } from '../transport/transportStore';

// 🔥 분리된 모듈들 import
import { 
  recordInstallStart, 
  recordInstallResult, 
  recordUninstall,
  getSupabaseClient
} from './installer-db';
import { deleteUserMcpUsage } from '../../../renderer/features/products/queries';
import {
  checkAvailableMethods as checkMethods,
  selectBestMethod,
  handleZeroInstall,
  getAppDataPath,
  verifyAndFixInstallStatus
} from './installer-helpers';
import {
  ensureRequiredTools,
  installWithNpm,
  installWithDocker,
  installWithGit,
  installWithUv,
  installWithPip,
  installWithPowershell,
  installWithBrew,
  installLocal
} from './installer-methods';

const execAsync = promisify(exec);

// 초기 상태
const initialState: InstallerState = {
  installProgress: {},
  installedServers: {},
  availableMethods: {},
  installQueue: [],
  currentInstalling: null,
  // 🔥 상태 변화 알림용
  lastStateChange: 0,
  lastStateChangeType: null,
  lastStateChangeServerId: null,
};

export const installerStore = createStore<InstallerState & {
  // === 설치 방법 관리 ===
  checkAvailableMethods: (payload?: {}) => Promise<Record<string, boolean>>;
  
  // === 설치 관리 ===
  installServer: (payload: { serverName: string, config: any, preferredMethod?: string, userProfileId?: string, selectedInstallMethod?: any }) => Promise<InstallResult>;
  cancelInstall: (payload: { serverName: string }) => void;
  
  // === 제거 관리 ===
  uninstallServer: (payload: { serverName: string, userProfileId?: string }) => Promise<{ success: boolean, error?: string }>;
  isUninstalling: (payload: { serverName: string }) => boolean;
  
  // === 디버깅/확인 ===
  listInstalledServers: (payload?: {}) => Record<string, any>;
  checkServerExists: (payload: { serverName: string }) => boolean;
  
  // === Store 통합 ===
  registerToMcpStore: (payload: { serverName: string }) => Promise<{ success: boolean, error?: string }>;
  startMcpServer: (payload: { serverName: string }) => Promise<{ success: boolean, clientId?: string, error?: string }>;
  
  // === 큐 관리 ===
  addToQueue: (payload: { serverName: string, config: any, priority?: number }) => void;
  removeFromQueue: (payload: { serverName: string }) => void;
  processQueue: (payload?: {}) => Promise<void>;
  clearQueue: (payload?: {}) => void;
  
  // === 상태 조회 ===
  getInstallProgress: (payload: { serverName: string }) => InstallProgress | null;
  getInstalledServer: (payload: { serverName: string }) => InstalledServer | null;
  isInstalling: (payload: { serverName: string }) => boolean;
  
  // === 설치 상태 재확인 ===
  verifyInstallStatus: (payload: { serverName: string, userProfileId: string }) => Promise<{ verified: boolean, methods: string[], updated: boolean }>;
}>((set, get) => ({
  ...initialState,
  
  // === 설치 방법 확인 ===
  checkAvailableMethods: async (payload?: {}) => {
    console.log('🔍 [installerStore] 설치 방법 확인 시작...');
    
    const methods = await checkMethods();
    set({ availableMethods: methods });
    
    // 🔥 NPX가 사용 가능하면 필수 도구 자동 설치
    if (methods.npx) {
      await ensureRequiredTools();
    }
    
    return methods;
  },

  // === 서버 설치 ===
  installServer: async (payload: { serverName: string, config: any, preferredMethod?: string, userProfileId?: string, selectedInstallMethod?: any }) => {
    const { serverName, config, preferredMethod, userProfileId, selectedInstallMethod } = payload;
    console.log(`🚀 [installerStore] ${serverName} 설치 시작`, { userProfileId, selectedInstallMethod });
    
    // 🔥 사용자 MCP 사용 기록 생성 (설치 시작)
    let usageRecord = null;
    try {
      // 환경변수 추출 (config에서 가져오기)
      const userEnvVariables = config.env || config.environment || null;
      console.log('🌍 [installServer] 환경변수 전달:', userEnvVariables);
      
      usageRecord = await recordInstallStart(
        serverName, 
        config.package || config.name || serverName, 
        userProfileId, 
        selectedInstallMethod,
        userEnvVariables
      );
    } catch (recordError) {
      console.log('⚠️ [installServer] 사용 기록 생성 실패, 설치는 계속 진행:', recordError);
    }
    
    try {
      // 🔥 NPX 방식을 사용하는 경우 필수 도구 확인
      if (!preferredMethod || preferredMethod === 'npx') {
        await ensureRequiredTools();
      }
      
      // 진행 상태 초기화
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '설치 시작',
            percent: 0,
            currentStep: '준비 중',
          }
        },
        currentInstalling: serverName
      }));
      
      // Zero-install 체크
      if (config.is_zero_install) {
        console.log(`⚡ [installServer] ${serverName} Zero-install 처리`);
        
        const result = await handleZeroInstall(
          serverName, 
          config,
          (progress) => set((state) => ({
            installProgress: {
              ...state.installProgress,
              [serverName]: progress
            }
          }))
        );
        
        // 🔥 Zero-install도 성공 시 installedServers에 추가
        if (result.success) {
          const installDir = path.join(getAppDataPath(), 'servers', serverName);
          
          set((state) => ({
            installedServers: {
              ...state.installedServers,
              [serverName]: {
                installMethod: 'zero-install',
                installedPath: installDir,
                installedAt: new Date().toISOString(),
                config,
              }
            },
            installProgress: {
              ...state.installProgress,
              [serverName]: {
                serverName,
                status: 'Zero-install 완료',
                percent: 100,
                currentStep: '완료',
              }
            },
            // 🔥 Zero-install 완료 상태 변화 알림
            lastStateChange: Date.now(),
            lastStateChangeType: 'installed',
            lastStateChangeServerId: serverName,
          }));
          
          console.log(`✅ [installServer] ${serverName} Zero-install installedServers 추가 완료`);

          // 🔥 Zero-install 사용자 MCP 설치 상태 업데이트 (설치 완료)
          try {
            await recordInstallResult(usageRecord?.id || null, true);
          } catch (recordError) {
            console.log('⚠️ [installServer] Zero-install 설치 성공 기록 실패:', recordError);
          }



          // 🚀 Zero-install도 MCP Store에 자동 등록
          try {
            console.log(`🔗 [installServer] ${serverName} Zero-install MCP Store 자동 등록 시도...`);
            const registerResult = await get().registerToMcpStore({ serverName });
            
            if (registerResult.success) {
              console.log(`✅ [installServer] ${serverName} Zero-install MCP Store 등록 성공`);
            } else {
              console.log(`⚠️ [installServer] ${serverName} Zero-install MCP Store 등록 실패: ${registerResult.error}`);
            }
          } catch (error) {
            console.log(`⚠️ [installServer] ${serverName} Zero-install MCP Store 등록 중 예외:`, error);
          }


        }
        
        return result;
      }
      
      // 🔥 설치 방법 선택
      let method: string | null = preferredMethod || null;
      
      if (preferredMethod) {
        const { availableMethods } = get();
        
        if (Object.keys(availableMethods).length === 0) {
          await get().checkAvailableMethods();
        }
        
        console.log(`🎯 [installServer] 사용자 선택 방법: ${preferredMethod}`);
        
        if (get().availableMethods[preferredMethod] === false) {
          console.log(`❌ [installServer] ${preferredMethod} 사용 불가능, 대체 방법 찾는 중...`);
          method = await selectBestMethod(config, undefined, get().availableMethods);
        }
      } else {
        method = await selectBestMethod(config, undefined, get().availableMethods);
      }
      
      if (!method) {
        throw new Error('사용 가능한 설치 방법이 없습니다');
      }
      
      console.log(`🔧 [installServer] ${serverName} 설치 방법: ${method}`);
      
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '설치 방법 선택됨',
            percent: 10,
            currentStep: `${method} 방식으로 설치`,
          }
        }
      }));
      
      // 설치 디렉토리 생성
      const installDir = path.join(getAppDataPath(), 'servers', serverName);
      await fs.mkdir(installDir, { recursive: true });
      
      // 설치 방법별 처리
      let result: InstallResult;
      
      switch (method) {
        case 'npm':
        case 'npx':
          result = await installWithNpm({ serverName, config, installDir, method });
          break;
        case 'docker':
          result = await installWithDocker({ serverName, config, installDir });
          break;
        case 'git':
          result = await installWithGit({ serverName, config, installDir });
          break;
        case 'uv':
        case 'uvx':
          result = await installWithUv({ serverName, config, installDir, method });
          break;
        case 'pip':
          result = await installWithPip({ serverName, config, installDir });
          break;
        case 'powershell':
          result = await installWithPowershell({ serverName, config, installDir });
          break;
        case 'brew':
          result = await installWithBrew({ serverName, config, installDir });
          break;
        case 'local':
          result = await installLocal({ serverName, config, installDir });
          break;
        default:
          throw new Error(`지원하지 않는 설치 방법: ${method}`);
      }
      
      if (result.success) {
        // 설치 정보 저장
        set((state) => ({
          installedServers: {
            ...state.installedServers,
            [serverName]: {
              installMethod: method,
              installedPath: installDir,
              installedAt: new Date().toISOString(),
              config,
            }
          },
          installProgress: {
            ...state.installProgress,
            [serverName]: {
              serverName,
              status: '설치 완료',
              percent: 100,
              currentStep: '완료',
            }
          },
          // 🔥 설치 완료 상태 변화 알림
          lastStateChange: Date.now(),
          lastStateChangeType: 'installed',
          lastStateChangeServerId: serverName,
        }));
        
        // 🔥 설치 정보 백업 파일 저장
        const installInfoPath = path.join(installDir, `install-info.json`);
        const installInfo = {
          ...config,
          installedAt: new Date().toISOString(),
          installMethod: method,
          installedPath: installDir,
          success: result.success,
          install_method_id: usageRecord?.install_method_id || null
        };
        await fs.writeFile(installInfoPath, JSON.stringify(installInfo, null, 2));
        
        console.log(`✅ [installServer] ${serverName} 설치 완료`);

        // 🔥 사용자 MCP 설치 상태 업데이트 (설치 완료)
        try {
          await recordInstallResult(usageRecord?.id || null, true);
        } catch (recordError) {
          console.log('⚠️ [installServer] 설치 성공 기록 실패:', recordError);
        }

        // 🚀 설치 완료 후 MCP Store에 자동 등록
        try {
          console.log(`🔗 [installServer] ${serverName} MCP Store 자동 등록 시도...`);
          const registerResult = await get().registerToMcpStore({ serverName });
          
          if (registerResult.success) {
            console.log(`✅ [installServer] ${serverName} MCP Store 등록 성공`);
          } else {
            console.log(`⚠️ [installServer] ${serverName} MCP Store 등록 실패: ${registerResult.error}`);
          }
        } catch (error) {
          console.log(`⚠️ [installServer] ${serverName} MCP Store 등록 중 예외:`, error);
        }


      }
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`❌ [installServer] ${serverName} 설치 실패:`, errorMessage);
      
      // 🔥 사용자 MCP 설치 상태 업데이트 (설치 실패)
      try {
        await recordInstallResult(usageRecord?.id || null, false, errorMessage);
      } catch (recordError) {
        console.log('⚠️ [installServer] 설치 실패 기록 실패:', recordError);
      }
      
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '설치 실패',
            percent: 0,
            currentStep: errorMessage,
            error: errorMessage,
          }
        },
        // 🔥 설치 실패 상태 변화 알림
        lastStateChange: Date.now(),
        lastStateChangeType: 'error',
        lastStateChangeServerId: serverName,
      }));
      

      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      set({ currentInstalling: null });
    }
  },

  // === 설치 취소 ===
  cancelInstall: (payload: { serverName: string }) => {
    const { serverName } = payload;
    console.log(`🛑 [installerStore] ${serverName} 설치 취소`);
    
    set((state) => {
      const { [serverName]: removed, ...restProgress } = state.installProgress;
      return {
        installProgress: restProgress,
        installQueue: state.installQueue.filter(item => item.serverName !== serverName)
      };
    });
  },

  // === 서버 제거 ===
  uninstallServer: async (payload: { serverName: string, userProfileId?: string }) => {
    const { serverName, userProfileId } = payload;
    console.log(`🗑️ [installerStore] ${serverName} 제거 시작`, { userProfileId });
    
    try {
      // 진행 상태 업데이트
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '제거 중',
            percent: 25,
            currentStep: '제거 준비',
          }
        }
      }));

      // 설치된 서버 정보 확인
      const installedServer = get().installedServers[serverName];
      if (!installedServer) {
        throw new Error('설치된 서버를 찾을 수 없습니다');
      }

      console.log(`📁 [uninstallServer] 제거할 디렉토리: ${installedServer.installedPath}`);

      // 설치 디렉토리 삭제
      console.log(`🗂️ [uninstallServer] 설치 디렉토리 삭제: ${installedServer.installedPath}`);
      await fs.rm(installedServer.installedPath, { recursive: true, force: true });
      console.log(`✅ [uninstallServer] 디렉토리 삭제 완료: ${installedServer.installedPath}`);

      // 진행 상태 업데이트
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '제거 중',
            percent: 75,
            currentStep: '상태 정리 중',
          }
        }
      }));

      // 🚀 MCP Registry Store에서 서버 제거
      try {
        console.log(`🗑️ [uninstallServer] MCP Registry에서 서버 제거: ${serverName}`);
        mcpRegistryStore.getState().unregisterServer(serverName);
        console.log(`✅ [uninstallServer] MCP Registry 제거 완료`);
      } catch (error) {
        console.log(`⚠️ [uninstallServer] MCP Registry 제거 실패:`, error);
      }

      // 🚀 활성 Transport 연결 정리
      try {
        console.log(`🔌 [uninstallServer] Transport 연결 정리: ${serverName}`);
        await transportStore.getState().closeAllTransports({ serverId: serverName });
        console.log(`✅ [uninstallServer] Transport 연결 정리 완료`);
      } catch (error) {
        console.log(`⚠️ [uninstallServer] Transport 연결 정리 실패:`, error);
      }

      // 설치된 서버 목록에서 제거
      set((state) => {
        const { [serverName]: removed, ...restServers } = state.installedServers;
        return {
          installedServers: restServers
        };
      });

      // 완료 상태 업데이트
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '제거 완료',
            percent: 100,
            currentStep: '완료',
          }
        },
        // 🔥 제거 완료 상태 변화 알림
        lastStateChange: Date.now(),
        lastStateChangeType: 'uninstalled',
        lastStateChangeServerId: serverName,
      }));

      console.log(`✅ [uninstallServer] ${serverName} 제거 완료`);
      
      // 🔥 DB에서 해당 서버의 모든 설치 기록 삭제
      try {
        if (userProfileId) {
          const client = getSupabaseClient();
          if (client) {
            const serverId = parseInt(serverName);
            if (!isNaN(serverId)) {
              console.log('📝 [uninstallServer] DB에서 해당 서버의 모든 설치 기록 삭제 중...', {
                serverId,
                userProfileId
              });
              
              const deleteResult = await deleteUserMcpUsage(client, {
                profile_id: userProfileId,
                original_server_id: serverId,
              });
              
              console.log('✅ [uninstallServer] 사용자 설치 기록 삭제 완료:', deleteResult);
            }
          }
        }
      } catch (recordError) {
        console.log('⚠️ [uninstallServer] 사용자 제거 기록 업데이트 실패:', recordError);
      }
      


      // 진행 상태를 잠시 후 삭제
      setTimeout(() => {
        set((state) => {
          const { [serverName]: removed, ...restProgress } = state.installProgress;
          return { installProgress: restProgress };
        });
      }, 3000);

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`❌ [uninstallServer] ${serverName} 제거 실패:`, errorMessage);
      
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '제거 실패',
            percent: 0,
            currentStep: errorMessage,
            error: errorMessage,
          }
        },
        // 🔥 제거 실패 상태 변화 알림
        lastStateChange: Date.now(),
        lastStateChangeType: 'error',
        lastStateChangeServerId: serverName,
      }));
      

      
      return { success: false, error: errorMessage };
    }
  },

  isUninstalling: (payload: { serverName: string }) => {
    const { serverName } = payload;
    const progress = get().installProgress[serverName];
    return progress && progress.status.includes('제거') && progress.percent < 100;
  },

  // === 디버깅/확인 함수들 ===
  listInstalledServers: (payload?: {}) => {
    const { installedServers } = get();
    console.log('📋 [listInstalledServers] 현재 설치된 서버들:');
    
    if (Object.keys(installedServers).length === 0) {
      console.log('  ⭕ 설치된 서버가 없습니다');
      return {};
    }
    
    Object.entries(installedServers).forEach(([serverId, info]) => {
      console.log(`  📦 ${serverId}:`, {
        '🔧 설치방법': info.installMethod,
        '📁 경로': info.installedPath,
        '⏰ 설치시간': info.installedAt
      });
    });
    
    return installedServers;
  },

  checkServerExists: (payload: { serverName: string }) => {
    const { serverName } = payload;
    const { installedServers } = get();
    const exists = installedServers[serverName] !== undefined;
    
    console.log(`🔍 [checkServerExists] 서버 '${serverName}' 존재 여부: ${exists ? '✅ 존재함' : '❌ 없음'}`);
    
    if (exists) {
      console.log(`📦 [checkServerExists] 서버 정보:`, installedServers[serverName]);
    }
    
    return exists;
  },


  // === Store 통합 기능 ===
  registerToMcpStore: async (payload: { serverName: string }) => {
    const { serverName } = payload;
    console.log(`🔗 [registerToMcpStore] '${serverName}' MCP Store에 등록 시작`);
    
    try {
      const installedServer = get().installedServers[serverName];
      if (!installedServer) {
        throw new Error('설치된 서버를 찾을 수 없습니다');
      }

      // config.json에서 서버 정보 로드
      const configPath = path.join(installedServer.installedPath, 'config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // MCP 서버 정보 생성
      const mcpServer = {
        id: serverName,
        name: config.package || config.name || serverName,
        description: config.description || `${config.package} MCP Server`,
        clientId: '',
        transportType: 'stdio' as const,
        command: config.command || 'npx',
        args: config.args || [],
        env: config.env || {},
        autoConnect: false,
        capabilities: {
          tools: true,
          prompts: true,
          resources: true,
        },
        status: 'disconnected' as const,
      };

      console.log(`📋 [registerToMcpStore] MCP 서버 정보:`, mcpServer);

      // 🚀 실제 MCP Registry Store에 등록
      mcpRegistryStore.getState().registerServer(mcpServer);
      
      console.log(`✅ [registerToMcpStore] '${serverName}' MCP Store 등록 완료`);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`❌ [registerToMcpStore] MCP Store 등록 실패:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  startMcpServer: async (payload: { serverName: string }) => {
    const { serverName } = payload;
    console.log(`🚀 [startMcpServer] '${serverName}' MCP 서버 시작`);
    
    try {
      const installedServer = get().installedServers[serverName];
      if (!installedServer) {
        throw new Error('설치된 서버를 찾을 수 없습니다');
      }

      // config.json에서 실행 정보 로드
      const configPath = path.join(installedServer.installedPath, 'config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      console.log(`📋 [startMcpServer] 실행 설정:`, {
        command: config.command,
        args: config.args,
        env: config.env
      });

      // 🚀 Transport Store를 통해 MCP 연결 생성
      const transportConfig = {
        transportType: 'stdio' as const,
        command: config.command,
        args: config.args,
        env: config.env,
      };

      const sessionId = await transportStore.getState().createTransport({
        serverId: serverName,
        config: transportConfig
      });

      console.log(`✅ [startMcpServer] '${serverName}' Transport 연결 완료 (세션 ID: ${sessionId})`);
      
      // 🔗 MCP Registry Store에서 서버 상태 업데이트
      mcpRegistryStore.getState().updateServerStatus(serverName, 'connected');

      return { success: true, clientId: sessionId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`❌ [startMcpServer] MCP 서버 시작 실패:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // === 큐 관리 ===
  addToQueue: (payload: { serverName: string, config: any, priority?: number }) => {
    const { serverName, config, priority = 0 } = payload;
    console.log(`📝 [installerStore] ${serverName} 큐에 추가 (우선순위: ${priority})`);
    
    set((state) => ({
      installQueue: [...state.installQueue, { serverName, config, priority }]
        .sort((a, b) => b.priority - a.priority)
    }));
  },

  removeFromQueue: (payload: { serverName: string }) => {
    const { serverName } = payload;
    set((state) => ({
      installQueue: state.installQueue.filter(item => item.serverName !== serverName)
    }));
  },

  processQueue: async (payload?: {}) => {
    const state = get();
    const { installQueue, currentInstalling } = state;
    
    if (installQueue.length === 0 || currentInstalling) return;
    
    const next = installQueue[0];
    console.log(`🎯 [processQueue] 다음 설치 처리: ${next.serverName}`);
    
    get().removeFromQueue({ serverName: next.serverName });
    await get().installServer({ serverName: next.serverName, config: next.config });
    
    // 재귀적으로 다음 항목 처리
    await get().processQueue({});
  },

  clearQueue: (payload?: {}) => {
    console.log('🧹 [installerStore] 설치 큐 전체 삭제');
    set({ installQueue: [] });
  },

  // === 상태 조회 ===
  getInstallProgress: (payload: { serverName: string }) => {
    const { serverName } = payload;
    return get().installProgress[serverName] || null;
  },

  getInstalledServer: (payload: { serverName: string }) => {
    const { serverName } = payload;
    return get().installedServers[serverName] || null;
  },

  isInstalling: (payload: { serverName: string }) => {
    const { serverName } = payload;
    const progress = get().installProgress[serverName];
    return progress && progress.percent < 100 && progress.percent > 0;
  },

  // === 설치 상태 재확인 ===
  verifyInstallStatus: async (payload: { serverName: string, userProfileId: string }) => {
    const { serverName, userProfileId } = payload;
    console.log(`🔍 [verifyInstallStatus] ${serverName} 설치 상태 재확인 중...`);
    
    try {
      const result = await verifyAndFixInstallStatus(serverName, userProfileId);
      
      if (result.verified) {
        console.log(`✅ [verifyInstallStatus] ${serverName} 설치 확인됨 (${result.methods.join(', ')})`);
        
        // 로컬 설치 정보도 업데이트
        const installDir = path.join(getAppDataPath(), 'servers', serverName);
        set((state) => ({
          installedServers: {
            ...state.installedServers,
            [serverName]: {
              installMethod: result.methods[0] || 'verified',
              installedPath: installDir,
              installedAt: new Date().toISOString(),
              config: { verified: true, methods: result.methods }
            }
          }
        }));
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [verifyInstallStatus] ${serverName} 상태 확인 실패:`, error);
      return {
        verified: false,
        methods: [],
        updated: false
      };
    }
  },
}));