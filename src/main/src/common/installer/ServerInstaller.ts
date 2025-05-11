import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { MCPServerExtended } from '../types/server-config';
import { InstallMethodSelector } from './InstallMethodSelector';
import { updateServerInstallStatus } from '../configLoader';
import { manager } from '../manager/managerInstance';
import { BaseMCPServer, ServerStatus } from '../manager/severManager';
import { ServerInstanceFactory } from '../manager/ServerInstanceFactory';

export class ServerInstaller {
  private appDataPath: string;
  private methodSelector: InstallMethodSelector;
  private progressListeners: ((progress: {
    serverName: string;
    status: string;
    percent: number;
  }) => void)[] = [];

  constructor() {
    this.appDataPath = path.join(
      process.env.APPDATA ||
        (process.platform === 'darwin'
          ? `${process.env.HOME}/Library/Application Support`
          : `${process.env.HOME}/.local/share`),
      'mcp-server-manager',
    );
    this.methodSelector = new InstallMethodSelector();
    if (!fs.existsSync(this.appDataPath)) {
      console.log('🐣 [ServerInstaller] 앱 데이터 폴더 생성:', this.appDataPath);
      fs.mkdirSync(this.appDataPath, { recursive: true });
    }
  }

  addProgressListener(
    listener: (progress: {
      serverName: string;
      status: string;
      percent: number;
    }) => void,
  ) {
    this.progressListeners.push(listener);
    console.log(`📡 [ServerInstaller] 프로그레스 리스너 추가 (총 ${this.progressListeners.length}개)`);
  }

  private reportProgress(serverName: string, status: string, percent: number) {
    console.log(`📊 [ServerInstaller] ${serverName}: ${status} (${percent}%)`);
    for (const listener of this.progressListeners) {
      listener({ serverName, status, percent });
    }
  }

  public getInstallDir(serverName: string): string {
    const dir = path.join(this.appDataPath, 'servers', serverName);
    console.log(`📁 [ServerInstaller] 서버 설치 디렉토리: ${dir}`);
    return dir;
  }

