import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { InstallResult } from './installer-types';

const execAsync = promisify(exec);

// 🔥 필수 도구 자동 설치 함수
export async function ensureRequiredTools() {
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

      // 설정 파일 저장
      const configPath = path.join(installDir, 'config.json');
      const finalConfig = {
        ...config,
        installedAt: new Date().toISOString(),
        install_method_id: config.install_method_id || null
      };
      
      await fs.writeFile(configPath, JSON.stringify(finalConfig, null, 2));

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
      
      await fs.writeFile(
        path.join(installDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      
      await execAsync('npm install', { cwd: installDir });
      
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