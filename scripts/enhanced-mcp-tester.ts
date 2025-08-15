// scripts/enhanced-mcp-tester.ts
// 향상된 MCP 서버 자동화 테스트 시스템

import * as dotenv from 'dotenv';
import path from 'path';

// 환경변수 로드
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { RealMCPInstaller } from './real-mcp-installer';
import fs from 'fs/promises';

interface TestServer {
  id: number;
  name: string;
  description?: string;
  primary_url?: string;
  install_methods?: any[];
  config_options?: any[];
}

interface TestConfig {
  maxServersToTest: number;
  testUserId: string;
  supportedMethods: string[];
  delayBetweenTests: number;
  maxRetries: number;
  timeout: number;
  reportPath: string;
  environment: string;
}

interface ServerTestResult {
  serverId: number;
  serverName: string;
  method: string;
  installSuccess: boolean;
  dbVerificationSuccess: boolean;
  uninstallSuccess: boolean;
  installDuration: number;
  verificationDuration: number;
  uninstallDuration: number;
  totalDuration: number;
  errors: string[];
  logs: string[];
  timestamp: string;
  retryCount: number;
}

interface TestSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  totalDuration: number;
  config: TestConfig;
  systemRequirements: any;
  results: ServerTestResult[];
  summary: {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    successRate: number;
    averageDuration: number;
    methodBreakdown: { [method: string]: { success: number; failed: number } };
    errorSummary: { [error: string]: number };
    performanceStats: {
      fastestInstall: number;
      slowestInstall: number;
      averageInstallTime: number;
    };
  };
}

class EnhancedMCPTester {
  private config: TestConfig;
  private session: TestSession;
  private installer: RealMCPInstaller;
  private supabase: any;

  constructor(config: TestConfig) {
    this.config = config;
    this.session = this.initializeSession(config);
    
    // Supabase 클라이언트 초기화
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // 실제 설치기 초기화
    this.installer = new RealMCPInstaller(supabaseUrl, supabaseKey, config.testUserId);
  }

  private initializeSession(config: TestConfig): TestSession {
    const sessionId = `mcp-test-${Date.now()}`;
    return {
      sessionId,
      startTime: new Date().toISOString(),
      endTime: '',
      totalDuration: 0,
      config,
      systemRequirements: {},
      results: [],
      summary: {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        successRate: 0,
        averageDuration: 0,
        methodBreakdown: {},
        errorSummary: {},
        performanceStats: {
          fastestInstall: Infinity,
          slowestInstall: 0,
          averageInstallTime: 0
        }
      }
    };
  }

  async runFullTest(): Promise<TestSession> {
    console.log('🚀 향상된 MCP 서버 테스트 시작');
    console.log(`📊 세션 ID: ${this.session.sessionId}`);
    console.log(`🔧 테스트 환경: ${this.config.environment}`);
    
    const startTime = Date.now();

    try {
      // 1. 시스템 요구사항 확인
      console.log('\n🔍 시스템 요구사항 확인 중...');
      this.session.systemRequirements = await this.installer.checkSystemRequirements();
      this.logSystemRequirements();

      // 2. 테스트 대상 서버 선택
      console.log('\n📝 테스트 대상 서버 선택 중...');
      const testServers = await this.selectTestServers();
      console.log(`✅ ${testServers.length}개 서버 선택됨`);

      if (testServers.length === 0) {
        console.log('⚠️ 테스트할 서버가 없습니다.');
        return this.session;
      }

      // 3. 순차적 테스트 실행
      console.log('\n🔄 순차적 테스트 실행 시작...');
      const maxTests = Math.min(testServers.length, this.config.maxServersToTest);
      
      for (let i = 0; i < maxTests; i++) {
        const server = testServers[i];
        console.log(`\n[${i + 1}/${maxTests}] 🎯 ${server.name} 테스트 중...`);
        
        await this.testServerWithRetry(server);
        
        // 테스트 간 간격
        if (i < maxTests - 1) {
          console.log(`⏳ ${this.config.delayBetweenTests / 1000}초 대기...`);
          await this.delay(this.config.delayBetweenTests);
        }
      }

      // 4. 결과 분석 및 리포트 생성
      await this.generateFinalReport();

    } catch (error) {
      console.error('❌ 테스트 실행 중 치명적 오류:', error);
    } finally {
      const endTime = Date.now();
      this.session.endTime = new Date().toISOString();
      this.session.totalDuration = endTime - startTime;
      
      console.log('\n✅ 테스트 완료!');
      this.printFinalSummary();
    }

    return this.session;
  }