  async installServer(
    serverName: string,
    config: MCPServerExtended,
  ): Promise<{ success: boolean; method?: any }> {
    this.reportProgress(serverName, '설치 시작', 0);
    console.log(`🚀 [ServerInstaller] ${serverName} 서버 설치 시작`);

    // Zero Install 부분 수정
    if (config.is_zero_install === true) {
      console.log(`⚡️ [ServerInstaller] ${serverName}는 zero-install 서버입니다. 인스턴스 생성 및 등록을 시작합니다.`);
      this.reportProgress(serverName, 'Zero-install: 설정 처리 중', 10);

      // 1. JSON 설정 파일 저장
      const serverDir = this.getInstallDir(serverName);
      if (!fs.existsSync(serverDir)) {
        fs.mkdirSync(serverDir, { recursive: true });
      }
      const configFilePath = path.join(serverDir, `${serverName}_config.json`);
      try {
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
        console.log(`💾 [ServerInstaller] ${serverName} 설정이 ${configFilePath}에 저장되었습니다.`);
        this.reportProgress(serverName, '설정 파일 저장 완료', 30);
      } catch (e) {
        console.error(`❌ [ServerInstaller] ${serverName} 설정 파일 저장 실패:`, e);
        this.reportProgress(serverName, '설정 파일 저장 실패', 0);
        return { success: false };
      }

      // 2 & 3. ServerInstanceFactory를 사용하여 서버 인스턴스 생성 및 등록
      try {
        // 서버 인스턴스 생성 및 등록을 팩토리에 위임
        const success = ServerInstanceFactory.createAndRegister(serverName, config);
        
        if (success) {
          console.log(`📦 [ServerInstaller] ${serverName} 인스턴스가 생성되고 ServerManager에 추가되었습니다.`);
          this.reportProgress(serverName, '인스턴스 등록 완료', 100);
          return { success: true, method: { type: config.type, message: 'Zero-install instance created and registered.' } };
        } else {
          console.error(`❌ [ServerInstaller] ${serverName} 인스턴스 생성 또는 등록 실패`);
          this.reportProgress(serverName, '인스턴스 등록 실패', 0);
          return { success: false };
        }
      } catch (e) {
        console.error(`❌ [ServerInstaller] ${serverName} 인스턴스 생성 중 오류:`, e);
        this.reportProgress(serverName, '인스턴스 생성 실패', 0);
        return { success: false };
      }
    }

    try {
      console.log(`⚙️ [ServerInstaller] ${serverName}에 대한 최적 설치 방법 선택 중...`);
      const method = await this.methodSelector.selectBestInstallMethod(config);
      this.reportProgress(serverName, `선택된 방식: ${method.type}`, 5);
      console.log(`✅ [ServerInstaller] 선택된 설치 방법: ${method.type}`);
      const serverDir = (method as any).installDir || this.getInstallDir(serverName);
      if (!fs.existsSync(serverDir)) {
        console.log(`📂 [ServerInstaller] 서버 디렉토리 생성: ${serverDir}`);
        fs.mkdirSync(serverDir, { recursive: true });
      }
      let success = false;
      console.log(`⚙️ [ServerInstaller] 설치 방법에 따른 처리 시작: ${method.type}`);
      switch (method.type) {
        case 'git':
          this.reportProgress(serverName, 'Git 설치 시작', 20);
          console.log(`🌿 [ServerInstaller] Git을 사용하여 설치 시작`);
          success = await this.installFromGit(
            serverName,
            config,
            serverDir,
            method,
          );
          break;
        case 'docker':
          this.reportProgress(serverName, 'Docker 설치 시작', 20);
          console.log(`🐳 [ServerInstaller] Docker를 사용하여 설치 시작`);
          success = await this.installFromDocker(
            serverName,
            config,
            serverDir,
            method,
          );
          break;
        case 'npm':
          this.reportProgress(serverName, 'NPM 설치 시작', 20);
          console.log(`📦 [ServerInstaller] NPM을 사용하여 설치 시작`);
          success = await this.installFromNpm(
            serverName,
            config,
            serverDir,
            method,
          );
          if (success) {
            console.log(`🔄 [ServerInstaller] 명령어와 인자 업데이트 중...`);
            this.updateCommandAndArgs(config, method);
            console.log(`🚀 [ServerInstaller] 서버 프로세스 시작 중...`);
            this.spawnServerProcess(serverName, config, serverDir);
          }
          break;
        case 'npx':
          this.reportProgress(serverName, 'NPX 설치 시작', 20);
          console.log(`📦 [ServerInstaller] NPX를 사용하여 설치 시작`);
          success = await this.installFromNpm(
            serverName,
            config,
            serverDir,
            method,
          );
          if (success) {
            console.log(`🔄 [ServerInstaller] 명령어와 인자 업데이트 중...`);
            this.updateCommandAndArgs(config, method);
            console.log(`🚀 [ServerInstaller] 서버 프로세스 시작 중...`);
            this.spawnServerProcess(serverName, config, serverDir);
          }
          break;
        case 'uv': 
          this.reportProgress(serverName, 'UV 설치 시작', 20);
          console.log(`🔧 [ServerInstaller] UV를 사용하여 설치 시작`);
          success = await this.installFromUV(
            serverName,
            config,
            serverDir,
            method,
          );
          break;
        case 'uvx':
          this.reportProgress(serverName, 'UVX 설치 시작', 20);
          console.log(`🔧 [ServerInstaller] UVX를 사용하여 설치 시작`);
          success = await this.installFromUVX(
            serverName,
            config,
            serverDir,
            method,
          );
          break;
        case 'local':
          this.reportProgress(serverName, '로컬 실행 준비', 20);
          console.log(`📍 [ServerInstaller] 로컬 모드로 실행 준비 중...`);
          this.updateCommandAndArgs(config, method);
          this.spawnServerProcess(serverName, config, serverDir);
          success = true;
          break;
        default:
          console.error(`❌ [ServerInstaller] 지원하지 않는 설치 유형: ${method.type}`);
          throw new Error(`지원하지 않는 설치 유형: ${method.type}`);
      }
      if (success) {
        console.log(`✅ [ServerInstaller] ${serverName} 설치 성공! 상태 업데이트 중...`);
        updateServerInstallStatus(serverName, {
          isInstalled: true,
          installedMethod: method.type,
          installedDir: serverDir
        });
        this.reportProgress(serverName, '설치 완료', 100);
        console.log(`📝 [ServerInstaller] ${serverName}의 설정 업데이트 완료`);
        try {
          let metaFile = 'meta.json';
          switch (method.type) {
            case 'git': metaFile = 'git-meta.json'; break;
            case 'docker': metaFile = 'docker-meta.json'; break;
            case 'npm': metaFile = 'npm-meta.json'; break;
            case 'npx': metaFile = 'npx-meta.json'; break;
            case 'uv': metaFile = 'uv-meta.json'; break;
            case 'uvx': metaFile = 'uvx-meta.json'; break;
            case 'local': metaFile = 'local-meta.json'; break;
            default: metaFile = 'meta.json'; break;
          }
          const metaPath = path.join(serverDir, metaFile);
          fs.writeFileSync(metaPath, JSON.stringify(config, null, 2));
          console.log(`📝 [ServerInstaller] 전체 config를 ${metaFile}에 저장: ${metaPath}`);
        } catch (e) {
          console.warn(`⚠️ [ServerInstaller] 메타 파일 저장 실패:`, e);
        }
        return { success: true, method };
      }
      console.error(`❌ [ServerInstaller] 내부적인 설치 실패`);
      throw new Error('설치 내부 프로세스 실패');
    } catch (error) {
      console.error(`❌ [ServerInstaller] ${serverName} 설치 중 오류:`, error);
      this.reportProgress(
        serverName,
        `설치 실패: ${error instanceof Error ? error.message : String(error)}`,
        0,
      );
      return { success: false };
    }
  }

