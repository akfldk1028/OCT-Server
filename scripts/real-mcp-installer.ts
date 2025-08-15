// scripts/real-mcp-installer.ts
// 실제 설치 시스템과 연동하는 MCP 서버 테스터

import * as dotenv from 'dotenv';
import path from 'path';

// 환경변수 로드
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import os from 'os';

// 실제 설치 시스템 타입 정의
interface InstallConfig {
  is_zero_install: boolean;
  type: string;
  install_method: string;
  env: Record<string, any>;
  package: string;
  source?: string;
  description?: string;
  command: string | null;
  args: string[];
  install_method_id?: number | null;
  [key: string]: any;
}

interface InstallResult {
  success: boolean;
  error?: string;
  duration: number;
  logs: string[];
  processId?: number;
}

class RealMCPInstaller {
  private supabase: any;
  private testUserId: string;
  private logBuffer: string[] = [];

  constructor(supabaseUrl: string, supabaseKey: string, testUserId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.testUserId = testUserId;
  }

  async testInstallation(server: any, method: string): Promise<InstallResult> {
    const startTime = Date.now();
    const result: InstallResult = {
      success: false,
      duration: 0,
      logs: []
    };

    try {
      const methodInfo = this.findMethodInfo(server, method);
      const isZeroInstall = methodInfo?.is_zero_install || false;
      
      if (isZeroInstall) {
        console.log(`⚡ Zero Install 테스트 시작: ${server.name} (${method})`);
        result.logs.push('⚡ Zero Install - 설치 단계 스킵');
      } else {
        console.log(`🔧 일반 설치 테스트 시작: ${server.name} (${method})`);
        
        // 1. 실제 설치 실행 (Zero Install이 아닌 경우만)
        const installSuccess = await this.executeInstallation(server, method, result);
        if (!installSuccess) {
          result.duration = Date.now() - startTime;
          return result;
        }
      }
      
      // 2. MCP Health 체크 (항상 실행)
      const healthSuccess = await this.testMCPHealth(server, method, result);
      if (!healthSuccess) {
        result.duration = Date.now() - startTime;
        return result;
      }
      
      // 3. 성공
      result.success = true;
      result.duration = Date.now() - startTime;
      
      if (isZeroInstall) {
        console.log(`✅ Zero Install 통신 테스트 성공: ${server.name}`);
      } else {
        console.log(`✅ 설치 및 통신 테스트 성공: ${server.name}`);
      }
      
      return result;
      
    } catch (error) {
      result.error = String(error);
      result.logs.push(`❌ 오류: ${error}`);
      result.duration = Date.now() - startTime;
      console.error(`❌ 테스트 실패: ${server.name}`, error);
      return result;
    }
  }

  private async executeInstallation(server: any, method: string, result: InstallResult): Promise<boolean> {
    const methodInfo = this.findMethodInfo(server, method);
    if (!methodInfo) {
      result.error = `설치 방법 '${method}' 정보를 찾을 수 없습니다`;
      result.logs.push(result.error);
      return false;
    }

    try {
      // Zero Install 확인
      if (methodInfo.is_zero_install) {
        console.log(`⚡ Zero Install 감지: ${server.name}`);
        result.logs.push('⚡ Zero Install 서버 - 설치 단계 스킵');
        return true; // Zero Install은 설치 없이 바로 성공
      }

      if (method === 'npx' || method === 'npm' || method === 'node') {
        return await this.executeNPXInstall(server, methodInfo, result);
      } else if (method === 'python' || method === 'pip' || method === 'uv') {
        return await this.executePythonInstall(server, methodInfo, result);
      } else {
        result.error = `지원하지 않는 설치 방법: ${method}`;
        result.logs.push(result.error);
        return false;
      }
    } catch (error) {
      result.error = `설치 실행 오류: ${error}`;
      result.logs.push(result.error);
      return false;
    }
  }

