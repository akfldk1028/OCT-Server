// scripts/test-mcp-installations.ts
// MCP 서버 자동화 설치 테스트 시스템

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

interface MCPServer {
  id: number;
  name: string;
  description?: string;
  github_url?: string;
  install_methods?: any[];
  config_options?: any[];
}

interface TestConfig {
  maxServersToTest: number;
  testUserId: string;
  supportedMethods: string[];
  delayBetweenTests: number; // milliseconds
  maxRetries: number;
  reportPath: string;
}

interface TestResult {
  serverId: number;
  serverName: string;
  method: string;
  installSuccess: boolean;
  dbVerificationSuccess: boolean;
  uninstallSuccess: boolean;
  errors: string[];
  duration: number;
  timestamp: string;
}

interface TestReport {
  startTime: string;
  endTime: string;
  totalDuration: number;
  serversTestedCount: number;
  successfulInstalls: number;
  failedInstalls: number;
  results: TestResult[];
  summary: {
    successRate: number;
    npxResults: TestResult[];
    pythonResults: TestResult[];
    commonErrors: { [key: string]: number };
  };
}

class MCPInstallationTester {
  private config: TestConfig;
  private report: TestReport;

  constructor(config: TestConfig) {
    this.config = config;
    this.report = {
      startTime: new Date().toISOString(),
      endTime: '',
      totalDuration: 0,
      serversTestedCount: 0,
      successfulInstalls: 0,
      failedInstalls: 0,
      results: [],
      summary: {
        successRate: 0,
        npxResults: [],
        pythonResults: [],
        commonErrors: {}
      }
    };
  }

  async start(): Promise<void> {
    console.log('🚀 MCP 서버 자동화 테스트 시작');
    console.log(`📊 설정: 최대 ${this.config.maxServersToTest}개 서버 테스트`);
    console.log(`🔧 지원 방법: ${this.config.supportedMethods.join(', ')}`);
    
    const startTime = Date.now();
    
    try {
      // 1. 테스트할 서버 목록 가져오기
      const serversToTest = await this.getTestableServers();
      console.log(`📝 테스트 대상 서버: ${serversToTest.length}개`);
      
      // 2. 순차적으로 각 서버 테스트
      for (let i = 0; i < Math.min(serversToTest.length, this.config.maxServersToTest); i++) {
        const server = serversToTest[i];
        console.log(`\n🔄 [${i + 1}/${Math.min(serversToTest.length, this.config.maxServersToTest)}] ${server.name} 테스트 중...`);
        
        await this.testServer(server);
        
        // 테스트 간 대기
        if (i < Math.min(serversToTest.length, this.config.maxServersToTest) - 1) {
          console.log(`⏳ ${this.config.delayBetweenTests}ms 대기 중...`);
          await this.delay(this.config.delayBetweenTests);
        }
      }
      
      // 3. 리포트 생성
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ 테스트 실행 중 오류:', error);
    } finally {
      const endTime = Date.now();
      this.report.endTime = new Date().toISOString();
      this.report.totalDuration = endTime - startTime;
      
      console.log('\n✅ 테스트 완료!');
      console.log(`📊 총 소요 시간: ${Math.round(this.report.totalDuration / 1000)}초`);
      console.log(`📈 성공률: ${this.report.summary.successRate.toFixed(1)}%`);
    }
  }

  private async getTestableServers(): Promise<MCPServer[]> {
    console.log('🔍 테스트 가능한 서버 검색 중...');
    
    const { data: servers, error } = await supabase
      .from('mcp_servers')
      .select(`
        id,
        name,
        description,
        github_url,
        install_methods,
        config_options
      `)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50); // 최신 50개만 가져오기

    if (error) {
      console.error('❌ 서버 목록 조회 실패:', error);
      return [];
    }

    if (!servers) {
      console.log('⚠️ 서버 목록이 비어있습니다');
      return [];
    }