  private spawnServerProcess(
    serverName: string,
    config: MCPServerExtended,
    cwd: string,
  ) {
    const command = config.execution!.command!;
    const args = config.execution!.args || [];
    this.reportProgress(serverName, '서버 프로세스 시작 중...', 90);
    if (process.platform === 'win32') {
      const winArgs = ['/c', 'start', '""', command, ...args];
      console.log(
        `🪟 [ServerInstaller] Windows 새 창에서 실행: cmd.exe ${winArgs.join(' ')}`,
      );
      const env = { ...process.env };
      delete env.NODE_OPTIONS;
      try {
        const proc = spawn('cmd.exe', winArgs, {
          cwd,
          env,
          detached: true,
          stdio: 'ignore',
        });
        proc.unref();
        console.log(`✅ [ServerInstaller] Windows 프로세스 시작 성공 (PID: ${proc.pid || 'unknown'})`);
      } catch (error) {
        console.error(`❌ [ServerInstaller] Windows 프로세스 시작 실패:`, error);
      }
    } else {
      console.log(
        `🐧 [ServerInstaller] Unix 시스템에서 실행: ${command} ${args.join(' ')} (경로: ${cwd})`,
      );
      try {
        const proc = spawn(command, args, {
          cwd,
          env: process.env,
          shell: true,
          stdio: 'inherit',
          detached: true,
        });
        proc.unref();
        console.log(`✅ [ServerInstaller] Unix 프로세스 시작 성공 (PID: ${proc.pid || 'unknown'})`);
      } catch (error) {
        console.error(`❌ [ServerInstaller] Unix 프로세스 시작 실패:`, error);
      }
    }
    this.reportProgress(serverName, '서버 실행됨', 100);
    console.log(`🎉 [ServerInstaller] ${serverName} 서버 실행 완료!`);
  }

