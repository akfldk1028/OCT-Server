// scripts/sequential-installer.ts
// 순차적 설치/제거 로직 - 기존 installer store와 완전 통합

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Store 타입 정의 (기존 store와 동일)
interface InstallProgress {
  serverName: string;
  status: string;
  percent: number;
  currentStep: string;
  error?: string;
}

interface InstallConfig {
  is_zero_install?: boolean;
  type?: string;
  install_method?: string;
  env?: Record<string, any>;
  package?: string;
  source?: string;
  description?: string;
  command?: string | null;
  args?: string[];
  install_method_id?: number | null;
  [key: string]: any;
}

interface TestServer {
  id: number;
  name: string;
  description?: string;
  github_url?: string;
  install_methods?: any[];
  config_options?: any[];
}

interface SequentialTestResult {
  serverId: number;
  serverName: string;
  method: string;
  success: boolean;
  phases: {
    install: { success: boolean; duration: number; error?: string };
    verify: { success: boolean; duration: number; error?: string };
    cleanup: { success: boolean; duration: number; error?: string };
  };
  totalDuration: number;
  timestamp: string;
  logs: string[];
}

interface SequentialTestConfig {
  testUserId: string;
  maxConcurrentTests: number;
  delayBetweenTests: number;
  installTimeout: number;
  verifyTimeout: number;
  cleanupTimeout: number;
  supportedMethods: string[];
  retryCount: number;
}

class SequentialInstaller {
  private supabase: any;
  private config: SequentialTestConfig;
  private currentTest: string | null = null;
  private testQueue: Array<{ server: TestServer; method: string }> = [];
  private results: SequentialTestResult[] = [];
  private progressCallback?: (progress: any) => void;