  private logSystemRequirements(): void {
    const { npx, python, pip } = this.session.systemRequirements;
    console.log(`   NPX: ${npx ? '✅ 사용 가능' : '❌ 설치 필요'}`);
    console.log(`   Python: ${python ? '✅ 사용 가능' : '❌ 설치 필요'}`);
    console.log(`   Pip: ${pip ? '✅ 사용 가능' : '❌ 설치 필요'}`);
    
    const missingRequirements = [];
    if (!npx) missingRequirements.push('npx');
    if (!python) missingRequirements.push('python');
    if (!pip) missingRequirements.push('pip');
    
    if (missingRequirements.length > 0) {
      console.log(`⚠️ 누락된 요구사항: ${missingRequirements.join(', ')}`);
    }
  }

  private async selectTestServers(): Promise<any[]> {
    // 1. 먼저 mcp_servers를 가져옴
    const { data: servers, error } = await this.supabase
      .from('mcp_servers')
      .select(`
        id,
        name,
        description,
        primary_url,
        derived_config,
        derived_install_command
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ 서버 목록 조회 실패:', error);
      return [];
    }

    if (!servers || servers.length === 0) {
      console.log('⚠️ 서버가 없습니다.');
      return [];
    }

    console.log(`📋 총 ${servers.length}개 서버 발견`);

    // 2. 각 서버의 설치 방법들을 가져옴 (더 많은 서버 검사)
    const serversWithMethods = [];
    let checkedCount = 0;
    const maxChecks = Math.min(30, servers.length); // 최대 30개까지 검사
    
    for (const server of servers.slice(0, maxChecks)) {
      if (serversWithMethods.length >= this.config.maxServersToTest) {
        break;
      }
      checkedCount++;
      const serverWithMethods = await this.getServerWithMethods(server);
      if (serverWithMethods) {
        serversWithMethods.push(serverWithMethods);
        console.log(`✅ 서버 발견 (${serversWithMethods.length}/${this.config.maxServersToTest}): ${server.name}`);
      }
    }
    console.log(`📋 ${checkedCount}개 서버 검사 완료`)

    console.log(`🔍 총 ${servers.length}개 서버 중 ${serversWithMethods.length}개가 설치 방법 보유`);
    return serversWithMethods;
  }

  private async getServerWithMethods(server: any): Promise<TestServer | null> {
    try {
      // mcp_install_methods에서 설치 방법 가져오기
      const { data: installMethods, error: installError } = await this.supabase
        .from('mcp_install_methods')
        .select('*')
        .eq('original_server_id', server.id);

      if (installError) {
        console.error(`❌ 서버 ${server.name} 설치 방법 조회 실패:`, installError);
        return null;
      }

      // mcp_configs에서 설정 옵션 가져오기
      const { data: configs, error: configError } = await this.supabase
        .from('mcp_configs')
        .select('*')
        .eq('original_server_id', server.id);

      if (configError) {
        console.error(`❌ 서버 ${server.name} 설정 조회 실패:`, configError);
        return null;
      }

      // 지원하는 설치 방법이 있는지 확인
      const hasCompatibleMethod = this.checkCompatibleMethods(installMethods, configs);
      
      if (!hasCompatibleMethod) {
        const installCommands = installMethods?.map((m: any) => m.command).filter(Boolean) || [];
        const configCommands = configs?.map((c: any) => c.command).filter(Boolean) || [];
        console.log(`⚠️ 서버 ${server.name}: 지원하는 설치 방법 없음`);
        console.log(`   설치방법 명령어: [${installCommands.join(', ')}]`);
        console.log(`   설정 명령어: [${configCommands.join(', ')}]`);
        console.log(`   지원 명령어: [${this.config.supportedMethods.join(', ')}]`);
        return null;
      }

      console.log(`✅ 서버 ${server.name}: ${installMethods?.length || 0}개 설치방법, ${configs?.length || 0}개 설정`);

      return {
        ...server,
        install_methods: installMethods || [],
        config_options: configs || []
      };
    } catch (error) {
      console.error(`❌ 서버 ${server.name} 메서드 조회 중 오류:`, error);
      return null;
    }
  }

  private checkCompatibleMethods(installMethods: any[], configs: any[]): boolean {
    // install_methods에서 지원 방법 확인
    if (installMethods?.some(method => 
      method.command && this.config.supportedMethods.includes(method.command)
    )) {
      return true;
    }

    // configs에서 지원 방법 확인
    if (configs?.some(config => 
      config.command && this.config.supportedMethods.includes(config.command)
    )) {
      return true;
    }

    return false;
  }

  private hasCompatibleMethods(server: any): boolean {
    const installMethods = server.install_methods || [];
    const configOptions = server.config_options || [];
    
    // 시스템 요구사항과 매칭
    const { npx, python } = this.session.systemRequirements;
    
    const hasNpxMethod = (npx && installMethods.some((m: any) => m.command === 'npx')) ||
                         (npx && configOptions.some((c: any) => c.command === 'npx'));
    
    const hasPythonMethod = (python && installMethods.some((m: any) => m.command === 'python' || m.command === 'pip')) ||
                            (python && configOptions.some((c: any) => c.command === 'python' || c.command === 'pip'));
    
    return hasNpxMethod || hasPythonMethod;
  }

  private async testServerWithRetry(server: any): Promise<void> {
    const availableMethods = this.getAvailableMethods(server);
    
    for (const method of availableMethods) {
      let success = false;
      let retryCount = 0;
      
      while (!success && retryCount < this.config.maxRetries) {
        console.log(`  🔧 ${method} 방법 테스트 (시도 ${retryCount + 1}/${this.config.maxRetries})`);
        
        const result = await this.testSingleMethod(server, method, retryCount);
        this.session.results.push(result);
        
        success = result.installSuccess && result.dbVerificationSuccess && result.uninstallSuccess;
        
        if (success) {
          this.session.summary.successfulTests++;
          console.log(`    ✅ 성공 (${Math.round(result.totalDuration / 1000)}초)`);
        } else {
          this.session.summary.failedTests++;
          console.log(`    ❌ 실패: ${result.errors.join(', ')}`);
          
          if (retryCount < this.config.maxRetries - 1) {
            const delay = Math.min(1000 * (retryCount + 1), 5000);
            console.log(`    ⏳ ${delay / 1000}초 후 재시도...`);
            await this.delay(delay);
          }
        }
        
        retryCount++;
      }
      
      this.session.summary.totalTests++;
    }
  }

  private getAvailableMethods(server: any): string[] {
    const methods = new Set<string>();
    const { npx, python } = this.session.systemRequirements;
    
    const installMethods = server.install_methods || [];
    const configOptions = server.config_options || [];
    
    if (npx) {
      installMethods.forEach((m: any) => {
        if (m.command === 'npx') methods.add('npx');
      });
      configOptions.forEach((c: any) => {
        if (c.command === 'npx') methods.add('npx');
      });
    }
    
    if (python) {
      installMethods.forEach((m: any) => {
        if (m.command === 'python' || m.command === 'pip') methods.add('python');
      });
      configOptions.forEach((c: any) => {
        if (c.command === 'python' || c.command === 'pip') methods.add('python');
      });
    }
    
    return Array.from(methods);
  }

  private async testSingleMethod(server: any, method: string, retryCount: number): Promise<ServerTestResult> {
    const startTime = Date.now();
    const result: ServerTestResult = {
      serverId: server.id,
      serverName: server.name,
      method,
      installSuccess: false,
      dbVerificationSuccess: false,
      uninstallSuccess: false,
      installDuration: 0,
      verificationDuration: 0,
      uninstallDuration: 0,
      totalDuration: 0,
      errors: [],
      logs: [],
      timestamp: new Date().toISOString(),
      retryCount
    };

    try {
      // 1. 설치 테스트
      const installStart = Date.now();
      const installResult = await this.installer.testInstallation(server, method);
      result.installDuration = Date.now() - installStart;
      result.installSuccess = installResult.success;
      result.logs.push(...installResult.logs);
      
      if (!installResult.success) {
        result.errors.push(`설치 실패: ${installResult.error}`);
      }

      if (result.installSuccess) {
        // 2. DB 검증
        await this.delay(2000); // 2초 대기
        const verifyStart = Date.now();
        const verifyResult = await this.installer.verifyInstallation(server.id);
        result.verificationDuration = Date.now() - verifyStart;
        result.dbVerificationSuccess = verifyResult.success;
        
        if (!verifyResult.success) {
          result.errors.push('DB 검증 실패');
        }

        // 3. 정리
        const uninstallStart = Date.now();
        const cleanupResult = await this.installer.cleanupInstallation(server.id);
        result.uninstallDuration = Date.now() - uninstallStart;
        result.uninstallSuccess = cleanupResult.success;
        
        if (!cleanupResult.success) {
          result.errors.push(`정리 실패: ${cleanupResult.error}`);
        }
      }

    } catch (error) {
      result.errors.push(`예외 발생: ${error}`);
    } finally {
      result.totalDuration = Date.now() - startTime;
      
      // 성능 통계 업데이트
      if (result.installSuccess) {
        this.updatePerformanceStats(result.installDuration);
      }
    }

    return result;
  }

  private updatePerformanceStats(installDuration: number): void {
    const stats = this.session.summary.performanceStats;
    stats.fastestInstall = Math.min(stats.fastestInstall, installDuration);
    stats.slowestInstall = Math.max(stats.slowestInstall, installDuration);
  }

  private async generateFinalReport(): Promise<void> {
    console.log('\n📊 최종 리포트 생성 중...');
    
    // 요약 통계 계산
    this.calculateSummaryStats();
    
    // HTML 리포트 생성
    await this.generateHTMLReport();
    
    // JSON 리포트 저장
    const jsonReport = JSON.stringify(this.session, null, 2);
    await fs.writeFile(this.config.reportPath, jsonReport, 'utf-8');
    
    console.log(`📄 JSON 리포트: ${this.config.reportPath}`);
    console.log(`📄 HTML 리포트: ${this.config.reportPath.replace('.json', '.html')}`);
  }

  private calculateSummaryStats(): void {
    const { results } = this.session;
    const summary = this.session.summary;
    
    // 성공률 계산
    summary.successRate = summary.totalTests > 0 
      ? (summary.successfulTests / summary.totalTests) * 100 
      : 0;
    
    // 평균 소요 시간
    summary.averageDuration = results.length > 0
      ? results.reduce((sum, r) => sum + r.totalDuration, 0) / results.length
      : 0;
    
    // 평균 설치 시간
    const installTimes = results.filter(r => r.installSuccess).map(r => r.installDuration);
    summary.performanceStats.averageInstallTime = installTimes.length > 0
      ? installTimes.reduce((sum, time) => sum + time, 0) / installTimes.length
      : 0;
    
    // 방법별 통계
    results.forEach(result => {
      if (!summary.methodBreakdown[result.method]) {
        summary.methodBreakdown[result.method] = { success: 0, failed: 0 };
      }
      
      if (result.installSuccess && result.dbVerificationSuccess && result.uninstallSuccess) {
        summary.methodBreakdown[result.method].success++;
      } else {
        summary.methodBreakdown[result.method].failed++;
      }
    });
    
    // 오류 요약
    results.forEach(result => {
      result.errors.forEach(error => {
        summary.errorSummary[error] = (summary.errorSummary[error] || 0) + 1;
      });
    });
  }

  private async generateHTMLReport(): Promise<void> {
    const htmlPath = this.config.reportPath.replace('.json', '.html');
    const { summary } = this.session;
    
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP 서버 테스트 리포트 - ${this.session.sessionId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #333; }
        .stat-label { color: #666; margin-top: 8px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .results-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .results-table th, .results-table td { padding: 12px; border: 1px solid #ddd; text-align: left; }
        .results-table th { background: #f8f9fa; }
        .status-success { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 MCP 서버 자동화 테스트 리포트</h1>
            <p>세션 ID: ${this.session.sessionId}</p>
            <p>실행 시간: ${this.session.startTime} ~ ${this.session.endTime}</p>
            <p>총 소요 시간: ${Math.round(this.session.totalDuration / 1000)}초</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value ${summary.successRate >= 70 ? 'success' : summary.successRate >= 50 ? 'warning' : 'danger'}">
                    ${summary.successRate.toFixed(1)}%
                </div>
                <div class="stat-label">성공률</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${summary.totalTests}</div>
                <div class="stat-label">총 테스트</div>
            </div>
            <div class="stat-card">
                <div class="stat-value success">${summary.successfulTests}</div>
                <div class="stat-label">성공</div>
            </div>
            <div class="stat-card">
                <div class="stat-value danger">${summary.failedTests}</div>
                <div class="stat-label">실패</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round(summary.averageDuration / 1000)}초</div>
                <div class="stat-label">평균 소요 시간</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round(summary.performanceStats.averageInstallTime / 1000)}초</div>
                <div class="stat-label">평균 설치 시간</div>
            </div>
        </div>
        
        <h2>📊 방법별 통계</h2>
        <table class="results-table">
            <thead>
                <tr>
                    <th>설치 방법</th>
                    <th>성공</th>
                    <th>실패</th>
                    <th>성공률</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(summary.methodBreakdown).map(([method, stats]) => {
                  const total = stats.success + stats.failed;
                  const rate = total > 0 ? (stats.success / total * 100).toFixed(1) : '0.0';
                  return `
                    <tr>
                        <td>${method}</td>
                        <td class="success">${stats.success}</td>
                        <td class="danger">${stats.failed}</td>
                        <td>${rate}%</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        
        <h2>🔍 상세 결과</h2>
        <table class="results-table">
            <thead>
                <tr>
                    <th>서버명</th>
                    <th>방법</th>
                    <th>설치</th>
                    <th>DB 검증</th>
                    <th>정리</th>
                    <th>소요 시간</th>
                    <th>재시도</th>
                </tr>
            </thead>
            <tbody>
                ${this.session.results.map(result => `
                    <tr>
                        <td>${result.serverName}</td>
                        <td>${result.method}</td>
                        <td class="${result.installSuccess ? 'status-success' : 'status-failed'}">
                            ${result.installSuccess ? '✅' : '❌'}
                        </td>
                        <td class="${result.dbVerificationSuccess ? 'status-success' : 'status-failed'}">
                            ${result.dbVerificationSuccess ? '✅' : '❌'}
                        </td>
                        <td class="${result.uninstallSuccess ? 'status-success' : 'status-failed'}">
                            ${result.uninstallSuccess ? '✅' : '❌'}
                        </td>
                        <td>${Math.round(result.totalDuration / 1000)}초</td>
                        <td>${result.retryCount}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${Object.keys(summary.errorSummary).length > 0 ? `
        <h2>⚠️ 주요 오류</h2>
        <ul>
            ${Object.entries(summary.errorSummary)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([error, count]) => `<li>${error} (${count}회)</li>`)
              .join('')}
        </ul>
        ` : ''}
    </div>
</body>
</html>`;
    
    await fs.writeFile(htmlPath, html, 'utf-8');
  }

  private printFinalSummary(): void {
    const { summary } = this.session;
    
    console.log(`📊 총 테스트: ${summary.totalTests}회`);
    console.log(`✅ 성공: ${summary.successfulTests}회`);
    console.log(`❌ 실패: ${summary.failedTests}회`);
    console.log(`📈 성공률: ${summary.successRate.toFixed(1)}%`);
    console.log(`⏱️ 평균 소요 시간: ${Math.round(summary.averageDuration / 1000)}초`);
    
    if (Object.keys(summary.methodBreakdown).length > 0) {
      console.log('\n🔧 방법별 결과:');
      Object.entries(summary.methodBreakdown).forEach(([method, stats]) => {
        const total = stats.success + stats.failed;
        const rate = total > 0 ? (stats.success / total * 100).toFixed(1) : '0.0';
        console.log(`   ${method}: ${stats.success}/${total} (${rate}%)`);
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 실행 함수
async function runEnhancedMCPTest(): Promise<void> {
  // 환경변수에서 설정 로드
  const config: TestConfig = {
    maxServersToTest: parseInt(process.env.MAX_SERVERS_TO_TEST || '5'),
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    supportedMethods: (process.env.SUPPORTED_METHODS || 'npx,python').split(',').map(m => m.trim()),
    delayBetweenTests: parseInt(process.env.DELAY_BETWEEN_TESTS || '3000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '2'),
    timeout: parseInt(process.env.TEST_TIMEOUT || '120000'),
    reportPath: path.join(__dirname, '..', 'reports', `enhanced-mcp-test-${Date.now()}.json`),
    environment: process.env.NODE_ENV || 'test'
  };
  
  // 리포트 디렉토리 생성
  const reportsDir = path.dirname(config.reportPath);
  await fs.mkdir(reportsDir, { recursive: true });
  
  const tester = new EnhancedMCPTester(config);
  const session = await tester.runFullTest();
  
  // 최종 결과 확인
  if (session.summary.successRate < 70) {
    console.log('⚠️ 성공률이 70% 미만입니다. 시스템 점검이 필요할 수 있습니다.');
    process.exit(1);
  } else {
    console.log('✅ 모든 테스트가 정상적으로 완료되었습니다.');
    process.exit(0);
  }
}

// CLI에서 직접 실행
if (require.main === module) {
  runEnhancedMCPTest().catch(error => {
    console.error('❌ 테스트 실행 중 오류:', error);
    process.exit(1);
  });
}

export { EnhancedMCPTester, runEnhancedMCPTest };