  private updateCommandAndArgs(
    config: MCPServerExtended,
    installMethod: any,
  ): void {
    console.log(`🔄 [ServerInstaller] 설치 방법(${installMethod.type})에 따른 명령어 업데이트 중...`);
    // switch (installMethod.type) {
    //   case 'docker':
    //     console.log(`🐳 [ServerInstaller] Docker 명령어 구성 중...`);
    //     Object.assign(config, {
    //       command: 'docker',
    //       args: [
    //         'run',
    //         '-p',
    //         `${(config as any).port || 8000}:${(config as any).port || 8000}`,
    //         ...Object.entries(installMethod.env || {}).flatMap(
    //           ([key, value]) => ['-e', `${key}=${value}`],
    //         ),
    //         installMethod.dockerImage || '',
    //       ],
    //     });
    //     break;
    //   case 'uv':
    //     console.log(`🔧 [ServerInstaller] UV 명령어 구성 중...`);
    //     Object.assign(config, {
    //       command: 'uv',
    //       args: ['run', installMethod.uvxPackage || ''],
    //     });
    //     break;
    //   case 'npx':
    //     console.log(`📦 [ServerInstaller] NPX 명령어 구성 중...`);
    //     if (!config.execution) {
    //       config.execution = { command: 'npx', args: [] };
    //     } else {
    //       config.execution.command = 'npx';
    //     }
    //     if (installMethod.args && installMethod.args.length > 0) {
    //       config.execution.args = installMethod.args;
    //     }
    //     break;
    //   case 'uvx':
    //     console.log(`🔧 [ServerInstaller] UVX 명령어 구성 중...`);
    //     Object.assign(config, {
    //       command: 'uvx',
    //       args: [
    //         installMethod.uvxPackage || '',
    //         '--transport',
    //         installMethod.uvxTransport || 'stdio',
    //       ],
    //     });
    //     break;
    //   case 'npm':
    //   case 'local':
    //     console.log(`📦 [ServerInstaller] ${installMethod.type} 명령어 구성 중...`);
    //     if (!config.execution) {
    //       config.execution = { command: '', args: [] };
    //     }
    //     config.execution.command = installMethod.command!;
    //     config.execution.args = installMethod.args || [];
    //     break;
    //   default:
    //     console.warn(`⚠️ [ServerInstaller] 알 수 없는 명령어 타입: ${installMethod.type}`);
    // }
    console.log(`✅ [ServerInstaller] 명령어 업데이트 완료: ${config.execution?.command} ${config.execution?.args?.join(' ') || ''}`);
  }

  private async installFromGit(
    serverName: string,
    config: MCPServerExtended,
    serverDir: string,
    method: any,
  ): Promise<boolean> {
    if (!method.source) {
      console.error(`❌ [ServerInstaller] Git 저장소 URL이 지정되지 않았습니다`);
      throw new Error('Git 저장소 URL이 지정되지 않았습니다');
    }
    const branchArg = method.branch ? `--branch ${method.branch}` : '';
    this.reportProgress(serverName, 'Git 저장소 복제 중...', 10);
    console.log(`🌿 [ServerInstaller] Git 저장소 복제 중: ${method.source} ${branchArg}`);
    try {
      await this.executeCommand(`git clone ${method.source} ${branchArg} .`, {
        cwd: serverDir,
      });
      console.log(`✅ [ServerInstaller] Git 저장소 복제 완료`);
      if (method.installCommand) {
        this.reportProgress(serverName, '의존성 설치 중...', 50);
        console.log(`📦 [ServerInstaller] 의존성 설치 명령어 실행: ${method.installCommand}`);
        await this.executeCommand(method.installCommand, { cwd: serverDir });
        console.log(`✅ [ServerInstaller] 의존성 설치 완료`);
      }
      console.log(`📝 [ServerInstaller] 메타데이터 파일 생성 중...`);
      fs.writeFileSync(
        path.join(serverDir, '.mcp-meta.json'),
        JSON.stringify(
          {
            name: config.name,
            installType: 'git',
            installedAt: new Date().toISOString(),
            source: method.source,
            branch: method.branch,
          },
          null,
          2,
        ),
      );
      console.log(`✅ [ServerInstaller] 메타데이터 파일 생성 완료`);
      return true;
    } catch (error) {
      console.error(`❌ [ServerInstaller] Git 설치 중 오류:`, error);
      throw error;
    }
  }

