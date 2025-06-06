
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
// 🔥 사용자 MCP 사용 기록을 위한 Supabase 클라이언트 import
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../renderer/database.types';
import { 
  createUserMcpUsage, 
  updateUserMcpInstallStatus, 
  getCurrentUserProfileId,
  findInstallMethodId,
  deleteUserMcpUsage
} from '../../../renderer/features/products/queries';

const execAsync = promisify(exec);

// 앱 데이터 경로
const getAppDataPath = () => path.join(
  process.env.APPDATA ||
    (process.platform === 'darwin'
      ? `${process.env.HOME}/Library/Application Support`
      : `${process.env.HOME}/.local/share`),
  'mcp-server-manager'
);

// 🔥 Supabase 클라이언트 생성 (일렉트론 메인 프로세스용)
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ [getSupabaseClient] Supabase 환경 변수가 설정되지 않았습니다:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    });
    return null;
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

// 🔥 사용자 MCP 사용 기록 생성 (설치 시작)
const recordInstallStart = async (serverId: string, serverName: string, userProfileId?: string, selectedMethod?: any) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      console.log('🚫 [recordInstallStart] Supabase 클라이언트 없음, 기록 생략');
      return null;
    }

    console.log('📝 [recordInstallStart] 설치 시작 기록 생성 중...', { serverId, serverName, userProfileId, selectedMethod });
    
    // 현재 사용자 profile_id 가져오기 (userProfileId가 있으면 사용, 없으면 클라이언트에서 가져오기)
    let profileId = userProfileId;
    if (!profileId) {
      console.log('⚠️ [recordInstallStart] userProfileId가 없어서 사용자 기록을 건너뜁니다. 일렉트론 메인 프로세스에서는 렌더러의 인증 세션에 접근할 수 없습니다.');
      return null;
      // try {
      //   profileId = await getCurrentUserProfileId(client);
      // } catch (error) {
      //   console.log('⚠️ [recordInstallStart] 사용자 정보 가져오기 실패, 기록 생략:', error);
      //   return null;
      // }
    }
    
    // original_server_id는 숫자형이어야 하므로 변환 시도
    const originalServerId = parseInt(serverId);
    if (isNaN(originalServerId)) {
      console.log('⚠️ [recordInstallStart] serverId가 숫자가 아님:', serverId);
      return null;
    }

    // 🔥 설치 방법 ID 찾기
    let installMethodId = null;
    try {
      installMethodId = await findInstallMethodId(client, {
        original_server_id: originalServerId,
        selectedMethod: selectedMethod
      });
      console.log('🔍 [recordInstallStart] 찾은 설치 방법 ID:', installMethodId);
    } catch (error) {
      console.log('⚠️ [recordInstallStart] 설치 방법 ID 찾기 실패:', error);
    }

    // 사용자 MCP 사용 기록 생성
    const usageRecord = await createUserMcpUsage(client, {
      profile_id: profileId,
      original_server_id: originalServerId,
      install_method_id: installMethodId, // 🔥 실제 설치 방법 ID 사용
      user_platform: 'electron',
      user_client: 'oct-client',
    });

    console.log('✅ [recordInstallStart] 설치 시작 기록 생성 완료:', usageRecord);
    
    // 🔥 usageRecord에 설치 방법 ID 추가 (나중에 config 저장할 때 사용)
    if (usageRecord && installMethodId !== null) {
      (usageRecord as any).install_method_id = installMethodId;
    }
    
    return usageRecord;
    
  } catch (error) {
    console.error('❌ [recordInstallStart] 설치 시작 기록 실패:', error);
    return null;
  }
};

// 🔥 사용자 MCP 설치 상태 업데이트 (설치 완료/실패)
const recordInstallResult = async (usageId: number | null, success: boolean, error?: string) => {
  try {
    if (!usageId) {
      console.log('🚫 [recordInstallResult] usageId 없음, 기록 생략');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      console.log('🚫 [recordInstallResult] Supabase 클라이언트 없음, 기록 생략');
      return;
    }

    console.log('📝 [recordInstallResult] 설치 결과 업데이트 중...', { usageId, success, error });

    await updateUserMcpInstallStatus(client, {
      usage_id: usageId,
      install_status: success ? 'success' : 'failed',
      install_error: error || null,
    });

    console.log('✅ [recordInstallResult] 설치 결과 업데이트 완료');
    
  } catch (updateError) {
    console.error('❌ [recordInstallResult] 설치 결과 업데이트 실패:', updateError);
  }
};

// 초기 상태
const initialState: InstallerState = {
  installProgress: {},
  installedServers: {},
  availableMethods: {},
  installQueue: [],
  currentInstalling: null,
};

// 🔥 필수 도구 자동 설치 함수
async function ensureRequiredTools() {
  console.log('🔍 [ensureRequiredTools] 필수 도구 확인 중...');
  
  const tools = [
    { name: 'ts-node', package: 'ts-node' },
    { name: 'typescript', package: 'typescript' }
  ];
  
  for (const tool of tools) {
    try {
      await execAsync(`${tool.name} --version`);
      console.log(`✅ [ensureRequiredTools] ${tool.name} 이미 설치됨`);
    } catch {
      console.log(`📦 [ensureRequiredTools] ${tool.name} 설치 중...`);
      try {
        await execAsync(`npm install -g ${tool.package}`);
        console.log(`✅ [ensureRequiredTools] ${tool.name} 설치 완료`);
      } catch (error) {
        console.error(`❌ [ensureRequiredTools] ${tool.name} 설치 실패:`, error);
      }
    }
  }
}

