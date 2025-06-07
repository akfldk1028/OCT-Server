import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { InstallResult } from './installer-types';

const execAsync = promisify(exec);

// 앱 데이터 경로 함수
export const getAppDataPath = () => path.join(
  process.env.APPDATA ||
    (process.platform === 'darwin'
      ? `${process.env.HOME}/Library/Application Support`
      : `${process.env.HOME}/.local/share`),
  'mcp-server-manager'
);

// 사용 가능한 설치 방법 확인
export const checkAvailableMethods = async (): Promise<Record<string, boolean>> => {
  console.log('🔍 [checkAvailableMethods] 번들링 시스템용 설치 방법 확인 중...');
  
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
};

// 최적 설치 방법 선택
export const selectBestMethod = async (
  config: any, 
  preferredMethod?: string,
  availableMethods: Record<string, boolean> = {}
): Promise<string | null> => {
  console.log('🔍 [selectBestMethod] 시작:', {
    '🎯 preferredMethod': preferredMethod,
    '⚙️ config.type': config.type,
    '📦 config.install_method': config.install_method,
    '🛠️ availableMethods': availableMethods,
    '📋 config': config
  });
  
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
};

// Zero-install 처리
export const handleZeroInstall = async (
  serverName: string, 
  config: any,
  setProgress?: (progress: any) => void
): Promise<InstallResult> => {
  console.log(`⚡ [handleZeroInstall] Zero-install 서버 처리 시작: ${serverName}`);
  
  try {
    setProgress?.({
      serverName,
      status: 'Zero-install 처리 중',
      percent: 25,
      currentStep: '설정 디렉토리 생성',
    });
    
    const installDir = path.join(getAppDataPath(), 'servers', serverName);
    await fs.mkdir(installDir, { recursive: true });
    console.log(`📁 [handleZeroInstall] 설치 디렉토리 생성: ${installDir}`);
    
    setProgress?.({
      serverName,
      status: 'Zero-install 설정 저장',
      percent: 50,
      currentStep: '설정 파일 생성',
    });
    
    // 🔥 완전한 설정 파일 생성 (다른 설치 방법과 동일한 형식)
    const configPath = path.join(installDir, 'config.json');
    const finalConfig = {
      ...config,
      installedAt: new Date().toISOString(),
      installMethod: 'zero-install',
      installedPath: installDir,
      is_zero_install: true,
      install_method_id: config.install_method_id || null
    };
    
    await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2));
    console.log(`📝 [handleZeroInstall] 설정 파일 저장 완료: ${configPath}`);
    
    setProgress?.({
      serverName,
      status: 'Zero-install 정보 생성',
      percent: 75,
      currentStep: '실행 정보 저장',
    });
    
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
    
    setProgress?.({
      serverName,
      status: 'Zero-install 완료',
      percent: 100,
      currentStep: '완료',
    });
    
    console.log(`✅ [handleZeroInstall] ${serverName} Zero-install 처리 완료`);
    
    return {
      success: true,
      method: 'zero-install',
      installedPath: installDir,
    };
  } catch (error) {
    console.error(`❌ [handleZeroInstall] ${serverName} Zero-install 처리 실패:`, error);
    
    setProgress?.({
      serverName,
      status: 'Zero-install 실패',
      percent: 0,
      currentStep: error instanceof Error ? error.message : '설치 실패',
      error: error instanceof Error ? error.message : '설치 실패',
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Zero-install 처리 실패',
    };
  }
}; 