  private async installFromDocker(
    serverName: string,
    config: MCPServerExtended,
    serverDir: string,
    method: any,
  ): Promise<boolean> {
    this.reportProgress(serverName, 'Docker 이미지 준비 중...', 10);
    console.log(`🐳 [ServerInstaller] Docker 설치 준비 중...`);
    try {
      if (method.dockerComposeFile) {
        const file = path.join(serverDir, 'docker-compose.yml');
        console.log(`📄 [ServerInstaller] docker-compose.yml 파일 생성 중...`);
        fs.writeFileSync(file, method.dockerComposeFile);
        this.reportProgress(serverName, 'Docker Compose 실행 중...', 30);
        console.log(`🐳 [ServerInstaller] Docker Compose 이미지 다운로드 중...`);
        await this.executeCommand('docker-compose pull', { cwd: serverDir });
        console.log(`🐳 [ServerInstaller] Docker Compose 시작 중...`);
        await this.executeCommand('docker-compose up -d', { cwd: serverDir });
        console.log(`📝 [ServerInstaller] 메타데이터 파일 생성 중...`);
        fs.writeFileSync(
          path.join(serverDir, '.mcp-meta.json'),
          JSON.stringify(
            {
              name: config.name,
              installType: 'docker',
              installedAt: new Date().toISOString(),
              composeFile: file,
            },
            null,
            2,
          ),
        );
        console.log(`✅ [ServerInstaller] Docker Compose 설치 완료`);
        return true;
      }
      if (method.dockerImage) {
        this.reportProgress(serverName, 'Docker 이미지 다운로드 중...', 30);
        console.log(`🐳 [ServerInstaller] Docker 이미지 다운로드 중: ${method.dockerImage}`);
        await this.executeCommand(`docker pull ${method.dockerImage}`);
        const runCmd = `docker run -d -p ${(config as any).port}:${(config as any).port} ${Object.entries(
          method.env || {},
        )
          .map(([k, v]) => `-e ${k}="${v}"`)
          .join(' ')} ${method.dockerImage}`;
        this.reportProgress(serverName, '컨테이너 실행 중...', 60);
        console.log(`🐳 [ServerInstaller] Docker 컨테이너 시작 중...`);
        await this.executeCommand(runCmd);
        console.log(`📝 [ServerInstaller] 메타데이터 파일 생성 중...`);
        fs.writeFileSync(
          path.join(serverDir, '.mcp-meta.json'),
          JSON.stringify(
            {
              name: config.name,
              installType: 'docker',
              installedAt: new Date().toISOString(),
              image: method.dockerImage,
            },
            null,
            2,
          ),
        );
        console.log(`✅ [ServerInstaller] Docker 이미지 설치 완료`);
        return true;
      }
      console.error(`❌ [ServerInstaller] Docker 이미지 또는 Compose 파일이 지정되지 않았습니다`);
      throw new Error('Docker 이미지 또는 Compose 파일이 지정되지 않았습니다');
    } catch (error) {
      console.error(`❌ [ServerInstaller] Docker 설치 중 오류:`, error);
      throw error;
    }
  }

  private async installFromNpm(
    serverName: string,
    config: MCPServerExtended,
    serverDir: string,
    method: any,
  ): Promise<boolean> {
    this.reportProgress(serverName, `${method.type.toUpperCase()} 패키지 설치 준비 중...`, 10);
    console.log(`📦 [ServerInstaller] ${method.type} 설치 준비 중...`);
    try {
      const deps = ['ts-node', 'typescript'];
      this.reportProgress(serverName, '의존성 확인 중...', 20);
      console.log(`🔍 [ServerInstaller] 필수 의존성 확인 중: ${deps.join(', ')}`);
      for (const d of deps) {
        try {
          await this.executeCommand(`${d} --version`);
          console.log(`✅ [ServerInstaller] ${d} 이미 설치됨`);
        } catch {
          this.reportProgress(serverName, `${d} 설치 중...`, 25);
          console.log(`📦 [ServerInstaller] ${d} 글로벌 설치 중...`);
          await this.executeCommand(`npm install -g ${d}`);
          console.log(`✅ [ServerInstaller] ${d} 설치 완료`);
        }
      }
      const pkg = {
        name: `mcp-server-${serverName}`,
        version: '1.0.0',
        private: true,
        dependencies: {} as any,
      };
      if (method.source) {
        console.log(`📦 [ServerInstaller] 소스 패키지 추가: ${method.source}@${method.tag || 'latest'}`);
        pkg.dependencies[method.source] = method.tag || 'latest';
      }
      console.log(`📄 [ServerInstaller] package.json 파일 생성 중...`);
      fs.writeFileSync(
        path.join(serverDir, 'package.json'),
        JSON.stringify(pkg, null, 2),
      );
      this.reportProgress(serverName, 'npm install 실행 중...', 30);
      console.log(`📦 [ServerInstaller] npm install 실행 중...`);
      await this.executeCommand('npm install', { cwd: serverDir });
      console.log(`✅ [ServerInstaller] npm install 완료`);
      if (method.installCommand) {
        this.reportProgress(serverName, '설치 후 설정 중...', 70);
        console.log(`🔧 [ServerInstaller] 설치 후 명령어 실행: ${method.installCommand}`);
        await this.executeCommand(method.installCommand, { cwd: serverDir });
        console.log(`✅ [ServerInstaller] 설치 후 명령어 실행 완료`);
      }
      console.log(`📝 [ServerInstaller] 메타데이터 파일 생성 중...`);
      fs.writeFileSync(
        path.join(serverDir, '.mcp-meta.json'),
        JSON.stringify(
          {
            name: config.name,
            installType: method.type,
            installedAt: new Date().toISOString(),
            package: method.source,
          },
          null,
          2,
        ),
      );
      console.log(`✅ [ServerInstaller] ${method.type} 설치 완료`);
      return true;
    } catch (error) {
      console.error(`❌ [ServerInstaller] ${method.type} 설치 중 오류:`, error);
      throw error;
    }
  }