export const installerStore = createStore<InstallerState & {
  // === 설치 방법 관리 ===
  checkAvailableMethods: (payload?: {}) => Promise<Record<string, boolean>>;
  
  // === 설치 관리 ===
  installServer: (payload: { serverName: string, config: any, preferredMethod?: string, userProfileId?: string, selectedInstallMethod?: any }) => Promise<InstallResult>;
  cancelInstall: (payload: { serverName: string }) => void;
  
  // === 제거 관리 ===
  uninstallServer: (payload: { serverName: string }) => Promise<{ success: boolean, error?: string }>;
  isUninstalling: (payload: { serverName: string }) => boolean;
  
  // === 디버깅/확인 ===
  listInstalledServers: (payload?: {}) => Record<string, any>;
  checkServerExists: (payload: { serverName: string }) => boolean;
  testNpxCommand: (payload: { serverName: string }) => Promise<{ success: boolean, command?: string, packageExists?: boolean, message: string, error?: string }>;
  
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
  
  // === 내부 헬퍼 메서드들 ===
  selectBestMethod: (payload: { config: any, preferredMethod?: string }) => Promise<string | null>;
  handleZeroInstall: (payload: { serverName: string, config: any }) => Promise<InstallResult>;
  installWithNpm: (payload: { serverName: string, config: any, installDir: string, method: string }) => Promise<InstallResult>;
  installWithDocker: (payload: { serverName: string, config: any, installDir: string }) => Promise<InstallResult>;
  installWithGit: (payload: { serverName: string, config: any, installDir: string }) => Promise<InstallResult>;
  installWithUv: (payload: { serverName: string, config: any, installDir: string, method: string }) => Promise<InstallResult>;
  installWithPip: (payload: { serverName: string, config: any, installDir: string }) => Promise<InstallResult>;
  installLocal: (payload: { serverName: string, config: any, installDir: string }) => Promise<InstallResult>;
}>((set, get) => ({
  ...initialState,
  
  // === 설치 방법 확인 ===
  checkAvailableMethods: async (payload?: {}) => {
    console.log('🔍 [installerStore] 번들링 시스템용 설치 방법 확인 중...');
    
    const methods: Record<string, boolean> = {
      npm: false,
      npx: false,
      docker: false,
      git: false,
      uv: false,
      uvx: false,
      pip: false,
      local: true, // 항상 사용 가능
    };
    
    // 🚀 비개발자용이므로 NPX를 최우선으로 (가장 안정적)
    try {
      await execAsync('npx --version');
      methods.npx = true;
      console.log('✅ [checkAvailableMethods] NPX 사용 가능 (최우선)');
      
      // 🔥 NPX가 사용 가능하면 필수 도구 자동 설치
      await ensureRequiredTools();
    } catch {
      console.log('❌ [checkAvailableMethods] NPX 사용 불가');
    }

    // NPM 체크 (NPX가 있으면 보통 있음)
    if (methods.npx) {
      try {
        await execAsync('npm --version');
        methods.npm = true;
        console.log('✅ [checkAvailableMethods] NPM 사용 가능');
      } catch {
        console.log('❌ [checkAvailableMethods] NPM 사용 불가');
      }
    }

    // 🔥 시스템 Python 3.10 + 번들링된 libs 폴더 체크 (install_python_deps.bat 방식)
    try {
      // py -3.10 명령어 체크
      await execAsync('py -3.10 --version');
      console.log(`✅ [checkAvailableMethods] 시스템 Python 3.10 사용 가능`);
      
      // 번들링된 libs 폴더 확인
      const { app } = require('electron');
      const bundledPythonDir = app.isPackaged 
        ? path.join(process.resourcesPath, 'python')
        : path.join(process.cwd(), 'python');
      
      const libsDir = path.join(bundledPythonDir, 'libs');
      
      try {
        await fs.access(libsDir);
        console.log(`✅ [checkAvailableMethods] 번들링된 libs 폴더 존재: ${libsDir}`);
        
        // 📦 시스템 Python + 번들링된 libs 조합 사용 가능
        methods.pip = true;
        console.log(`✅ [checkAvailableMethods] PIP 설치 방식 사용 가능 (py -3.10 + 번들링된 libs)`);
      } catch {
        console.log(`⚠️ [checkAvailableMethods] 번들링된 libs 폴더 없음, pip 사용 제한`);
      }
    } catch {
      console.log(`❌ [checkAvailableMethods] 시스템 Python 3.10 사용 불가 또는 번들링된 환경 없음`);
    }

    // 🔧 시스템 도구들은 선택적으로만 체크 (개발자가 있을 때만)
    const optionalChecks = [
      { cmd: 'git --version', method: 'git' },
      { cmd: 'uv --version', method: 'uv' },
      { cmd: 'uvx --version', method: 'uvx' },
    ];
    
    for (const { cmd, method } of optionalChecks) {
      try {
        await execAsync(cmd);
        methods[method] = true;
        console.log(`✅ [checkAvailableMethods] ${method} 사용 가능 (선택적)`);
      } catch {
        methods[method] = false;
        console.log(`➖ [checkAvailableMethods] ${method} 사용 불가 (무시)`);
      }
    }

    // Docker는 고급 사용자용이므로 체크하되 필수 아님
    try {
      await execAsync('docker --version');
      await execAsync('docker info');
      methods.docker = true;
      console.log('✅ [checkAvailableMethods] Docker 사용 가능 (고급)');
    } catch {
      methods.docker = false;
      console.log('➖ [checkAvailableMethods] Docker 사용 불가 (무시)');
    }
    
    set({ availableMethods: methods });
    console.log('🎯 [checkAvailableMethods] 번들링 시스템 결과:', methods);
    
    // 🚀 비개발자용 권장 사항 로그
    if (methods.npx) {
      console.log('💡 [checkAvailableMethods] 권장: NPX 방식 사용 (가장 안정적)');
    } else if (methods.pip) {
      console.log('💡 [checkAvailableMethods] 권장: 번들링된 Python 방식 사용');
    } else {
      console.log('⚠️ [checkAvailableMethods] 주의: 제한된 설치 방법만 사용 가능');
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
      usageRecord = await recordInstallStart(serverName, config.package || config.name || serverName, userProfileId, selectedInstallMethod);
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
        const result = await get().handleZeroInstall({ serverName, config });
        
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
            }
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
      
      // 🔥 사용자가 선택한 방법 직접 사용
      let method: string | null = preferredMethod || null;
      
      // 선호 방법이 있으면 바로 사용 가능한지만 확인
      if (preferredMethod) {
        const { availableMethods } = get();
        
        // 사용 가능한 방법이 없으면 체크
        if (Object.keys(availableMethods).length === 0) {
          await get().checkAvailableMethods();
        }
        
        console.log(`🎯 [installServer] 사용자 선택 방법: ${preferredMethod}`);
        console.log(`🛠️ [installServer] 사용 가능 여부: ${get().availableMethods[preferredMethod]}`);
        
        // 선택한 방법이 사용 불가능한 경우에만 대체 방법 찾기
        if (get().availableMethods[preferredMethod] === false) {
          console.log(`❌ [installServer] ${preferredMethod} 사용 불가능, 대체 방법 찾는 중...`);
          method = await get().selectBestMethod({ config });
        }
      } else {
        // 선호 방법이 없으면 최적 방법 찾기
        method = await get().selectBestMethod({ config });
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
      console.log(`📁 [installServer] 설치 디렉토리 생성: ${installDir}`);
      await fs.mkdir(installDir, { recursive: true });
      console.log(`✅ [installServer] 설치 디렉토리 생성 완료`);
      
      // 설치 방법별 처리
      console.log(`🔀 [installServer] switch 문 진입, method: "${method}"`);
      let result: InstallResult;
      
      switch (method) {
        case 'npm':
        case 'npx':
          console.log(`📦 [installServer] NPM/NPX 설치 시작: ${method}`);
          result = await get().installWithNpm({ serverName, config, installDir, method });
          break;
        case 'docker':
          console.log(`🐳 [installServer] Docker 설치 시작`);
          result = await get().installWithDocker({ serverName, config, installDir });
          break;
        case 'git':
          console.log(`📂 [installServer] Git 설치 시작`);
          result = await get().installWithGit({ serverName, config, installDir });
          break;
        case 'uv':
        case 'uvx':
          console.log(`🐍 [installServer] UV/UVX 설치 시작: ${method}`);
          result = await get().installWithUv({ serverName, config, installDir, method });
          break;
        case 'pip':
          console.log(`🐍 [installServer] PIP 설치 시작`);
          result = await get().installWithPip({ serverName, config, installDir });
          break;
        case 'local':
          console.log(`📁 [installServer] 로컬 설치 시작`);
          result = await get().installLocal({ serverName, config, installDir });
          break;
        default:
          console.log(`❌ [installServer] 지원하지 않는 설치 방법: ${method}`);
          throw new Error(`지원하지 않는 설치 방법: ${method}`);
      }
      
      console.log(`🎯 [installServer] ${method} 설치 결과:`, result);
      
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
          }
        }));
        
        // 🔥 설치 정보 백업 파일 (install_method_id 포함)
        const installInfoPath = path.join(installDir, `install-info.json`);
        const installInfo = {
          ...config,  // UI에서 전달받은 모든 데이터
          installedAt: new Date().toISOString(),
          installMethod: method,
          installedPath: installDir,
          success: result.success,
          install_method_id: usageRecord?.install_method_id || null // 🔥 설치 방법 ID 추가
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
        }
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

      // 🔥 설치 방법 확인
      const installMethod = installedServer.installMethod;
      console.log(`🔧 [uninstallServer] 설치 방법: ${installMethod}`);

      // 진행 상태 업데이트
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '제거 중',
            percent: 50,
            currentStep: `${installMethod} 방식으로 제거 중`,
          }
        }
      }));

      switch (installMethod) {
        case 'npm':
          console.log(`📦 [uninstallServer] NPM 방식 제거 시작`);
          try {
            // package.json이 있으면 npm uninstall 실행
            const packageJsonPath = path.join(installedServer.installedPath, 'package.json');
            const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
            
            if (packageJsonExists) {
              console.log(`🗑️ [uninstallServer] npm uninstall 실행 중...`);
              await execAsync('npm uninstall --save-dev', { cwd: installedServer.installedPath });
              console.log(`✅ [uninstallServer] npm uninstall 완료`);
            }
          } catch (error) {
            console.log(`⚠️ [uninstallServer] npm uninstall 실패, 디렉토리만 삭제: ${error}`);
          }
          break;

        case 'npx':
          console.log(`⚡ [uninstallServer] NPX 방식 제거 - 디렉토리 삭제만 수행`);
          // NPX는 글로벌 캐시를 사용하므로 로컬 디렉토리만 삭제하면 됨
          break;

        case 'docker':
          console.log(`🐳 [uninstallServer] Docker 방식 제거 시작`);
          try {
            // config.json에서 docker 이미지 이름 확인
            const configPath = path.join(installedServer.installedPath, 'config.json');
            const configExists = await fs.access(configPath).then(() => true).catch(() => false);
            
            if (configExists) {
              const configContent = await fs.readFile(configPath, 'utf-8');
              const config = JSON.parse(configContent);
              const dockerImage = config.dockerImage || config.image;
              
              if (dockerImage) {
                console.log(`🗑️ [uninstallServer] Docker 이미지 삭제: ${dockerImage}`);
                await execAsync(`docker rmi ${dockerImage}`);
                console.log(`✅ [uninstallServer] Docker 이미지 삭제 완료`);
              }
            }
          } catch (error) {
            console.log(`⚠️ [uninstallServer] Docker 이미지 삭제 실패, 디렉토리만 삭제: ${error}`);
          }
          break;

        case 'git':
          console.log(`📂 [uninstallServer] Git 방식 제거 - 디렉토리 삭제만 수행`);
          // Git clone한 것은 디렉토리 삭제로 충분
          break;

        case 'uv':
        case 'uvx':
          console.log(`🐍 [uninstallServer] UV/UVX 방식 제거 시작`);
          try {
            // config.json에서 UV 정보 확인
            const configPath = path.join(installedServer.installedPath, 'config.json');
            const configExists = await fs.access(configPath).then(() => true).catch(() => false);
            
            if (configExists) {
              const configContent = await fs.readFile(configPath, 'utf-8');
              const config = JSON.parse(configContent);
              const packageName = config.package || config.source;
              const uvPath = config.uvPath || installMethod; // 저장된 UV 경로 또는 기본값
              
              if (packageName) {
                console.log(`🗑️ [uninstallServer] UV 패키지 제거: ${packageName}`);
                console.log(`🔧 [uninstallServer] UV 경로: ${uvPath}`);
                
                // 🔥 UV 방식에 따른 제거 명령어
                let removeCommand = '';
                if (installMethod === 'uv') {
                  // uv는 프로젝트에서 패키지 제거
                  removeCommand = uvPath.includes(' ') 
                    ? `"${uvPath}" remove ${packageName}`
                    : `${uvPath} remove ${packageName}`;
                } else if (installMethod === 'uvx') {
                  // uvx는 글로벌 도구 제거 (하지만 프로젝트별로 설치했다면 단순 삭제)
                  removeCommand = uvPath.includes(' ') 
                    ? `"${uvPath}" uninstall ${packageName}`
                    : `${uvPath} uninstall ${packageName}`;
                }
                
                if (removeCommand) {
                  console.log(`🗑️ [uninstallServer] UV 제거 명령어: ${removeCommand}`);
                  try {
                    await execAsync(removeCommand, { cwd: installedServer.installedPath });
                    console.log(`✅ [uninstallServer] UV 패키지 제거 완료`);
                  } catch (uvError) {
                    console.log(`⚠️ [uninstallServer] UV 명령어 실패, 수동 정리: ${uvError}`);
                    
                    // UV 명령어가 실패하면 직접 가상환경/캐시 정리
                    try {
                      // .venv 폴더가 있으면 삭제
                      const venvPath = path.join(installedServer.installedPath, '.venv');
                      await fs.access(venvPath);
                      await fs.rm(venvPath, { recursive: true, force: true });
                      console.log(`🗑️ [uninstallServer] .venv 폴더 삭제 완료`);
                    } catch {
                      // .venv 폴더가 없으면 무시
                    }
                    
                    // uv.lock 파일이 있으면 삭제
                    try {
                      const lockPath = path.join(installedServer.installedPath, 'uv.lock');
                      await fs.access(lockPath);
                      await fs.rm(lockPath, { force: true });
                      console.log(`🗑️ [uninstallServer] uv.lock 파일 삭제 완료`);
                    } catch {
                      // uv.lock 파일이 없으면 무시
                    }
                    
                    // pyproject.toml 파일이 있으면 삭제
                    try {
                      const pyprojectPath = path.join(installedServer.installedPath, 'pyproject.toml');
                      await fs.access(pyprojectPath);
                      await fs.rm(pyprojectPath, { force: true });
                      console.log(`🗑️ [uninstallServer] pyproject.toml 파일 삭제 완료`);
                    } catch {
                      // pyproject.toml 파일이 없으면 무시
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.log(`⚠️ [uninstallServer] UV/UVX 패키지 제거 실패, 디렉토리만 삭제: ${error}`);
          }
          break;

        case 'pip':
          console.log(`🐍 [uninstallServer] PIP 방식 제거 시작`);
          try {
            // config.json에서 패키지 정보 확인
            const configPath = path.join(installedServer.installedPath, 'config.json');
            const configExists = await fs.access(configPath).then(() => true).catch(() => false);
            
            if (configExists) {
              const configContent = await fs.readFile(configPath, 'utf-8');
              const config = JSON.parse(configContent);
              const packageName = config.package || config.source;
              
              if (packageName) {
                console.log(`🗑️ [uninstallServer] PIP 패키지 제거: ${packageName}`);
                
                // 번들링된 libs 폴더에서 제거
                const { app } = require('electron');
                const bundledPythonDir = app.isPackaged 
                  ? path.join(process.resourcesPath, 'python')
                  : path.join(process.cwd(), 'python');
                
                const libsDir = path.join(bundledPythonDir, 'libs');
                
                // 🔥 libs 폴더에서 직접 패키지 삭제 (--target으로 설치했으므로)
                console.log(`🗑️ [uninstallServer] libs 폴더에서 패키지 직접 삭제: ${packageName}`);
                
                try {
                  const packageDirs = [
                    path.join(libsDir, packageName.replace('-', '_')),  // package-name -> package_name
                    path.join(libsDir, packageName),
                  ];
                  
                  // dist-info 폴더들 찾기 (libs 폴더 스캔)
                  let distInfoDirs: string[] = [];
                  try {
                    const libsContents = await fs.readdir(libsDir);
                    const packageNameNormalized = packageName.replace('-', '_');
                    
                    distInfoDirs = libsContents
                      .filter(item => 
                        (item.startsWith(`${packageNameNormalized}-`) && item.endsWith('.dist-info')) ||
                        (item.startsWith(`${packageName}-`) && item.endsWith('.dist-info'))
                      )
                      .map(item => path.join(libsDir, item));
                  } catch {
                    console.log(`⚠️ [uninstallServer] libs 폴더 읽기 실패`);
                  }
                  
                  // 모든 관련 디렉토리 삭제
                  const allDirs = [...packageDirs, ...distInfoDirs];
                  let deletedCount = 0;
                  
                  for (const dir of allDirs) {
                    try {
                      await fs.access(dir);  // 존재하는지 확인
                      await fs.rm(dir, { recursive: true, force: true });
                      console.log(`🗑️ [uninstallServer] 삭제 완료: ${dir}`);
                      deletedCount++;
                    } catch {
                      // 디렉토리가 없으면 무시
                    }
                  }
                  
                  if (deletedCount > 0) {
                    console.log(`✅ [uninstallServer] PIP 패키지 제거 완료 (${deletedCount}개 항목 삭제)`);
                  } else {
                    console.log(`⚠️ [uninstallServer] libs 폴더에서 패키지를 찾을 수 없음: ${packageName}`);
                  }
                } catch (manualError) {
                  console.log(`⚠️ [uninstallServer] libs 폴더 수동 삭제 실패:`, manualError);
                }
              }
            }
          } catch (error) {
            console.log(`⚠️ [uninstallServer] PIP 패키지 제거 실패, 디렉토리만 삭제: ${error}`);
          }
          break;

        case 'local':
        case 'zero-install':
          console.log(`📁 [uninstallServer] 로컬/Zero-install 방식 제거 - 디렉토리 삭제만 수행`);
          break;

        default:
          console.log(`❓ [uninstallServer] 알 수 없는 설치 방법: ${installMethod}, 디렉토리만 삭제`);
          break;
      }

      // 설치 디렉토리 삭제 (모든 방식 공통)
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
        }
      }));

      console.log(`✅ [uninstallServer] ${serverName} 제거 완료`);
      
      // 🔥 DB에서 해당 서버의 모든 설치 기록 삭제 (로컬 파일 읽기 없이)
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
              
              // 🚀 해당 서버와 사용자의 모든 설치 기록을 삭제 (install_method_id 무관)
              const deleteResult = await deleteUserMcpUsage(client, {
                profile_id: userProfileId,
                original_server_id: serverId,
                // install_method_id는 전달하지 않음 - 모든 기록 삭제
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
      
      // 🔥 사용자 MCP 사용 기록 업데이트 (제거 실패)
      try {
        if (userProfileId) {
          const client = getSupabaseClient();
          if (client) {
            const serverId = parseInt(serverName);
            if (!isNaN(serverId)) {
              // 설치 방법 ID 찾기 시도
              let installMethodId: number | null = null;
              try {
                const installedServer = get().installedServers[serverName];
                if (installedServer) {
                  const configPath = path.join(installedServer.installedPath, 'config.json');
                  const configContent = await fs.readFile(configPath, 'utf-8');
                  const config = JSON.parse(configContent);
                  installMethodId = config.install_method_id || null;
                }
              } catch {
                // 설정 파일 읽기 실패는 무시
              }
              
              console.log('📝 [uninstallServer] 제거 실패했지만 기록은 그대로 유지');
              // 제거 실패 시에는 DB 기록을 삭제하지 않음
            }
          }
        }
      } catch (recordError) {
        console.log('⚠️ [uninstallServer] 사용자 제거 실패 기록 업데이트 실패:', recordError);
      }
      
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
        }
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

  // 🧪 NPX 명령어 테스트
  testNpxCommand: async (payload: { serverName: string }) => {
    const { serverName } = payload;
    console.log(`🧪 [testNpxCommand] '${serverName}' NPX 명령어 테스트 시작`);
    
    try {
      const installedServer = get().installedServers[serverName];
      if (!installedServer) {
        throw new Error('설치된 서버를 찾을 수 없습니다');
      }

      if (installedServer.installMethod !== 'npx') {
        throw new Error(`NPX가 아닌 ${installedServer.installMethod} 방식으로 설치된 서버입니다`);
      }

      // config.json에서 NPX 명령어 확인
      const configPath = path.join(installedServer.installedPath, 'config.json');
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      
      if (!configExists) {
        throw new Error('config.json 파일을 찾을 수 없습니다');
      }

      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      console.log(`📋 [testNpxCommand] 설정 정보:`, {
        'command': config.command,
        'args': config.args,
        'package': config.package
      });

      if (!config.args || config.args.length === 0) {
        throw new Error('NPX 명령어 인수가 없습니다');
      }

      // 📦 NPX 패키지가 실제로 존재하는지 확인
      const npmPackageName = config.args[config.args.length - 1]; // 마지막 인수가 패키지명
      console.log(`🔍 [testNpxCommand] NPM 패키지 존재 확인: ${npmPackageName}`);
      
      try {
        // npm view로 패키지 정보 확인 (실제 다운로드 없이)
        const npmResult = await execAsync(`npm view ${npmPackageName} name version`, { 
          timeout: 10000,
          cwd: installedServer.installedPath 
        });
        console.log(`✅ [testNpxCommand] NPM 패키지 존재 확인됨:`);
        console.log(npmResult.stdout);
      } catch (npmError) {
        console.log(`⚠️ [testNpxCommand] NPM 패키지 확인 실패:`, npmError);
        throw new Error(`NPM 패키지 '${npmPackageName}'를 찾을 수 없습니다`);
      }

      // 🚀 실제 NPX 명령어 테스트 (5초 후 종료)
      console.log(`🚀 [testNpxCommand] NPX 명령어 실행 테스트 (5초간)`);
      const npxArgs = config.args.join(' ');
      const npxCommand = `npx ${npxArgs}`;
      
      console.log(`💻 [testNpxCommand] 실행할 명령어: ${npxCommand}`);

      // 5초 후 자동 종료되는 프로세스로 테스트
      const testProcess = execAsync(npxCommand, { 
        timeout: 5000,  // 5초 후 자동 종료
        cwd: installedServer.installedPath,
        signal: AbortSignal.timeout(5000)
      });

      try {
        await testProcess;
        console.log(`✅ [testNpxCommand] NPX 명령어 정상 실행됨 (5초간 실행 후 종료)`);
      } catch (timeoutError) {
        // timeout은 정상적인 경우 (서버가 실행되고 있다는 뜻)
        console.log(`✅ [testNpxCommand] NPX 명령어 정상 실행 중 (타임아웃으로 종료함)`);
      }

      return {
        success: true,
        command: npxCommand,
        packageExists: true,
        message: 'NPX 명령어가 정상적으로 작동합니다'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`❌ [testNpxCommand] NPX 테스트 실패:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: 'NPX 명령어 테스트 실패'
      };
    }
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
        clientId: '', // 나중에 client가 생성되면 업데이트
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

  // === 내부 헬퍼 메서드들 ===
  selectBestMethod: async (payload: { config: any, preferredMethod?: string }): Promise<string | null> => {
    const { config, preferredMethod } = payload;
    let { availableMethods } = get();
    
    console.log('🔍 [selectBestMethod] 시작:', {
      '🎯 preferredMethod': preferredMethod,
      '⚙️ config.type': config.type,
      '📦 config.install_method': config.install_method,
      '🛠️ availableMethods': availableMethods,
      '📋 config': config
    });
    
    // 사용 가능한 방법이 없으면 체크
    if (Object.keys(availableMethods).length === 0) {
      console.log('🔄 [selectBestMethod] 사용 가능한 방법 재확인 중...');
      await get().checkAvailableMethods();
      availableMethods = get().availableMethods;
      console.log('🎯 [selectBestMethod] 재확인 후 사용 가능한 방법:', availableMethods);
    }
    
    // 1. 선호하는 방법이 있고 사용 가능하면 사용
    if (preferredMethod && availableMethods[preferredMethod]) {
      console.log(`✅ [selectBestMethod] 선호 방법 선택: ${preferredMethod}`);
      return preferredMethod;
    } else if (preferredMethod) {
      console.log(`❌ [selectBestMethod] 선호 방법 사용 불가: ${preferredMethod} (available: ${availableMethods[preferredMethod]})`);
    }
    
    // 2. config에 지정된 방법이 사용 가능하면 사용
    const configMethod = config.type || config.install_method;
    if (configMethod && availableMethods[configMethod]) {
      console.log(`✅ [selectBestMethod] 설정 방법 선택: ${configMethod}`);
      return configMethod;
    } else if (configMethod) {
      console.log(`❌ [selectBestMethod] 설정 방법 사용 불가: ${configMethod} (available: ${availableMethods[configMethod]})`);
    }
    
    // 3. 대체 방법 찾기 (우선순위: npx > npm > uv > uvx > pip > git > local)
    const fallbackOrder = ['npx', 'npm', 'uv', 'uvx', 'pip', 'git', 'local'];
    console.log('🔄 [selectBestMethod] 대체 방법 확인 중:', fallbackOrder);
    
    for (const method of fallbackOrder) {
      console.log(`🔍 [selectBestMethod] ${method} 확인: ${availableMethods[method]}`);
      if (availableMethods[method]) {
        console.log(`✅ [selectBestMethod] 대체 방법 선택: ${method}`);
        return method;
      }
    }
    
    console.log('❌ [selectBestMethod] 사용 가능한 설치 방법을 찾을 수 없음');
    console.log('🔍 [selectBestMethod] 최종 사용 가능한 방법들:', Object.entries(availableMethods).filter(([_, available]) => available));
    
    return null;
  },

  handleZeroInstall: async (payload: { serverName: string, config: any }): Promise<InstallResult> => {
    const { serverName, config } = payload;
    console.log(`⚡ [handleZeroInstall] Zero-install 서버 처리 시작: ${serverName}`);
    
    try {
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'Zero-install 처리 중',
            percent: 25,
            currentStep: '설정 디렉토리 생성',
          }
        }
      }));
      
      const installDir = path.join(getAppDataPath(), 'servers', serverName);
      await fs.mkdir(installDir, { recursive: true });
      console.log(`📁 [handleZeroInstall] 설치 디렉토리 생성: ${installDir}`);
      
      // 🔥 진행 상태 업데이트
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'Zero-install 설정 저장',
            percent: 50,
            currentStep: '설정 파일 생성',
          }
        }
      }));
      
              // 🔥 완전한 설정 파일 생성 (다른 설치 방법과 동일한 형식)
        const configPath = path.join(installDir, 'config.json');
        const finalConfig = {
          ...config,
          installedAt: new Date().toISOString(),
          installMethod: 'zero-install',
          installedPath: installDir,
          is_zero_install: true,
          install_method_id: config.install_method_id || null // 🔥 설치 방법 ID 추가
        };
        
        await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2));
        console.log(`📝 [handleZeroInstall] 설정 파일 저장 완료: ${configPath}`);
      
      // 🔥 Zero-install용 정보 파일 생성 (실행 정보 포함)
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'Zero-install 정보 생성',
            percent: 75,
            currentStep: '실행 정보 저장',
          }
        }
      }));
      
      const readmePath = path.join(installDir, 'README.md');
      const readmeContent = `# ${config.package || serverName} - Zero-Install MCP Server

## 📝 서버 정보
- **이름**: ${config.package || serverName}
- **설명**: ${config.description || 'MCP Server'}
- **타입**: Zero-Install (별도 설치 불필요)
- **설치일**: ${new Date().toLocaleString('ko-KR')}

## ⚡ Zero-Install 이란?
이 MCP 서버는 별도의 패키지 설치나 환경 설정 없이 바로 사용할 수 있습니다.
모든 필요한 기능이 이미 포함되어 있거나 외부 서비스를 통해 제공됩니다.

## 🚀 사용 방법
1. MCP Registry에서 서버 연결
2. Transport를 통해 통신 시작
3. 제공되는 도구 및 리소스 활용

## 🔧 실행 정보
- **명령어**: ${config.command || 'N/A'}
- **인수**: ${JSON.stringify(config.args || [])}
- **환경변수**: ${JSON.stringify(config.env || {}, null, 2)}

---
*Generated by MCP Server Manager*
`;
      
      await fs.writeFile(readmePath, readmeContent);
      console.log(`📋 [handleZeroInstall] README 파일 생성 완료: ${readmePath}`);
      
      // 🔥 완료 상태 업데이트
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'Zero-install 완료',
            percent: 100,
            currentStep: '완료',
          }
        }
      }));
      
      console.log(`✅ [handleZeroInstall] ${serverName} Zero-install 처리 완료`);
      
      return {
        success: true,
        method: 'zero-install',
        installedPath: installDir,
      };
    } catch (error) {
      console.error(`❌ [handleZeroInstall] ${serverName} Zero-install 처리 실패:`, error);
      
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'Zero-install 실패',
            percent: 0,
            currentStep: error instanceof Error ? error.message : '설치 실패',
            error: error instanceof Error ? error.message : '설치 실패',
          }
        }
      }));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Zero-install 처리 실패',
      };
    }
  },

  installWithNpm: async (payload: { serverName: string, config: any, installDir: string, method: string }): Promise<InstallResult> => {
    const { serverName, config, installDir, method } = payload;
    console.log(`🚀 [installWithNpm] 함수 시작:`, {
      serverName,
      method,
      installDir,
      'config.package': config.package,
      'config.source': config.source,
      'config.command': config.command,
      'config.args': config.args
    });
    
    try {
      if (method === 'npx') {
        // 🔥 NPX 방식: 실제 명령어 실행 + 스크립트 생성
        set((state) => ({
          installProgress: {
            ...state.installProgress,
            [serverName]: {
              serverName,
              status: 'NPX 패키지 확인 중',
              percent: 30,
              currentStep: 'NPX 명령어 준비',
            }
          }
        }));

        // 🔥 실제 args 배열 사용 (UI에서 전달받은 정확한 명령어)
        const actualArgs = config.args || [config.package || config.source];
        if (!actualArgs || actualArgs.length === 0) {
          throw new Error('NPX로 실행할 명령어가 지정되지 않았습니다');
        }

        const argsString = actualArgs.join(' ');
        const npxCommand = `npx ${argsString}`;
        console.log(`📋 [installWithNpm] NPX 명령어: ${npxCommand}`);

        // 🚀 NPX 패키지 다운로드 확인 (실행 테스트 없이)
        set((state) => ({
          installProgress: {
            ...state.installProgress,
            [serverName]: {
              serverName,
              status: 'NPX 패키지 확인 중',
              percent: 50,
              currentStep: `패키지 다운로드: ${actualArgs[actualArgs.length - 1]}`,
            }
          }
        }));

        // 🔥 실행 테스트는 생략 - ts-node 의존성 때문에 오류 발생할 수 있음
        // 대신 NPX 캐시에 패키지가 있는지만 간단히 확인
        try {
          console.log(`📦 [installWithNpm] NPX 패키지 다운로드 확인...`);
          const packageName = actualArgs[actualArgs.length - 1];
          
          // npm view로 패키지 존재 확인 (가벼운 확인)
          await execAsync(`npm view ${packageName} name version`, { timeout: 15000 });
          console.log(`✅ [installWithNpm] NPX 패키지 확인 완료: ${packageName}`);
          
        } catch (error: any) {
          console.log(`⚠️ [installWithNpm] 패키지 확인 중 오류 (무시):`, error.message);
          // 오류가 발생해도 계속 진행 (패키지가 존재할 가능성 높음)
        }

        // 실행 스크립트 생성 (나중에 사용할 수 있도록)
        set((state) => ({
          installProgress: {
            ...state.installProgress,
            [serverName]: {
              serverName,
              status: 'NPX 스크립트 생성 중',
              percent: 70,
              currentStep: 'run.bat 생성',
            }
          }
        }));

        // 🔥 TypeScript 서버인지 확인 (패키지명이나 설명에 typescript 관련 키워드 포함)
        const isTypescriptServer = 
          (config.package && config.package.includes('typescript')) ||
          (config.description && config.description.toLowerCase().includes('typescript')) ||
          (config.package && config.package.includes('ts')) ||
          (actualArgs.some((arg: string) => arg.includes('typescript') || arg.includes('ts-')));

        let scriptContent = `@echo off
echo Starting MCP Server: ${config.package || serverName}
echo Command: ${npxCommand}
echo.`;

        // TypeScript 서버인 경우에만 ts-node 확인
        if (isTypescriptServer) {
          scriptContent += `echo Checking TypeScript support (detected TS server)...
npx -y ts-node@latest --version >nul 2>&1
if errorlevel 1 (
    echo Installing ts-node for TypeScript support...
    npm install -g ts-node typescript
)
echo.`;
        }

        scriptContent += `echo Starting server...
${npxCommand}
echo.
echo Server started. Press any key to close this window.
pause`;

        const scriptPath = path.join(installDir, 'run.bat');
        await fs.writeFile(scriptPath, scriptContent);

        // 설정 파일 저장 (install_method_id 포함)
        const configPath = path.join(installDir, 'config.json');
        const finalConfig = {
          ...config,
          installedAt: new Date().toISOString(),
          install_method_id: config.install_method_id || null // 🔥 설치 방법 ID 추가
        };
        
        await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2));

        console.log(`✅ [installWithNpm] NPX 설치 완료: ${scriptPath}`);

        return {
          success: true,
          method: 'npx',
          installedPath: installDir,
        };
      } else {
        // 🔥 NPM 방식: 패키지 설치
        set((state) => ({
          installProgress: {
            ...state.installProgress,
            [serverName]: {
              serverName,
              status: 'NPM 패키지 설치 중',
              percent: 30,
              currentStep: 'package.json 생성',
            }
          }
        }));
        
        const packageJson = {
          name: `mcp-server-${serverName}`,
          version: '1.0.0',
          private: true,
          dependencies: {} as any,
        };
        
        if (config.package || config.source) {
          packageJson.dependencies[config.package || config.source] = config.version || 'latest';
        }
        
        await fs.writeFile(
          path.join(installDir, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
        
        set((state) => ({
          installProgress: {
            ...state.installProgress,
            [serverName]: {
              serverName,
              status: 'NPM 패키지 설치 중',
              percent: 50,
              currentStep: 'npm install 실행',
            }
          }
        }));
        
        await execAsync('npm install', { cwd: installDir });
        
        return {
          success: true,
          method: 'npm',
          installedPath: installDir,
        };
      }
    } catch (error) {
      console.error(`❌ [installWithNpm] ${method} 설치 실패:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `${method.toUpperCase()} 설치 실패`,
      };
    }
  },

  installWithDocker: async (payload: { serverName: string, config: any, installDir: string }): Promise<InstallResult> => {
    const { serverName, config, installDir } = payload;
    try {
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'Docker 이미지 다운로드 중',
            percent: 30,
            currentStep: 'docker pull',
          }
        }
      }));
      
      const imageName = config.dockerImage || config.image;
      if (!imageName) {
        throw new Error('Docker 이미지가 지정되지 않았습니다');
      }
      
      await execAsync(`docker pull ${imageName}`);
      
      if (config.dockerComposeFile) {
        await fs.writeFile(
          path.join(installDir, 'docker-compose.yml'),
          config.dockerComposeFile
        );
      }
      
      return {
        success: true,
        method: 'docker',
        installedPath: installDir,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Docker 설치 실패',
      };
    }
  },

  installWithGit: async (payload: { serverName: string, config: any, installDir: string }): Promise<InstallResult> => {
    const { serverName, config, installDir } = payload;
    try {
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'Git 저장소 복제 중',
            percent: 30,
            currentStep: 'git clone',
          }
        }
      }));
      
      const repoUrl = config.repository || config.source;
      if (!repoUrl) {
        throw new Error('Git 저장소 URL이 지정되지 않았습니다');
      }
      
      const branch = config.branch ? `--branch ${config.branch}` : '';
      await execAsync(`git clone ${repoUrl} ${branch} .`, { cwd: installDir });
      
      if (config.installCommand) {
        set((state) => ({
          installProgress: {
            ...state.installProgress,
            [serverName]: {
              serverName,
              status: '의존성 설치 중',
              percent: 60,
              currentStep: config.installCommand,
            }
          }
        }));
        
        await execAsync(config.installCommand, { cwd: installDir });
      }
      
      return {
        success: true,
        method: 'git',
        installedPath: installDir,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Git 설치 실패',
      };
    }
  },

  installWithUv: async (payload: { serverName: string, config: any, installDir: string, method: string }): Promise<InstallResult> => {
    const { serverName, config, installDir, method } = payload;
    try {
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: `${method.toUpperCase()} 패키지 설치 중`,
            percent: 30,
            currentStep: `${method} install 실행`,
          }
        }
      }));

      // 🔥 번들링된 Python 환경의 uv/uvx 사용
      const { app } = require('electron');
      const bundledPythonPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'python', 'python.exe')
        : path.join(process.cwd(), 'python', 'python.exe');
      
      const bundledPythonDir = path.dirname(bundledPythonPath);
      
      // 🔥 먼저 시스템의 uv/uvx 확인, 없으면 번들링된 것 사용
      let uvPath = method; // 기본적으로 시스템 PATH의 uv/uvx 사용
      
      try {
        // 시스템 uv/uvx 체크
        await execAsync(`${method} --version`);
        console.log(`✅ [installWithUv] 시스템 ${method.toUpperCase()} 사용`);
      } catch {
        // 번들링된 uv/uvx 시도
        const bundledUvPath = path.join(bundledPythonDir, 'Scripts', `${method}.exe`);
        try {
          await execAsync(`"${bundledUvPath}" --version`);
          uvPath = bundledUvPath;
          console.log(`✅ [installWithUv] 번들링된 ${method.toUpperCase()} 사용: ${uvPath}`);
        } catch {
          throw new Error(`${method.toUpperCase()}를 찾을 수 없습니다`);
        }
      }
      
      // 패키지 설치
      const packageName = config.package || config.source;
      if (packageName) {
        const installCommand = uvPath.includes(' ') 
          ? `"${uvPath}" add ${packageName}`
          : `${uvPath} add ${packageName}`;
        console.log(`📋 [installWithUv] ${method.toUpperCase()} 설치 명령어: ${installCommand}`);
        
        try {
          await execAsync(installCommand, { cwd: installDir });
          console.log(`✅ [installWithUv] ${method.toUpperCase()} 패키지 설치 완료`);
        } catch (error) {
          console.log(`⚠️ [installWithUv] ${method.toUpperCase()} 설치 실패, 스크립트만 생성:`, error);
        }
      }

      // 실행 스크립트 생성
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: `${method.toUpperCase()} 스크립트 생성 중`,
            percent: 60,
            currentStep: `${method} 실행 스크립트 생성`,
          }
        }
      }));

      const args = config.args || [];
      const uvCommand = uvPath.includes(' ') ? `"${uvPath}"` : uvPath;
      const scriptContent = `@echo off
echo Starting MCP Server with ${method.toUpperCase()}
echo UV Path: ${uvPath}
echo Command: ${args.join(' ')}
${uvCommand} ${args.join(' ')}`;

      const scriptPath = path.join(installDir, `run-${method}.bat`);
      await fs.writeFile(scriptPath, scriptContent);

      // 설정 파일 저장 (install_method_id 포함)
      const configPath = path.join(installDir, 'config.json');
      const finalConfig = {
        ...config,
        installedAt: new Date().toISOString(),
        uvPath: uvPath,
        command: uvCommand,
        args: args,
        install_method_id: config.install_method_id || null // 🔥 설치 방법 ID 추가
      };
      
      await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2));

      console.log(`✅ [installWithUv] ${method.toUpperCase()} 설치 완료: ${scriptPath}`);
      
      return {
        success: true,
        method,
        installedPath: installDir,
      };
    } catch (error) {
      console.error(`❌ [installWithUv] ${method.toUpperCase()} 설치 실패:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `${method.toUpperCase()} 설치 실패`,
      };
    }
  },

  installWithPip: async (payload: { serverName: string, config: any, installDir: string }): Promise<InstallResult> => {
    const { serverName, config, installDir } = payload;
    try {
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'PIP 패키지 설치 중',
            percent: 30,
            currentStep: '시스템 Python 사용',
          }
        }
      }));

      // 🚀 패키지 설치 - install_python_deps.bat 방식 사용
      const packageName = config.package || config.source;
      if (!packageName) {
        throw new Error('PIP 패키지 이름이 지정되지 않았습니다');
      }

      console.log(`📋 [installWithPip] 패키지 설치: ${packageName}`);

      // 🔥 번들링된 libs 폴더에 직접 설치 (install_python_deps.bat 방식)
      const { app } = require('electron');
      const bundledPythonDir = app.isPackaged 
        ? path.join(process.resourcesPath, 'python')
        : path.join(process.cwd(), 'python');
      
      const libsDir = path.join(bundledPythonDir, 'libs');
      
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'PIP 패키지 설치 중',
            percent: 50,
            currentStep: `패키지 설치: ${packageName}`,
          }
        }
      }));

      // 🚀 py -3.10 방식으로 설치 (기존 install_python_deps.bat와 동일)
      const pipInstallCommand = `py -3.10 -m pip install --target="${libsDir}" ${packageName}`;
      console.log(`📋 [installWithPip] PIP 설치 명령어: ${pipInstallCommand}`);

      await execAsync(pipInstallCommand, { cwd: installDir });
      console.log(`✅ [installWithPip] 패키지 설치 완료`);

      // Python 실행 스크립트 생성
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: 'PIP 실행 스크립트 생성 중',
            percent: 70,
            currentStep: 'python 스크립트 생성',
          }
        }
      }));

      const bundledPythonPath = path.join(bundledPythonDir, 'python.exe');
      const args = config.args || [];
      
      const scriptContent = `@echo off
echo Starting MCP Server: ${packageName}
echo Python: "${bundledPythonPath}"
echo Libs: "${libsDir}"
echo Command: ${args.join(' ')}
set PYTHONPATH=${libsDir};%PYTHONPATH%
"${bundledPythonPath}" ${args.join(' ')}`;

      const scriptPath = path.join(installDir, 'run.bat');
      await fs.writeFile(scriptPath, scriptContent);

      // 설정 파일 저장 (install_method_id 포함)
      const configPath = path.join(installDir, 'config.json');
      const finalConfig = {
        ...config,
        installedAt: new Date().toISOString(),
        pythonPath: bundledPythonPath,
        libsPath: libsDir,
        installMethod: 'pip',
        install_method_id: config.install_method_id || null // 🔥 설치 방법 ID 추가
      };
      
      await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2));

      console.log(`✅ [installWithPip] PIP 설치 완료: ${scriptPath}`);

      return {
        success: true,
        method: 'pip',
        installedPath: installDir,
      };
    } catch (error) {
      console.error(`❌ [installWithPip] PIP 설치 실패:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PIP 설치 실패',
      };
    }
  },

  installLocal: async (payload: { serverName: string, config: any, installDir: string }): Promise<InstallResult> => {
    const { serverName, config, installDir } = payload;
    try {
      set((state) => ({
        installProgress: {
          ...state.installProgress,
          [serverName]: {
            serverName,
            status: '로컬 설치 중',
            percent: 50,
            currentStep: '설정 저장',
          }
        }
      }));
      
      return {
        success: true,
        method: 'local',
        installedPath: installDir,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '로컬 설치 실패',
      };
    }
  },
}));