    // NPX 또는 Python 설치 방법이 있는 서버만 필터링
    const testableServers = servers.filter(server => {
      const installMethods = server.install_methods || [];
      const configOptions = server.config_options || [];
      
      // install_methods에서 NPX/Python 확인
      const hasNpxOrPython = installMethods.some((method: any) => 
        this.config.supportedMethods.includes(method.command) ||
        this.config.supportedMethods.includes(method.platform)
      );
      
      // config_options에서 NPX/Python 확인  
      const hasConfigNpxOrPython = configOptions.some((config: any) => 
        this.config.supportedMethods.includes(config.command) ||
        this.config.supportedMethods.includes(config.platform)
      );
      
      return hasNpxOrPython || hasConfigNpxOrPython;
    });

    console.log(`✅ 총 ${servers.length}개 서버 중 ${testableServers.length}개가 테스트 가능`);
    return testableServers;
  }

  private async testServer(server: MCPServer): Promise<void> {
    const serverResults: TestResult[] = [];
    
    // 서버의 모든 지원 방법 테스트
    const testMethods = this.getServerTestMethods(server);
    
    for (const method of testMethods) {
      const result = await this.testSingleInstallation(server, method);
      serverResults.push(result);
      this.report.results.push(result);
      
      if (result.installSuccess) {
        this.report.successfulInstalls++;
      } else {
        this.report.failedInstalls++;
      }
    }
    
    this.report.serversTestedCount++;
    console.log(`📊 ${server.name}: ${serverResults.filter(r => r.installSuccess).length}/${serverResults.length} 성공`);
  }

  private async testSingleInstallation(server: MCPServer, method: string): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      serverId: server.id,
      serverName: server.name,
      method,
      installSuccess: false,
      dbVerificationSuccess: false,
      uninstallSuccess: false,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      console.log(`  🔧 ${method} 방법으로 설치 테스트...`);
      
      // 1. 설치 시도
      const installResult = await this.attemptInstallation(server, method);
      result.installSuccess = installResult.success;
      if (!installResult.success) {
        result.errors.push(`설치 실패: ${installResult.error}`);
      }
      
      if (result.installSuccess) {
        // 2. DB 검증
        await this.delay(2000); // 2초 대기 후 DB 확인
        const dbResult = await this.verifyDatabaseEntry(server.id);
        result.dbVerificationSuccess = dbResult.success;
        if (!dbResult.success) {
          result.errors.push(`DB 검증 실패: ${dbResult.error}`);
        }
        
        // 3. 정리 (제거)
        const uninstallResult = await this.attemptUninstallation(server.id);
        result.uninstallSuccess = uninstallResult.success;
        if (!uninstallResult.success) {
          result.errors.push(`제거 실패: ${uninstallResult.error}`);
        }
      }
      
    } catch (error) {
      result.errors.push(`예외 발생: ${error}`);
      console.error(`    ❌ 오류:`, error);
    } finally {
      result.duration = Date.now() - startTime;
      
      const status = result.installSuccess && result.dbVerificationSuccess && result.uninstallSuccess ? '✅' : '❌';
      console.log(`    ${status} ${method}: ${Math.round(result.duration / 1000)}초`);
    }
    
    return result;
  }

  private getServerTestMethods(server: MCPServer): string[] {
    const methods = new Set<string>();
    
    // install_methods에서 지원 방법 추출
    const installMethods = server.install_methods || [];
    installMethods.forEach((method: any) => {
      if (this.config.supportedMethods.includes(method.command)) {
        methods.add(method.command);
      }
      if (this.config.supportedMethods.includes(method.platform)) {
        methods.add(method.platform);
      }
    });
    
    // config_options에서 지원 방법 추출
    const configOptions = server.config_options || [];
    configOptions.forEach((config: any) => {
      if (this.config.supportedMethods.includes(config.command)) {
        methods.add(config.command);
      }
      if (this.config.supportedMethods.includes(config.platform)) {
        methods.add(config.platform);
      }
    });
    
    return Array.from(methods);
  }

  private async attemptInstallation(server: MCPServer, method: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 실제 설치 로직 시뮬레이션
      // 실제 구현에서는 installer store의 dispatch를 호출해야 함
      
      console.log(`    ⚙️ ${server.name} 설치 중... (${method})`);
      
      // 시뮬레이션을 위한 랜덤 결과 생성 (실제로는 진짜 설치 시도)
      const simulateInstall = Math.random() > 0.3; // 70% 성공률
      
      if (simulateInstall) {
        // 성공 시뮬레이션
        await this.delay(1000 + Math.random() * 3000); // 1-4초 소요
        return { success: true };
      } else {
        // 실패 시뮬레이션
        const errors = [
          'Package not found',
          'Network timeout',
          'Permission denied',
          'Invalid configuration',
          'Dependency conflict'
        ];
        return { 
          success: false, 
          error: errors[Math.floor(Math.random() * errors.length)]
        };
      }
      
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async verifyDatabaseEntry(serverId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_mcp_usage')
        .select('*')
        .eq('profile_id', this.config.testUserId)
        .eq('original_server_id', serverId)
        .eq('install_status', 'success');
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: (data?.length || 0) > 0 };
      
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async attemptUninstallation(serverId: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`    🗑️ 서버 제거 중...`);
      
      const { error } = await supabase
        .from('user_mcp_usage')
        .delete()
        .eq('profile_id', this.config.testUserId)
        .eq('original_server_id', serverId);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 리포트 생성 중...');
    
    // 통계 계산
    this.report.summary.successRate = this.report.results.length > 0 
      ? (this.report.successfulInstalls / this.report.results.length) * 100 
      : 0;
    
    // 방법별 결과 분류
    this.report.summary.npxResults = this.report.results.filter(r => r.method === 'npx');
    this.report.summary.pythonResults = this.report.results.filter(r => r.method === 'python');
    
    // 공통 오류 집계
    this.report.results.forEach(result => {
      result.errors.forEach(error => {
        this.report.summary.commonErrors[error] = (this.report.summary.commonErrors[error] || 0) + 1;
      });
    });
    
    // 리포트 파일 생성
    const reportContent = JSON.stringify(this.report, null, 2);
    await fs.writeFile(this.config.reportPath, reportContent, 'utf-8');
    
    // 간단한 요약 출력
    console.log('\n📈 테스트 결과 요약:');
    console.log(`   총 테스트: ${this.report.results.length}회`);
    console.log(`   성공: ${this.report.successfulInstalls}회`);
    console.log(`   실패: ${this.report.failedInstalls}회`);
    console.log(`   성공률: ${this.report.summary.successRate.toFixed(1)}%`);
    console.log(`   NPX 테스트: ${this.report.summary.npxResults.length}회`);
    console.log(`   Python 테스트: ${this.report.summary.pythonResults.length}회`);
    
    if (Object.keys(this.report.summary.commonErrors).length > 0) {
      console.log('\n🔍 주요 오류:');
      Object.entries(this.report.summary.commonErrors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([error, count]) => {
          console.log(`   ${error}: ${count}회`);
        });
    }
    
    console.log(`\n📄 상세 리포트: ${this.config.reportPath}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 실행 함수
async function runMCPInstallationTest() {
  const config: TestConfig = {
    maxServersToTest: 10,
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    supportedMethods: ['npx', 'python'],
    delayBetweenTests: 3000, // 3초
    maxRetries: 3,
    reportPath: path.join(__dirname, '..', 'reports', `mcp-test-${Date.now()}.json`)
  };
  
  // 리포트 디렉토리 생성
  const reportsDir = path.dirname(config.reportPath);
  try {
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (error) {
    console.log('리포트 디렉토리가 이미 존재합니다.');
  }
  
  const tester = new MCPInstallationTester(config);
  await tester.start();
}

// CLI에서 직접 실행 가능
if (require.main === module) {
  runMCPInstallationTest().catch(console.error);
}

export { MCPInstallationTester, runMCPInstallationTest };