  private async installFromUV(
    serverName: string,
    config: MCPServerExtended,
    serverDir: string,
    method: any,
  ): Promise<boolean> {
    try {
      this.reportProgress(serverName, 'UV 패키지 설치 준비 중...', 10);
      console.log(`🔧 [ServerInstaller] UV 설치 준비 중...`);
      console.log(`📄 [ServerInstaller] UV 실행 스크립트 생성 중...`);
      const scriptContent = `#!/usr/bin/env node
console.log('🚀 [run-uv.js] 스크립트 시작됨');

const { spawn } = require('child_process');
const path = require('path');
console.log('📦 [run-uv.js] 모듈 로드됨');

const env = { ...process.env, ${Object.entries(method.env || {})
        .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(', ')} };
console.log('🔧 [run-uv.js] UV 명령어 실행: uv');
console.log('🔧 [run-uv.js] 인자:', ${JSON.stringify(JSON.stringify(method.args))});
console.log('📁 [run-uv.js] 실행 경로:', ${JSON.stringify(method.args[1] || serverDir)});

const proc = spawn('uv', ${JSON.stringify(method.args)}, {
  cwd: ${JSON.stringify(method.args[1] || serverDir)},
  env,
  stdio: 'inherit'
});
console.log('✅ [run-uv.js] UV 프로세스 시작됨 (PID: ' + (proc.pid || 'unknown') + ')');

proc.on('error', err => {
  console.error('❌ [run-uv.js] UV 실행 오류:', err);
  process.exit(1);
});

process.on('SIGINT', () => proc.kill('SIGINT'));
process.on('SIGTERM', () => proc.kill('SIGTERM'));
`;
      const scriptPath = path.join(serverDir, 'run-uv.js');
      fs.writeFileSync(scriptPath, scriptContent);
      fs.chmodSync(scriptPath, '755');
      console.log(`✅ [ServerInstaller] UV 실행 스크립트 생성 완료: ${scriptPath}`);
      this.reportProgress(serverName, '서버 프로세스 시작 중...', 80);
      console.log(`🚀 [ServerInstaller] UV 서버 시작 중...`);
      if (process.platform === 'win32') {
        console.log(`🪟 [ServerInstaller] Windows에서 새 창으로 UV 실행 중...`);
        spawn('cmd.exe', ['/c', 'start', '""', 'node', scriptPath], {
          cwd: serverDir,
          detached: true,
          stdio: 'ignore',
        }).unref();
      } else {
        console.log(`🐧 [ServerInstaller] Unix 시스템에서 UV 실행 중...`);
        spawn('node', [scriptPath], { cwd: serverDir, stdio: 'inherit' });
      }
      this.reportProgress(serverName, '설치 완료 - 서버 실행됨', 100);
      console.log(`🎉 [ServerInstaller] UV 설치 및 실행 완료!`);
      return true;
    } catch (error) {
      console.error(`❌ [ServerInstaller] UV 설치 중 오류:`, error);
      if (fs.existsSync(serverDir))
        fs.rmSync(serverDir, { recursive: true, force: true });
      throw error;
    }
  }