  constructor(supabaseUrl: string, supabaseKey: string, config: SequentialTestConfig) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = config;
  }

  setProgressCallback(callback: (progress: any) => void): void {
    this.progressCallback = callback;
  }

  async runSequentialTest(servers: TestServer[]): Promise<SequentialTestResult[]> {
    console.log('🔄 순차적 설치/제거 테스트 시작');
    console.log(`📊 테스트 대상: ${servers.length}개 서버`);
    
    // 1. 테스트 큐 생성
    this.buildTestQueue(servers);
    console.log(`📝 총 ${this.testQueue.length}개 테스트 예정`);
    
    // 2. 순차적 테스트 실행
    for (let i = 0; i < this.testQueue.length; i++) {
      const { server, method } = this.testQueue[i];
      
      console.log(`\n[${i + 1}/${this.testQueue.length}] 🎯 ${server.name} (${method}) 테스트 중...`);
      
      // 진행상황 알림
      this.notifyProgress({
        phase: 'testing',
        current: i + 1,
        total: this.testQueue.length,
        serverName: server.name,
        method: method
      });
      
      const result = await this.testSingleServerMethod(server, method);
      this.results.push(result);
      
      // 테스트 간 대기
      if (i < this.testQueue.length - 1) {
        console.log(`⏳ ${this.config.delayBetweenTests / 1000}초 대기...`);
        await this.delay(this.config.delayBetweenTests);
      }
    }
    
    console.log('\n✅ 모든 순차적 테스트 완료');
    this.printSummary();
    
    return this.results;
  }

  private buildTestQueue(servers: TestServer[]): void {
    this.testQueue = [];
    
    for (const server of servers) {
      const availableMethods = this.getServerMethods(server);
      
      for (const method of availableMethods) {
        this.testQueue.push({ server, method });
      }
    }
    
    console.log(`📋 테스트 큐 구성 완료: ${this.testQueue.length}개 항목`);
  }

  private getServerMethods(server: TestServer): string[] {
    const methods = new Set<string>();
    
    // install_methods에서 지원 방법 찾기
    const installMethods = server.install_methods || [];
    installMethods.forEach((method: any) => {
      if (this.config.supportedMethods.includes(method.command)) {
        methods.add(method.command);
      }
    });
    
    // config_options에서 지원 방법 찾기
    const configOptions = server.config_options || [];
    configOptions.forEach((config: any) => {
      if (this.config.supportedMethods.includes(config.command)) {
        methods.add(config.command);
      }
    });
    
    return Array.from(methods);
  }

  private async testSingleServerMethod(server: TestServer, method: string): Promise<SequentialTestResult> {
    const startTime = Date.now();
    const serverId = String(server.id);
    
    const result: SequentialTestResult = {
      serverId: server.id,
      serverName: server.name,
      method,
      success: false,
      phases: {
        install: { success: false, duration: 0 },
        verify: { success: false, duration: 0 },
        cleanup: { success: false, duration: 0 }
      },
      totalDuration: 0,
      timestamp: new Date().toISOString(),
      logs: []
    };

    this.currentTest = `${server.name}-${method}`;

    try {
      // Phase 1: 설치
      console.log('  📦 Phase 1: 설치 중...');
      const installResult = await this.runInstallPhase(server, method);
      result.phases.install = installResult;
      result.logs.push(...installResult.logs || []);
      
      if (!installResult.success) {
        console.log(`    ❌ 설치 실패: ${installResult.error}`);
        return result;
      }
      
      console.log(`    ✅ 설치 성공 (${Math.round(installResult.duration / 1000)}초)`);
      
      // Phase 2: 검증
      console.log('  🔍 Phase 2: DB 검증 중...');
      await this.delay(2000); // 2초 대기
      const verifyResult = await this.runVerifyPhase(server.id);
      result.phases.verify = verifyResult;
      
      if (!verifyResult.success) {
        console.log(`    ❌ 검증 실패: ${verifyResult.error}`);
      } else {
        console.log(`    ✅ 검증 성공 (${Math.round(verifyResult.duration / 1000)}초)`);
      }
      
      // Phase 3: 정리 (성공 여부와 관계없이 실행)
      console.log('  🗑️ Phase 3: 정리 중...');
      const cleanupResult = await this.runCleanupPhase(serverId);
      result.phases.cleanup = cleanupResult;
      
      if (!cleanupResult.success) {
        console.log(`    ⚠️ 정리 실패: ${cleanupResult.error}`);
      } else {
        console.log(`    ✅ 정리 성공 (${Math.round(cleanupResult.duration / 1000)}초)`);
      }
      
      // 전체 성공 여부 결정
      result.success = installResult.success && verifyResult.success && cleanupResult.success;
      
    } catch (error) {
      console.error(`    ❌ 예외 발생:`, error);
      result.logs.push(`예외: ${error}`);
    } finally {
      result.totalDuration = Date.now() - startTime;
      this.currentTest = null;
      
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} 총 소요 시간: ${Math.round(result.totalDuration / 1000)}초`);
    }
    
    return result;
  }

  private async runInstallPhase(server: TestServer, method: string): Promise<{ success: boolean; duration: number; error?: string; logs?: string[] }> {
    const startTime = Date.now();
    const logs: string[] = [];
    
    try {
      // 설치 방법 정보 찾기
      const methodInfo = this.findMethodInfo(server, method);
      if (!methodInfo) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: `${method} 방법을 찾을 수 없음`,
          logs
        };
      }
      
      // 설치 설정 생성
      const installConfig = this.createInstallConfig(server, methodInfo);
      logs.push(`설치 설정: ${JSON.stringify(installConfig, null, 2)}`);
      
      // 실제 설치 호출 (installer store의 installServer 메서드 사용)
      const installResult = await this.callInstallerStore('installServer', {
        serverName: String(server.id),
        config: installConfig,
        preferredMethod: method,
        userProfileId: this.config.testUserId,
        selectedInstallMethod: methodInfo
      });
      
      logs.push(`설치 결과: ${JSON.stringify(installResult)}`);
      
      return {
        success: installResult.success,
        duration: Date.now() - startTime,
        error: installResult.error,
        logs
      };
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: String(error),
        logs
      };
    }
  }

  private async runVerifyPhase(serverId: number): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await this.supabase
        .from('user_mcp_usage')
        .select('*')
        .eq('profile_id', this.config.testUserId)
        .eq('original_server_id', serverId)
        .eq('install_status', 'success');
      
      if (error) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        };
      }
      
      const hasRecords = (data?.length || 0) > 0;
      
      return {
        success: hasRecords,
        duration: Date.now() - startTime,
        error: hasRecords ? undefined : 'DB에 설치 기록이 없음'
      };
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: String(error)
      };
    }
  }

  private async runCleanupPhase(serverId: string): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // installer store의 uninstallServer 메서드 사용
      const uninstallResult = await this.callInstallerStore('uninstallServer', {
        serverName: serverId,
        userProfileId: this.config.testUserId
      });
      
      return {
        success: uninstallResult.success,
        duration: Date.now() - startTime,
        error: uninstallResult.error
      };
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: String(error)
      };
    }
  }

  private findMethodInfo(server: TestServer, method: string): any | null {
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

  private createInstallConfig(server: TestServer, methodInfo: any): InstallConfig {
    return {
      is_zero_install: methodInfo.is_zero_install || false,
      type: methodInfo.command || 'unknown',
      install_method: methodInfo.command || 'unknown',
      env: methodInfo.env || {},
      package: server.name,
      source: server.github_url,
      description: server.description,
      command: methodInfo.command || null,
      args: methodInfo.args || [],
      install_method_id: methodInfo.id || null
    };
  }

  // installer store와의 통신을 위한 메서드 (실제 환경에서는 IPC나 직접 호출)
  private async callInstallerStore(method: string, payload: any): Promise<any> {
    // 실제 구현에서는 이 부분을 Electron IPC나 직접 store 호출로 대체
    // 현재는 시뮬레이션을 위한 Mock 구현
    
    console.log(`🔧 installer store 호출: ${method}`, payload);
    
    if (method === 'installServer') {
      // 설치 시뮬레이션
      const success = Math.random() > 0.2; // 80% 성공률
      await this.delay(2000 + Math.random() * 3000); // 2-5초 소요
      
      return {
        success,
        error: success ? undefined : 'Mock installation failed'
      };
    } else if (method === 'uninstallServer') {
      // 제거 시뮬레이션
      const success = Math.random() > 0.1; // 90% 성공률
      await this.delay(1000 + Math.random() * 2000); // 1-3초 소요
      
      return {
        success,
        error: success ? undefined : 'Mock uninstallation failed'
      };
    }
    
    return { success: false, error: 'Unknown method' };
  }

  private notifyProgress(progress: any): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  private printSummary(): void {
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;
    
    console.log('\n📊 순차적 테스트 결과 요약:');
    console.log(`   총 테스트: ${totalTests}개`);
    console.log(`   성공: ${successfulTests}개`);
    console.log(`   실패: ${failedTests}개`);
    console.log(`   성공률: ${successRate.toFixed(1)}%`);
    
    // 방법별 통계
    const methodStats: { [method: string]: { success: number; failed: number } } = {};
    this.results.forEach(result => {
      if (!methodStats[result.method]) {
        methodStats[result.method] = { success: 0, failed: 0 };
      }
      
      if (result.success) {
        methodStats[result.method].success++;
      } else {
        methodStats[result.method].failed++;
      }
    });
    
    if (Object.keys(methodStats).length > 0) {
      console.log('\n🔧 방법별 결과:');
      Object.entries(methodStats).forEach(([method, stats]) => {
        const total = stats.success + stats.failed;
        const rate = total > 0 ? (stats.success / total * 100).toFixed(1) : '0.0';
        console.log(`   ${method}: ${stats.success}/${total} (${rate}%)`);
      });
    }
    
    // 실패한 테스트들
    const failedResults = this.results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.log('\n❌ 실패한 테스트:');
      failedResults.forEach(result => {
        console.log(`   ${result.serverName} (${result.method})`);
        if (!result.phases.install.success) {
          console.log(`     - 설치 실패: ${result.phases.install.error}`);
        }
        if (!result.phases.verify.success) {
          console.log(`     - 검증 실패: ${result.phases.verify.error}`);
        }
        if (!result.phases.cleanup.success) {
          console.log(`     - 정리 실패: ${result.phases.cleanup.error}`);
        }
      });
    }
  }

  async exportResults(filePath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      totalTests: this.results.length,
      successfulTests: this.results.filter(r => r.success).length,
      failedTests: this.results.filter(r => !r.success).length,
      results: this.results
    };
    
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 결과 저장: ${filePath}`);
  }

  getResults(): SequentialTestResult[] {
    return this.results;
  }

  getCurrentTest(): string | null {
    return this.currentTest;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 실행 함수
async function runSequentialInstallationTest(): Promise<void> {
  const config: SequentialTestConfig = {
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    maxConcurrentTests: 1, // 순차적 테스트이므로 1
    delayBetweenTests: 3000,
    installTimeout: 60000,
    verifyTimeout: 10000,
    cleanupTimeout: 30000,
    supportedMethods: ['npx', 'python'],
    retryCount: 2
  };
  
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  
  const installer = new SequentialInstaller(supabaseUrl, supabaseKey, config);
  
  // 진행상황 콜백 설정
  installer.setProgressCallback((progress) => {
    console.log(`📊 진행상황: [${progress.current}/${progress.total}] ${progress.serverName} (${progress.method})`);
  });
  
  // 테스트할 서버 목록 가져오기 (실제로는 DB에서 조회)
  const testServers: TestServer[] = [
    {
      id: 1,
      name: 'test-server-1',
      install_methods: [{ command: 'npx', args: ['test-package-1'] }]
    },
    {
      id: 2, 
      name: 'test-server-2',
      install_methods: [{ command: 'python', args: ['-m', 'pip', 'install', 'test-package-2'] }]
    }
  ];
  
  const results = await installer.runSequentialTest(testServers);
  
  // 결과 저장
  const reportPath = path.join(__dirname, '..', 'reports', `sequential-test-${Date.now()}.json`);
  await installer.exportResults(reportPath);
  
  // 성공률 확인
  const successRate = results.length > 0 ? (results.filter(r => r.success).length / results.length) * 100 : 0;
  
  if (successRate < 70) {
    console.log('⚠️ 순차적 테스트 성공률이 70% 미만입니다.');
    process.exit(1);
  } else {
    console.log('✅ 순차적 테스트가 성공적으로 완료되었습니다.');
    process.exit(0);
  }
}

if (require.main === module) {
  runSequentialInstallationTest().catch(error => {
    console.error('❌ 순차적 테스트 실행 중 오류:', error);
    process.exit(1);
  });
}

export { SequentialInstaller, runSequentialInstallationTest };