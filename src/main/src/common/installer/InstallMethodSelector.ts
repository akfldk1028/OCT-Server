// src/common/installer/InstallMethodSelector.ts
import { exec } from 'child_process';
import {
  MCPServerExtended,
} from '../types/server-config';

export class InstallMethodSelector {
  // 시스템 환경에 따라 최적의 설치 방법 선택
  async selectBestInstallMethod(
    config: MCPServerExtended,
  ){
    // @ts-ignore: mcp_config에서 직접 가져온 methods
    const selectedType = config.type;
    
    console.log(`🔍 [InstallMethodSelector] 사용자 선택 타입: ${selectedType} 확인 중...`);
    
    // 선택된 타입이 사용 가능한지 확인
    if (await this.isMethodAvailable(selectedType)) {
      console.log(`✅ [InstallMethodSelector] ${selectedType} 사용 가능! 이 방식으로 설치 진행합니다.`);
      // 사용자가 요청한 타입으로 설치 진행
      return {
        type: selectedType,
        command: selectedType,
        args: config.execution?.args || [],
        env: config.execution?.env,
        dockerImage: config.dockerImage,
        uvxPackage: config.uvxPackage
      };
    }
    
    // 선택된 타입을 사용할 수 없는 경우, npx 시도
    console.warn(`⚠️ [InstallMethodSelector] ${selectedType} 실행 방법이 이 시스템에서 사용 불가능합니다. npx 시도...`);
    
    // npx 사용 가능 여부 확인
    if (await this.isNpxAvailable()) {
      console.log(`🔄 [InstallMethodSelector] 대체 실행 방법으로 npx 선택됨!`);
      return {
        type: 'npx',
        command: 'npx',
        args: config.execution?.args || [],
        env: config.execution?.env,
        dockerImage: config.dockerImage,
        uvxPackage: config.uvxPackage
      };
    }
    
    // 어떤 방법도 사용할 수 없으면 실패
    console.error(`❌ [InstallMethodSelector] 모든 설치 방법 시도 실패. 설치를 진행할 수 없습니다.`);
    throw new Error(`서버 '${config.name}'에 대해 사용 가능한 설치 방법이 없습니다. ${selectedType}, npx 또는 대체 방법이 모두 사용 불가능합니다.`);
  }

  private getDockerHost(): string {
    // Windows 파이프 vs macOS/Linux 소켓
    return process.platform === 'win32'
      ? 'npipe:////./pipe/docker_engine'
      : 'unix:///var/run/docker.sock';
  }

  private async isMethodAvailable(methodType: string): Promise<boolean> {
    console.log(`🧪 [InstallMethodSelector] ${methodType} 실행 방법 사용 가능 여부 테스트 중...`);
    let result = false;
    
    switch (methodType) {
      case 'docker':
        result = await this.isDockerAvailable();
        break;
      case 'uvx':
        result = await this.isUvxAvailable();
        break;
      case 'uv':
        result = await this.isUvAvailable();
        break;
      case 'npm':
        result = await this.isNpmAvailable();
        break;
      case 'npx':
        result = await this.isNpxAvailable();
        break;
      case 'git':
        result = await this.isGitAvailable();
        break;
      case 'local':
        result = true; // 로컬은 항상 사용 가능하다고 가정
        break;
      default:
        result = false;
    }
    
    console.log(`${result ? '✅' : '❌'} [InstallMethodSelector] ${methodType} 실행 방법 ${result ? '사용 가능' : '사용 불가능'}`);
    return result;
  }

  // Docker 사용 가능 여부 확인
  private async isDockerAvailable(): Promise<boolean> {
    try {
      await this.executeCommand('docker --version');
      await this.executeCommand('docker info', {
        env: { ...process.env, DOCKER_HOST: this.getDockerHost() },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // UVX 사용 가능 여부 확인
  private async isUvxAvailable(): Promise<boolean> {
    try {
      await this.executeCommand('uvx --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async isUvAvailable(): Promise<boolean> {
    try {
      await this.executeCommand('uv --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  // npm 사용 가능 여부 확인
  private async isNpmAvailable(): Promise<boolean> {
    try {
      await this.executeCommand('npm --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  // npx 사용 가능 여부 확인
  private async isNpxAvailable(): Promise<boolean> {
    try {
      await this.executeCommand('npx --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Git 사용 가능 여부 확인
  private async isGitAvailable(): Promise<boolean> {
    try {
      await this.executeCommand('git --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  // 명령어 실행 유틸리티
  private executeCommand(command: string, options?: any): Promise<string> {
    console.log(`🔧 [InstallMethodSelector] 명령어 실행: ${command}`);
    return new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          console.log(`❌ [InstallMethodSelector] 명령어 실행 실패: ${command}`);
          reject(error);
          return;
        }
        console.log(`✅ [InstallMethodSelector] 명령어 실행 성공: ${command}`);
        resolve(stdout.toString().trim());
      });
    });
  }
}