  private async installFromUVX(
    serverName: string,
    config: MCPServerExtended,
    serverDir: string,
    installMethod: any,
  ): Promise<boolean> {
    try {
      this.reportProgress(serverName, 'UVX 패키지 설치 준비 중...', 10);
      console.log(`🔧 [ServerInstaller] UVX 설치 준비 중...`);
      const uvxPackage = installMethod.uvxPackage || installMethod.source;
      if (!uvxPackage) {
        console.error(`❌ [ServerInstaller] UVX 패키지 이름이 지정되지 않았습니다`);
        throw new Error('UVX 패키지 이름이 지정되지 않았습니다');
      }
      this.reportProgress(serverName, 'UVX 확인 중...', 20);
      console.log(`🔍 [ServerInstaller] UVX 설치 여부 확인 중...`);
      try {
        await this.executeCommand('uvx --version');
        console.log(`✅ [ServerInstaller] UVX 이미 설치됨`);
      } catch {
        this.reportProgress(serverName, 'UVX 글로벌 설치 중...', 30);
        console.log(`📦 [ServerInstaller] UVX 글로벌 설치 중...`);
        await this.executeCommand('npm install -g uvx');
        console.log(`✅ [ServerInstaller] UVX 설치 완료`);
      }
      const baseArgs =
        installMethod.args && installMethod.args.length > 0
          ? installMethod.args
          : [uvxPackage];
      const args = [...baseArgs];
      console.log(`🔧 [ServerInstaller] UVX 인자 준비 완료: ${args.join(' ')}`);
      console.log(`📄 [ServerInstaller] UVX 실행 스크립트 생성 중...`);
      const scriptContent = `#!/usr/bin/env node
console.log('🚀 [run-uvx.js] 스크립트 시작됨');

const { spawn } = require('child_process');
const path = require('path');
console.log('📦 [run-uvx.js] 모듈 로드됨');

const env = { ...process.env, ${Object.entries(installMethod.env || {})
        .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(', ')} };
        
console.log('🔧 [run-uvx.js] UVX 명령어 실행: uvx');
console.log('🔧 [run-uvx.js] 인자: ${args.join(' ')}');
console.log('📁 [run-uvx.js] 실행 경로: ${serverDir}');

const proc = spawn('uvx', ${JSON.stringify(args)}, {
  cwd: ${JSON.stringify(serverDir)},
  env,
  stdio: 'inherit'
});
console.log('✅ [run-uvx.js] UVX 프로세스 시작됨 (PID: ' + (proc.pid || 'unknown') + ')');

proc.on('error', err => {
  console.error('❌ [run-uvx.js] UVX 실행 오류:', err);
  process.exit(1);
});

process.on('SIGINT', () => proc.kill('SIGINT'));
process.on('SIGTERM', () => proc.kill('SIGTERM'));
`;
      const scriptPath = path.join(serverDir, 'run-uvx.js');
      fs.writeFileSync(scriptPath, scriptContent);
      fs.chmodSync(scriptPath, '755');
      console.log(`✅ [ServerInstaller] UVX 실행 스크립트 생성 완료: ${scriptPath}`);
      this.reportProgress(serverName, '서버 프로세스 시작 중...', 80);
      console.log(`🚀 [ServerInstaller] UVX 서버 시작 중...`);
      if (process.platform === 'win32') {
        console.log(`🪟 [ServerInstaller] Windows에서 새 창으로 UVX 실행 중...`);
        spawn('cmd.exe', ['/c', 'start', '""', 'node', scriptPath], {
          cwd: serverDir,
          detached: true,
          stdio: 'ignore',
        }).unref();
      } else {
        console.log(`🐧 [ServerInstaller] Unix 시스템에서 UVX 실행 중...`);
        spawn('node', [scriptPath], { cwd: serverDir, stdio: 'inherit' });
      }
      console.log(`📝 [ServerInstaller] 메타데이터 파일 생성 중...`);
      fs.writeFileSync(
        path.join(serverDir, '.mcp-meta.json'),
        JSON.stringify(
          {
            name: config.name,
            installType: 'uvx',
            installedAt: new Date().toISOString(),
            args: args,
            package: uvxPackage,
          },
          null,
          2,
        ),
      );
      this.reportProgress(serverName, '설치 완료 - 서버 실행됨', 100);
      console.log(`🎉 [ServerInstaller] UVX 설치 및 실행 완료!`);
      return true;
    } catch (error) {
      console.error(`❌ [ServerInstaller] UVX 설치 중 오류:`, error);
      if (fs.existsSync(serverDir))
        fs.rmSync(serverDir, { recursive: true, force: true });
      throw error;
    }
  }

  private executeCommand(command: string, options?: any): Promise<string> {
    console.log(`🔧 [ServerInstaller] 명령어 실행: ${command}`);
    return new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ [ServerInstaller] 명령어 실행 실패: ${command}`);
          console.error(`❌ [ServerInstaller] 에러: ${stderr.toString() || error.message}`);
          return reject(new Error(stderr.toString() || error.message));
        }
        console.log(`✅ [ServerInstaller] 명령어 실행 성공: ${command}`);
        resolve(stdout.toString());
      });
    });
  }
}
