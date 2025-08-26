import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { InstallResult } from './installer-types';
import { writeFinalConfigJson } from './installer-helpers';

const execAsync = promisify(exec);

// 🔥 캐시된 확인 결과
let toolsChecked = false;

// 🔥 필수 도구 자동 설치 함수
export async function ensureRequiredTools() {
  if (toolsChecked) {
    return; // 이미 확인됨
  }
  
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
        // Windows ENOTEMPTY 에러 방지: 기존 패키지 완전 제거 후 설치
        try {
          await execAsync(`npm uninstall -g ${tool.package}`);
          console.log(`🗑️ [ensureRequiredTools] 기존 ${tool.name} 제거 완료`);
        } catch (uninstallError) {
          // 제거 실패해도 계속 진행
          console.log(`⚠️ [ensureRequiredTools] 기존 ${tool.name} 제거 실패 (무시하고 계속):`, uninstallError);
        }
        
        // npm 캐시 정리
        await execAsync('npm cache clean --force');
        
        // 새로 설치
        await execAsync(`npm install -g ${tool.package}`);
        console.log(`✅ [ensureRequiredTools] ${tool.name} 설치 완료`);
      } catch (error) {
        console.error(`❌ [ensureRequiredTools] ${tool.name} 설치 실패:`, error);
        // 설치 실패해도 계속 진행 (npx만 사용하면 됨)
      }
    }
  }
  
  toolsChecked = true; // 확인 완료 플래그 설정
}