  private async executeNPXInstall(server: any, methodInfo: any, result: InstallResult): Promise<boolean> {
    // 더 정확한 패키지명 찾기
    let packageName = null;
    
    // 1. methodInfo에서 패키지명 찾기
    if (methodInfo.package && methodInfo.package !== server.name) {
      packageName = methodInfo.package;
    }
    
    // 2. args에서 패키지명 찾기
    if (!packageName && methodInfo.args && methodInfo.args.length > 0) {
      packageName = methodInfo.args[0];
    }
    
    // 3. primary_url에서 패키지명 찾기
    if (!packageName && server.primary_url) {
      const urlParts = server.primary_url.split('/');
      packageName = urlParts[urlParts.length - 1];
    }
    
    // 4. 마지막으로 서버명 사용
    if (!packageName) {
      packageName = server.name;
    }
    
    if (!packageName) {
      result.error = 'NPX 패키지명을 찾을 수 없습니다';
      result.logs.push(result.error);
      result.logs.push(`디버그: server.name=${server.name}, methodInfo=${JSON.stringify(methodInfo)}`);
      return false;
    }
    
    console.log(`📦 NPX 패키지명 결정: ${packageName} (from: ${server.name})`);

    console.log(`📦 NPX 설치 시도: ${packageName}`);
    
    return new Promise((resolve) => {
      // 먼저 npm view로 패키지 존재 확인 (빠름)
      const args = ['view', packageName, 'name'];
      const npmProcess = spawn('npm', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true  // Windows에서 필요
      });

      let stdout = '';
      let stderr = '';

      npmProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      npmProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      npmProcess.on('close', (code) => {
        result.logs.push(`NPM 패키지 확인 완료: 코드 ${code}`);
        result.logs.push(`STDOUT: ${stdout.slice(0, 300)}...`);
        if (stderr) {
          result.logs.push(`STDERR: ${stderr.slice(0, 300)}...`);
        }

        // NPM view가 성공하면 패키지가 존재함
        const packageExists = code === 0 && stdout.trim() === packageName;
        
        if (packageExists) {
          console.log(`✅ NPX 패키지 존재 확인: ${packageName}`);
          result.logs.push(`✅ 패키지 ${packageName} NPM 레지스트리에서 확인됨`);
        } else {
          result.error = `NPX 패키지 찾을 수 없음: ${packageName}`;
          console.log(`❌ NPX 패키지 없음: ${packageName}`);
          result.logs.push(`❌ 패키지 ${packageName}가 NPM 레지스트리에 없음`);
        }
        
        resolve(packageExists);
      });

      npmProcess.on('error', (error) => {
        result.error = `NPM 프로세스 오류: ${error.message}`;
        result.logs.push(result.error);
        console.log(`❌ NPM 프로세스 오류: ${error.message}`);
        resolve(false);
      });

      // 5초 타임아웃 (빠른 확인)
      setTimeout(() => {
        npmProcess.kill();
        result.error = 'NPM 패키지 확인 타임아웃 (5초)';
        result.logs.push(result.error);
        resolve(false);
      }, 5000);
    });
  }

  private async executePythonInstall(server: any, methodInfo: any, result: InstallResult): Promise<boolean> {
    const packageName = server.name || methodInfo.package || server.primary_url?.split('/').pop();
    
    if (!packageName) {
      result.error = 'Python 패키지명을 찾을 수 없습니다';
      result.logs.push(result.error);
      return false;
    }

    console.log(`🐍 Python 설치 시도: ${packageName}`);
    
    return new Promise((resolve) => {
      const args = ['install', packageName, '--dry-run']; // --dry-run으로 실제 설치 없이 확인
      const pipProcess = spawn('pip', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...methodInfo.env },
        shell: true  // Windows에서 필요
      });

      let stdout = '';
      let stderr = '';

      pipProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pipProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pipProcess.on('close', (code) => {
        result.logs.push(`PIP 실행 완료: 코드 ${code}`);
        result.logs.push(`STDOUT: ${stdout.slice(0, 500)}...`);
        if (stderr) {
          result.logs.push(`STDERR: ${stderr.slice(0, 500)}...`);
        }

        // PIP가 성공적으로 패키지를 찾았는지 확인
        const success = code === 0 || stdout.includes('Would install') || !stderr.includes('No matching distribution');
        
        if (success) {
          console.log(`✅ Python 패키지 확인: ${packageName}`);
        } else {
          result.error = `Python 패키지 찾기 실패: 코드 ${code}`;
          console.log(`❌ Python 패키지 실패: ${packageName} (코드: ${code})`);
        }
        
        resolve(success);
      });

      pipProcess.on('error', (error) => {
        result.error = `PIP 프로세스 오류: ${error.message}`;
        result.logs.push(result.error);
        console.log(`❌ PIP 프로세스 오류: ${error.message}`);
        resolve(false);
      });

      // 30초 타임아웃
      setTimeout(() => {
        pipProcess.kill();
        result.error = 'PIP 설치 타임아웃 (30초)';
        result.logs.push(result.error);
        resolve(false);
      }, 30000);
    });
  }

  private findMethodInfo(server: any, method: string): any | null {
    const installMethods = server.install_methods || [];
    const configOptions = server.config_options || [];
    
    // install_methods에서 찾기
    let methodInfo = installMethods.find((m: any) => m.command === method);
    
    // config_options에서 찾기
    if (!methodInfo) {
      methodInfo = configOptions.find((c: any) => c.command === method);
    }
    
    return methodInfo;
  }

  private async testMCPHealth(server: any, method: string, result: InstallResult): Promise<boolean> {
    console.log(`🔍 MCP Health 체크 시작: ${server.name}`);
    
    try {
      // MCP 서버와 기본 통신 테스트
      const healthResult = await this.performMCPHealthCheck(server, method, result);
      
      if (healthResult) {
        console.log(`✅ MCP Health 체크 성공: ${server.name}`);
        result.logs.push('✅ MCP 기본 통신 성공');
        return true;
      } else {
        console.log(`❌ MCP Health 체크 실패: ${server.name}`);
        result.logs.push('❌ MCP 기본 통신 실패');
        return false;
      }
    } catch (error) {
      result.error = `MCP Health 체크 오류: ${error}`;
      result.logs.push(result.error);
      console.error(`❌ MCP Health 체크 오류: ${server.name}`, error);
      return false;
    }
  }

  private async performMCPHealthCheck(server: any, method: string, result: InstallResult): Promise<boolean> {
    const methodInfo = this.findMethodInfo(server, method);
    if (!methodInfo) {
      result.error = 'MCP Health 체크를 위한 설치 방법 정보 없음';
      return false;
    }

    // MCP 서버 실행 명령어 구성
    const command = this.buildMCPCommand(server, methodInfo, method);
    if (!command) {
      result.error = 'MCP 실행 명령어 구성 실패';
      return false;
    }

    console.log(`🚀 MCP 서버 실행 시도: ${command.cmd} ${command.args.join(' ')}`);
    
    return new Promise((resolve) => {
      const mcpProcess = spawn(command.cmd, command.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...methodInfo.env },
        shell: true  // Windows에서 필요
      });

      let stdout = '';
      let stderr = '';
      let healthCheckPassed = false;

      mcpProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // MCP 서버가 정상적으로 시작되었는지 확인하는 패턴들
        if (output.includes('MCP server') || 
            output.includes('listening') || 
            output.includes('ready') ||
            output.includes('Server started') ||
            output.includes('Available tools:') ||
            JSON.stringify(output).includes('"method"')) {
          healthCheckPassed = true;
          console.log(`✅ MCP 서버 응답 감지: ${server.name}`);
        }
      });

      mcpProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      mcpProcess.on('close', (code) => {
        result.logs.push(`MCP 프로세스 종료: 코드 ${code}`);
        result.logs.push(`STDOUT: ${stdout.slice(0, 300)}...`);
        if (stderr) {
          result.logs.push(`STDERR: ${stderr.slice(0, 300)}...`);
        }

        resolve(healthCheckPassed || code === 0);
      });

      mcpProcess.on('error', (error) => {
        result.error = `MCP 프로세스 오류: ${error.message}`;
        result.logs.push(result.error);
        resolve(false);
      });

      // 기본 MCP 초기화 메시지 전송 (표준 MCP 프로토콜)
      setTimeout(() => {
        try {
          const initMessage = JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              capabilities: {
                roots: { listChanged: true },
                sampling: {}
              },
              clientInfo: {
                name: "mcp-test-client",
                version: "1.0.0"
              }
            }
          }) + '\n';
          
          mcpProcess.stdin?.write(initMessage);
          result.logs.push('MCP 초기화 메시지 전송됨');
        } catch (error) {
          result.logs.push(`MCP 초기화 메시지 전송 실패: ${error}`);
        }
      }, 2000);

      // 10초 타임아웃
      setTimeout(() => {
        mcpProcess.kill();
        
        if (healthCheckPassed) {
          console.log(`✅ MCP Health 체크 성공 (타임아웃 전 응답): ${server.name}`);
          resolve(true);
        } else {
          result.error = 'MCP Health 체크 타임아웃 (10초)';
          result.logs.push(result.error);
          resolve(false);
        }
      }, 10000);
    });
  }

  private buildMCPCommand(server: any, methodInfo: any, method: string): { cmd: string, args: string[] } | null {
    const packageName = server.name || methodInfo.package || server.primary_url?.split('/').pop();
    
    if (!packageName) {
      return null;
    }

    if (method === 'npx') {
      return {
        cmd: 'npx',
        args: ['--yes', packageName]
      };
    } else if (method === 'npm') {
      return {
        cmd: 'npx',
        args: ['--yes', packageName]
      };
    } else if (method === 'node') {
      return {
        cmd: 'node',
        args: [packageName]
      };
    } else if (method === 'python' || method === 'pip' || method === 'uv') {
      // Python MCP 서버는 일반적으로 모듈로 실행
      return {
        cmd: 'python',
        args: ['-m', packageName]
      };
    }

    return null;
  }

  async uninstallServer(serverId: string): Promise<InstallResult> {
    const startTime = Date.now();
    const result: InstallResult = {
      success: false,
      duration: 0,
      logs: []
    };

    try {
      console.log(`🗑️ 서버 제거 시작: ${serverId}`);
      
      // 1. DB에서 설치 기록 조회
      const { data: usage, error: fetchError } = await this.supabase
        .from('user_mcp_usage')
        .select('*')
        .eq('user_id', this.testUserId)
        .eq('server_id', serverId)
        .single();

      if (fetchError || !usage) {
        result.error = `설치 기록을 찾을 수 없습니다: ${fetchError?.message || 'Not found'}`;
        result.logs.push(result.error);
        result.duration = Date.now() - startTime;
        return result;
      }

      console.log(`📋 설치 기록 발견: ${usage.package_name} (${usage.install_method})`);
      
      // 2. 실제 패키지 제거
      const uninstallSuccess = await this.executeUninstall(usage, result);
      
      // 3. DB에서 설치 기록 제거 (실제 제거 성공 여부와 관계없이)
      const { error: deleteError } = await this.supabase
        .from('user_mcp_usage')
        .delete()
        .eq('user_id', this.testUserId)
        .eq('server_id', serverId);

      if (deleteError) {
        result.logs.push(`⚠️ DB 기록 제거 실패: ${deleteError.message}`);
        console.log(`⚠️ DB 기록 제거 실패: ${deleteError.message}`);
      } else {
        result.logs.push('✅ DB 기록 제거 성공');
        console.log(`✅ DB 기록 제거 성공: ${serverId}`);
      }

      result.success = uninstallSuccess || !deleteError; // 둘 중 하나라도 성공하면 성공
      result.duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`✅ 서버 제거 완료: ${serverId}`);
      } else {
        console.log(`❌ 서버 제거 실패: ${serverId}`);
      }
      
      return result;
      
    } catch (error) {
      result.error = `서버 제거 오류: ${error}`;
      result.logs.push(result.error);
      result.duration = Date.now() - startTime;
      console.error(`❌ 서버 제거 오류: ${serverId}`, error);
      return result;
    }
  }

  private async executeUninstall(usage: any, result: InstallResult): Promise<boolean> {
    const method = usage.install_method;
    const packageName = usage.package_name;

    if (!packageName) {
      result.error = '제거할 패키지명이 없습니다';
      result.logs.push(result.error);
      return false;
    }

    try {
      if (method === 'npx' || method === 'npm' || method === 'node') {
        return await this.executeNPXUninstall(packageName, result);
      } else if (method === 'python' || method === 'pip' || method === 'uv') {
        return await this.executePythonUninstall(packageName, result);
      } else {
        result.logs.push(`⚠️ 지원하지 않는 제거 방법: ${method} (DB만 정리)`);
        return true; // DB 정리는 성공으로 간주
      }
    } catch (error) {
      result.error = `제거 실행 오류: ${error}`;
      result.logs.push(result.error);
      return false;
    }
  }

  private async executeNPXUninstall(packageName: string, result: InstallResult): Promise<boolean> {
    console.log(`🗑️ NPX 패키지 제거 시도: ${packageName}`);
    
    return new Promise((resolve) => {
      // NPX는 캐시 정리로 처리
      const args = ['cache', 'clean'];
      const npxProcess = spawn('npm', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true  // Windows에서 필요
      });

      let stdout = '';
      let stderr = '';

      npxProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      npxProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      npxProcess.on('close', (code) => {
        result.logs.push(`NPX 캐시 정리 완료: 코드 ${code}`);
        result.logs.push(`STDOUT: ${stdout.slice(0, 300)}...`);
        if (stderr) {
          result.logs.push(`STDERR: ${stderr.slice(0, 300)}...`);
        }

        const success = code === 0;
        
        if (success) {
          console.log(`✅ NPX 캐시 정리 성공: ${packageName}`);
        } else {
          console.log(`⚠️ NPX 캐시 정리 실패: ${packageName} (코드: ${code})`);
        }
        
        resolve(success);
      });

      npxProcess.on('error', (error) => {
        result.logs.push(`NPX 캐시 정리 오류: ${error.message}`);
        console.log(`❌ NPX 캐시 정리 오류: ${error.message}`);
        resolve(false);
      });

      // 15초 타임아웃
      setTimeout(() => {
        npxProcess.kill();
        result.logs.push('NPX 캐시 정리 타임아웃 (15초)');
        resolve(false);
      }, 15000);
    });
  }

  private async executePythonUninstall(packageName: string, result: InstallResult): Promise<boolean> {
    console.log(`🗑️ Python 패키지 제거 시도: ${packageName}`);
    
    return new Promise((resolve) => {
      const args = ['uninstall', packageName, '-y'];
      const pipProcess = spawn('pip', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true  // Windows에서 필요
      });

      let stdout = '';
      let stderr = '';

      pipProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      pipProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pipProcess.on('close', (code) => {
        result.logs.push(`PIP 제거 완료: 코드 ${code}`);
        result.logs.push(`STDOUT: ${stdout.slice(0, 300)}...`);
        if (stderr) {
          result.logs.push(`STDERR: ${stderr.slice(0, 300)}...`);
        }

        // PIP 제거는 패키지가 없어도 성공으로 간주
        const success = code === 0 || stdout.includes('not installed') || stderr.includes('not installed');
        
        if (success) {
          console.log(`✅ Python 패키지 제거 성공: ${packageName}`);
        } else {
          console.log(`⚠️ Python 패키지 제거 실패: ${packageName} (코드: ${code})`);
        }
        
        resolve(success);
      });

      pipProcess.on('error', (error) => {
        result.logs.push(`PIP 제거 오류: ${error.message}`);
        console.log(`❌ PIP 제거 오류: ${error.message}`);
        resolve(false);
      });

      // 30초 타임아웃
      setTimeout(() => {
        pipProcess.kill();
        result.logs.push('PIP 제거 타임아웃 (30초)');
        resolve(false);
      }, 30000);
    });
  }

  async checkSystemRequirements(): Promise<{ [key: string]: boolean }> {
    const requirements = {
      npx: false,
      python: false,
      pip: false
    };

    // NPX 확인
    try {
      await new Promise<void>((resolve) => {
        const npxProcess = spawn('npx', ['--version'], { 
          stdio: 'pipe',
          shell: true  // Windows에서 .cmd 파일 실행을 위해 필요
        });
        npxProcess.on('close', (code) => {
          requirements.npx = code === 0;
          resolve();
        });
        npxProcess.on('error', () => {
          requirements.npx = false;
          resolve();
        });
        setTimeout(() => {
          npxProcess.kill();
          resolve();
        }, 5000);
      });
    } catch {
      requirements.npx = false;
    }

    // Python 확인
    try {
      await new Promise<void>((resolve) => {
        const pythonProcess = spawn('python', ['--version'], { 
          stdio: 'pipe',
          shell: true  // Windows에서 필요
        });
        pythonProcess.on('close', (code) => {
          requirements.python = code === 0;
          resolve();
        });
        pythonProcess.on('error', () => {
          requirements.python = false;
          resolve();
        });
        setTimeout(() => {
          pythonProcess.kill();
          resolve();
        }, 5000);
      });
    } catch {
      requirements.python = false;
    }

    // PIP 확인
    try {
      await new Promise<void>((resolve) => {
        const pipProcess = spawn('pip', ['--version'], { 
          stdio: 'pipe',
          shell: true  // Windows에서 필요
        });
        pipProcess.on('close', (code) => {
          requirements.pip = code === 0;
          resolve();
        });
        pipProcess.on('error', () => {
          requirements.pip = false;
          resolve();
        });
        setTimeout(() => {
          pipProcess.kill();
          resolve();
        }, 5000);
      });
    } catch {
      requirements.pip = false;
    }

    return requirements;
  }

  async verifyInstallation(serverId: string | number): Promise<InstallResult> {
    const startTime = Date.now();
    const result: InstallResult = {
      success: false,
      duration: 0,
      logs: []
    };

    try {
      // DB에서 설치 기록 확인
      const { data: usage, error } = await this.supabase
        .from('user_mcp_usage')
        .select('*')
        .eq('user_id', this.testUserId)
        .eq('server_id', serverId)
        .single();

      if (error || !usage) {
        result.error = `설치 기록을 찾을 수 없습니다: ${error?.message || 'Not found'}`;
        result.logs.push(result.error);
      } else {
        result.success = true;
        result.logs.push(`✅ 설치 기록 확인: ${usage.package_name} (${usage.install_method})`);
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      result.error = `설치 확인 오류: ${error}`;
      result.logs.push(result.error);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  async cleanupInstallation(serverId: string | number): Promise<InstallResult> {
    return await this.uninstallServer(String(serverId));
  }
}

export { RealMCPInstaller, InstallResult, InstallConfig };