// NPM/NPX 설치
export const installWithNpm = async (payload: { 
  serverName: string, 
  config: any, 
  installDir: string, 
  method: string 
}): Promise<InstallResult> => {
  const { serverName, config, installDir, method } = payload;
  
  try {
    if (method === 'npx') {
      const actualArgs = config.args || [config.package || config.source];
      if (!actualArgs || actualArgs.length === 0) {
        throw new Error('NPX로 실행할 명령어가 지정되지 않았습니다');
      }

      const argsString = actualArgs.join(' ');
      const npxCommand = `npx ${argsString}`;

      // 스크립트 생성
      const scriptContent = `@echo off
echo Starting MCP Server: ${config.package || serverName}
echo Command: ${npxCommand}
echo.
echo Starting server...
${npxCommand}
echo.
echo Server started. Press any key to close this window.
pause`;

      const scriptPath = path.join(installDir, 'run.bat');
      await fs.writeFile(scriptPath, scriptContent);

      await writeFinalConfigJson(installDir, {
        ...config,
        command: 'npx',
        args: actualArgs,
        env: config.env || {},
      });

      return {
        success: true,
        method: 'npx',
        installedPath: installDir,
      };
    } else {
      // NPM 방식
      const packageJson = {
        name: `mcp-server-${serverName}`,
        version: '1.0.0',
        private: true,
        dependencies: {} as any,
      };
      
      if (config.package || config.source) {
        packageJson.dependencies[config.package || config.source] = config.version || 'latest';
      }
      
      await fs.writeFile(path.join(installDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      await execAsync('npm install', { cwd: installDir });

      // 실행 정보는 mcp_configs 기준으로 넘어온 command/args가 있다면 우선 기록
      await writeFinalConfigJson(installDir, {
        ...config,
        command: config.command || null,
        args: Array.isArray(config.args) ? config.args : [],
        env: config.env || {},
      });

      return {
        success: true,
        method: 'npm',
        installedPath: installDir,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `${method.toUpperCase()} 설치 실패`,
    };
  }
};

// Docker 설치
export const installWithDocker = async (payload: { 
  serverName: string, 
  config: any, 
  installDir: string 
}): Promise<InstallResult> => {
  const { serverName, config, installDir } = payload;
  try {
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
    
    // docker run 실행 정보가 있으면 기록
    await writeFinalConfigJson(installDir, {
      ...config,
      command: config.command || (imageName ? 'docker' : null),
      args: Array.isArray(config.args) ? config.args : (imageName ? ['run'] : []),
      env: config.env || {},
    });

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
};

// Git 설치
export const installWithGit = async (payload: { 
  serverName: string, 
  config: any, 
  installDir: string 
}): Promise<InstallResult> => {
  const { serverName, config, installDir } = payload;
  try {
    const repoUrl = config.repository || config.source;
    if (!repoUrl) {
      throw new Error('Git 저장소 URL이 지정되지 않았습니다');
    }
    
    const branch = config.branch ? `--branch ${config.branch}` : '';
    await execAsync(`git clone ${repoUrl} ${branch} .`, { cwd: installDir });
    
    if (config.installCommand) {
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
};

// UV/UVX 설치
export const installWithUv = async (payload: { 
  serverName: string, 
  config: any, 
  installDir: string, 
  method: string 
}): Promise<InstallResult> => {
  const { serverName, config, installDir, method } = payload;
  try {
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
    await writeFinalConfigJson(installDir, {
      ...config,
      command: uvCommand,
      args,
      env: config.env || {},
    });

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
};

// PIP 설치
export const installWithPip = async (payload: { 
  serverName: string, 
  config: any, 
  installDir: string 
}): Promise<InstallResult> => {
  const { serverName, config, installDir } = payload;
  try {
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

    // 🚀 py -3.10 방식으로 설치 (기존 install_python_deps.bat와 동일)
    const pipInstallCommand = `py -3.10 -m pip install --target="${libsDir}" ${packageName}`;
    console.log(`📋 [installWithPip] PIP 설치 명령어: ${pipInstallCommand}`);

    await execAsync(pipInstallCommand, { cwd: installDir });
    console.log(`✅ [installWithPip] 패키지 설치 완료`);

    // Python 실행 스크립트 생성
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

    await writeFinalConfigJson(installDir, {
      ...config,
      command: bundledPythonPath,
      args,
      env: { PYTHONPATH: libsDir, ...(config.env || {}) },
    });

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
};

// PowerShell 설치 (Windows 전용)
export const installWithPowershell = async (payload: { 
  serverName: string, 
  config: any, 
  installDir: string 
}): Promise<InstallResult> => {
  const { serverName, config, installDir } = payload;
  
  // Windows가 아닌 경우 즉시 실패
  if (process.platform !== 'win32') {
    return {
      success: false,
      error: 'PowerShell은 Windows에서만 사용할 수 있습니다',
    };
  }
  
  try {
    const args = config.args || [];
    if (!args || args.length === 0) {
      throw new Error('PowerShell로 실행할 명령어가 지정되지 않았습니다');
    }

    // 🔥 PowerShell 특수 플래그 제거 및 스크립트 추출
    const filteredArgs = args.filter((arg: string) => arg !== '-c' && arg !== '--command');
    const powershellScript = filteredArgs.join(' ');
    
    // PowerShell 명령어 구성 (올바른 구문)
    const powershellCommand = `powershell.exe -Command "& {${powershellScript}}"`;

    console.log(`📋 [installWithPowershell] 원본 args: ${JSON.stringify(args)}`);
    console.log(`📋 [installWithPowershell] 필터링된 스크립트: ${powershellScript}`);
    console.log(`📋 [installWithPowershell] 최종 명령어: ${powershellCommand}`);

    let installationSuccessful = false;
    let installationError = null;

    try {
      // PowerShell 명령어 실행
      await execAsync(powershellCommand, { 
        cwd: installDir,
        timeout: 60000 // 60초 타임아웃
      });
      console.log(`✅ [installWithPowershell] PowerShell 명령어 실행 완료 (exit code 0)`);
      installationSuccessful = true;
    } catch (error) {
      console.log(`⚠️ [installWithPowershell] PowerShell 명령어 실행 중 오류 발생:`, error);
      installationError = error;
      
      // 🔥 UV 설치의 경우 실제 설치 여부 확인
      if (powershellScript.includes('uv') && powershellScript.includes('install')) {
        console.log(`🔍 [installWithPowershell] UV 설치 확인 중...`);
        try {
          const { stdout } = await execAsync('uv --version', { timeout: 10000 });
          console.log(`✅ [installWithPowershell] UV 설치 확인됨: ${stdout.trim()}`);
          installationSuccessful = true;
          installationError = null;
        } catch (uvCheckError) {
          console.log(`❌ [installWithPowershell] UV 설치 확인 실패:`, uvCheckError);
          installationSuccessful = false;
        }
      }
      
      // 🔥 다른 도구들도 비슷하게 확인할 수 있음
      // 예: Node.js, Python, Git 등
      
      // 여전히 실패인 경우 원래 오류 던지기
      if (!installationSuccessful) {
        throw installationError;
      }
    }

    // 실행 스크립트 생성
    const scriptContent = `@echo off
echo PowerShell Installation for: ${serverName}
echo Command: ${powershellCommand}
echo.
echo Installation completed via PowerShell.
pause`;

    const scriptPath = path.join(installDir, 'install.bat');
    await fs.writeFile(scriptPath, scriptContent);

    // 설정 파일 저장
    await writeFinalConfigJson(installDir, {
      ...config,
      command: 'powershell',
      args,
      env: config.env || {},
    });

    console.log(`✅ [installWithPowershell] PowerShell 설치 완료: ${scriptPath}`);
    
    return {
      success: true,
      method: 'powershell',
      installedPath: installDir,
    };
  } catch (error) {
    console.error(`❌ [installWithPowershell] PowerShell 설치 실패:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PowerShell 설치 실패',
    };
  }
};

// Brew 설치 (macOS 전용)
export const installWithBrew = async (payload: { 
  serverName: string, 
  config: any, 
  installDir: string 
}): Promise<InstallResult> => {
  const { serverName, config, installDir } = payload;
  
  // macOS가 아닌 경우 즉시 실패
  if (process.platform !== 'darwin') {
    return {
      success: false,
      error: 'Brew는 macOS에서만 사용할 수 있습니다',
    };
  }
  
  try {
    const packageName = config.package || config.source;
    if (!packageName) {
      throw new Error('Brew로 설치할 패키지가 지정되지 않았습니다');
    }

    const args = config.args || ['install', packageName];
    const brewCommand = `brew ${args.join(' ')}`;

    console.log(`📋 [installWithBrew] Brew 설치 명령어: ${brewCommand}`);

    // Brew 명령어 실행
    await execAsync(brewCommand, { cwd: installDir });
    console.log(`✅ [installWithBrew] Brew 패키지 설치 완료`);

    // 실행 스크립트 생성
    const scriptContent = `#!/bin/bash
echo "Brew Installation for: ${serverName}"
echo "Command: ${brewCommand}"
echo ""
echo "Installation completed via Brew."
read -p "Press Enter to continue..."`;

    const scriptPath = path.join(installDir, 'install.sh');
    await fs.writeFile(scriptPath, scriptContent);
    
    // 실행 권한 부여
    await execAsync(`chmod +x "${scriptPath}"`);

    // 설정 파일 저장
    await writeFinalConfigJson(installDir, {
      ...config,
      // brew는 설치 전용으로 처리. 실행은 npx/uv 등으로 별도 지정
      command: config.command || null,
      args: Array.isArray(config.args) ? config.args : [],
      env: config.env || {},
    });

    console.log(`✅ [installWithBrew] Brew 설치 완료: ${scriptPath}`);
    
    return {
      success: true,
      method: 'brew',
      installedPath: installDir,
    };
  } catch (error) {
    console.error(`❌ [installWithBrew] Brew 설치 실패:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Brew 설치 실패',
    };
  }
};

// 로컬 설치
export const installLocal = async (payload: { 
  serverName: string, 
  config: any, 
  installDir: string 
}): Promise<InstallResult> => {
  const { serverName, config, installDir } = payload;
  try {
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
}; 