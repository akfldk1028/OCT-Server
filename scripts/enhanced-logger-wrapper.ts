// scripts/enhanced-logger-wrapper.ts
// 기존 테스트들에 상세 로깅 기능 추가

import { DetailedLogger } from './logging-system';
import { EnhancedMCPTester } from './enhanced-mcp-tester';
import { SequentialInstaller } from './sequential-installer';
import { BundlingEnvironmentTester } from './bundling-environment-tester';
import { DatabaseStateVerifier } from './database-state-verifier';
import path from 'path';

interface LoggedTestConfig {
  testType: 'quick' | 'enhanced' | 'full' | 'bundling' | 'database' | 'sequential' | 'comprehensive';
  maxServersToTest?: number;
  testUserId: string;
  enableDetailedLogging: boolean;
  logDirectory?: string;
}

class LoggedTestRunner {
  private logger: DetailedLogger;
  private config: LoggedTestConfig;

  constructor(config: LoggedTestConfig) {
    this.config = config;
    this.logger = new DetailedLogger(
      config.testType,
      config.testUserId,
      config.logDirectory || path.join(__dirname, '..', 'logs')
    );
  }

  async runEnhancedMCPTest(): Promise<any> {
    await this.logger.initialize();
    
    try {
      this.logger.step(1, 4, 'Enhanced MCP 테스트 시작');
      
      const tester = new EnhancedMCPTester({
        maxServersToTest: this.config.maxServersToTest || 10,
        testUserId: this.config.testUserId,
        supportedMethods: ['npx', 'python'],
        delayBetweenTests: 3000,
        maxRetries: 2,
        timeout: 120000,
        reportPath: path.join(__dirname, '..', 'reports', `enhanced-mcp-test-${Date.now()}.json`),
        environment: 'test'
      });

      this.logger.step(2, 4, '테스트 설정 완료', { config: this.config });

      const startTime = Date.now();
      const session = await tester.runFullTest();
      const duration = Date.now() - startTime;

      this.logger.step(3, 4, '테스트 실행 완료');
      this.logger.performance('Enhanced MCP Test', startTime, Date.now(), {
        serversTestedCount: session.serversTestedCount,
        successfulTests: session.summary.successfulTests,
        failedTests: session.summary.failedTests,
        successRate: session.summary.successRate
      });

      this.logger.testResult(
        'Enhanced MCP Test',
        session.summary.successRate >= 70,
        duration,
        {
          totalTests: session.summary.totalTests,
          successRate: session.summary.successRate,
          methodBreakdown: session.summary.methodBreakdown
        }
      );

      this.logger.step(4, 4, 'Enhanced MCP 테스트 완료');
      
      return session;

    } catch (error) {
      this.logger.detailedError('EnhancedMCPTest', 'runFullTest', error as Error, {
        config: this.config
      });
      throw error;
    } finally {
      const logFile = await this.logger.finalize();
      console.log(`📋 상세 로그 저장: ${logFile}`);
    }
  }

  async runBundlingEnvironmentTest(): Promise<any> {
    await this.logger.initialize();
    
    try {
      this.logger.step(1, 3, '환경 호환성 테스트 시작');
      
      const tester = new BundlingEnvironmentTester({
        testTimeout: 120000,
        tempDir: path.join(__dirname, '..', 'temp', `bundling-${Date.now()}`),
        testPackages: {
          npx: ['cowsay'],
          python: ['requests']
        }
      });

      this.logger.step(2, 3, '환경 호환성 테스트 실행 중');

      const startTime = Date.now();
      const report = await tester.runFullBundlingTest();
      const duration = Date.now() - startTime;

      this.logger.performance('Bundling Environment Test', startTime, Date.now(), {
        totalTests: report.summary.total,
        passedTests: report.summary.passed,
        failedTests: report.summary.failed,
        npxTests: report.summary.npxTests,
        pythonTests: report.summary.pythonTests
      });

      this.logger.testResult(
        'Bundling Environment Test',
        (report.summary.passed / report.summary.total) >= 0.8,
        duration,
        {
          environment: report.environment,
          recommendations: report.recommendations
        }
      );

      this.logger.step(3, 3, '환경 호환성 테스트 완료');
      
      return report;

    } catch (error) {
      this.logger.detailedError('BundlingEnvironmentTest', 'runFullBundlingTest', error as Error);
      throw error;
    } finally {
      const logFile = await this.logger.finalize();
      console.log(`📋 상세 로그 저장: ${logFile}`);
    }
  }

  async runDatabaseVerification(): Promise<any> {
    await this.logger.initialize();
    
    try {
      this.logger.step(1, 4, '데이터베이스 검증 시작');
      
      const verifier = new DatabaseStateVerifier({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseKey: process.env.SUPABASE_ANON_KEY || '',
        testUserId: this.config.testUserId,
        retryAttempts: 3,
        retryDelay: 1000,
        verificationTimeout: 30000
      });

      this.logger.step(2, 4, 'DB 연결 및 스키마 검증');

      const startTime = Date.now();
      const report = await verifier.runFullVerification();
      const duration = Date.now() - startTime;

      this.logger.step(3, 4, 'DB 검증 결과 분석');
      
      // 상세 결과 로깅
      this.logger.info('Database', 'Connection Test', report.connectionTest);
      this.logger.info('Database', 'Schema Validation', report.schemaValidation);
      this.logger.info('Database', 'Data Integrity', report.dataIntegrity);

      // 실패한 검증 테스트들 로깅
      const failedTests = report.verificationTests.filter(t => !t.success);
      failedTests.forEach(test => {
        this.logger.error('Database', `검증 실패: ${test.testName}`, {
          critical: test.critical,
          error: test.error,
          retryCount: test.retryCount
        });
      });

      this.logger.performance('Database Verification', startTime, Date.now(), {
        totalTests: report.summary.totalTests,
        passedTests: report.summary.passedTests,
        failedTests: report.summary.failedTests,
        criticalFailures: report.summary.criticalFailures,
        successRate: report.summary.successRate
      });

      this.logger.testResult(
        'Database Verification',
        report.summary.successRate >= 80 && report.summary.criticalFailures === 0,
        duration,
        {
          recommendations: report.recommendations,
          dataIntegrity: report.dataIntegrity
        }
      );

      this.logger.step(4, 4, '데이터베이스 검증 완료');
      
      return report;

    } catch (error) {
      this.logger.detailedError('DatabaseVerification', 'runFullVerification', error as Error);
      throw error;
    } finally {
      const logFile = await this.logger.finalize();
      console.log(`📋 상세 로그 저장: ${logFile}`);
    }
  }

  async runSequentialInstallationTest(): Promise<any> {
    await this.logger.initialize();
    
    try {
      this.logger.step(1, 3, '순차적 설치 테스트 시작');
      
      const installer = new SequentialInstaller(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_ANON_KEY || '',
        {
          testUserId: this.config.testUserId,
          maxConcurrentTests: 1,
          delayBetweenTests: 3000,
          installTimeout: 60000,
          verifyTimeout: 10000,
          cleanupTimeout: 30000,
          supportedMethods: ['npx', 'python'],
          retryCount: 2
        }
      );

      // 진행상황 콜백 설정
      installer.setProgressCallback((progress) => {
        this.logger.debug('SequentialInstaller', `진행상황: [${progress.current}/${progress.total}] ${progress.serverName} (${progress.method})`);
      });

      this.logger.step(2, 3, '순차적 설치 테스트 실행');

      // 테스트용 서버 목록 (실제로는 DB에서 가져와야 함)
      const testServers = [
        { id: 1, name: 'test-server-1', install_methods: [{ command: 'npx' }] },
        { id: 2, name: 'test-server-2', install_methods: [{ command: 'python' }] }
      ];

      const startTime = Date.now();
      const results = await installer.runSequentialTest(testServers);
      const duration = Date.now() - startTime;

      // 각 서버별 결과 상세 로깅
      results.forEach(result => {
        this.logger.installStep(result.serverName, result.method, result.success ? 'success' : 'fail', {
          phases: result.phases,
          totalDuration: result.totalDuration,
          logs: result.logs
        });
      });

      const successCount = results.filter(r => r.success).length;
      const successRate = (successCount / results.length) * 100;

      this.logger.performance('Sequential Installation Test', startTime, Date.now(), {
        totalServers: results.length,
        successfulInstalls: successCount,
        failedInstalls: results.length - successCount,
        successRate
      });

      this.logger.testResult(
        'Sequential Installation Test',
        successRate >= 70,
        duration,
        {
          results: results.map(r => ({
            serverName: r.serverName,
            method: r.method,
            success: r.success,
            totalDuration: r.totalDuration
          }))
        }
      );

      this.logger.step(3, 3, '순차적 설치 테스트 완료');
      
      return { results, successRate };

    } catch (error) {
      this.logger.detailedError('SequentialInstaller', 'runSequentialTest', error as Error);
      throw error;
    } finally {
      const logFile = await this.logger.finalize();
      console.log(`📋 상세 로그 저장: ${logFile}`);
    }
  }

  getLogInfo(): { sessionId: string; logFile: string; startTime: string } {
    return this.logger.getSessionInfo();
  }
}

// 실행 함수들 (기존 함수들을 로깅 버전으로 래핑)
async function runLoggedEnhancedMCPTest(): Promise<void> {
  const config: LoggedTestConfig = {
    testType: 'enhanced',
    maxServersToTest: parseInt(process.env.MAX_SERVERS_TO_TEST || '10'),
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    enableDetailedLogging: true
  };

  const runner = new LoggedTestRunner(config);
  
  try {
    const session = await runner.runEnhancedMCPTest();
    
    if (session.summary.successRate < 70) {
      console.log('⚠️ 테스트 성공률이 70% 미만입니다.');
      process.exit(1);
    } else {
      console.log('✅ Enhanced MCP 테스트가 성공적으로 완료되었습니다.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Enhanced MCP 테스트 실행 중 오류:', error);
    process.exit(1);
  }
}

async function runLoggedBundlingTest(): Promise<void> {
  const config: LoggedTestConfig = {
    testType: 'bundling',
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    enableDetailedLogging: true
  };

  const runner = new LoggedTestRunner(config);
  
  try {
    const report = await runner.runBundlingEnvironmentTest();
    const successRate = (report.summary.passed / report.summary.total) * 100;
    
    if (successRate < 80) {
      console.log('⚠️ 환경 호환성 테스트 성공률이 80% 미만입니다.');
      process.exit(1);
    } else {
      console.log('✅ 환경 호환성 테스트가 성공적으로 완료되었습니다.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ 환경 호환성 테스트 실행 중 오류:', error);
    process.exit(1);
  }
}

async function runLoggedDatabaseTest(): Promise<void> {
  const config: LoggedTestConfig = {
    testType: 'database',
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    enableDetailedLogging: true
  };

  const runner = new LoggedTestRunner(config);
  
  try {
    const report = await runner.runDatabaseVerification();
    
    if (report.summary.successRate < 80 || report.summary.criticalFailures > 0) {
      console.log('⚠️ 데이터베이스 검증에서 문제가 발견되었습니다.');
      process.exit(1);
    } else {
      console.log('✅ 데이터베이스 검증이 성공적으로 완료되었습니다.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ 데이터베이스 검증 실행 중 오류:', error);
    process.exit(1);
  }
}

async function runLoggedSequentialTest(): Promise<void> {
  const config: LoggedTestConfig = {
    testType: 'sequential',
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    enableDetailedLogging: true
  };

  const runner = new LoggedTestRunner(config);
  
  try {
    const result = await runner.runSequentialInstallationTest();
    
    if (result.successRate < 70) {
      console.log('⚠️ 순차적 설치 테스트 성공률이 70% 미만입니다.');
      process.exit(1);
    } else {
      console.log('✅ 순차적 설치 테스트가 성공적으로 완료되었습니다.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ 순차적 설치 테스트 실행 중 오류:', error);
    process.exit(1);
  }
}

// CLI에서 직접 실행 가능
if (require.main === module) {
  const testType = process.argv[2] || 'enhanced';
  
  switch (testType) {
    case 'enhanced':
      runLoggedEnhancedMCPTest();
      break;
    case 'bundling':
      runLoggedBundlingTest();
      break;
    case 'database':
      runLoggedDatabaseTest();
      break;
    case 'sequential':
      runLoggedSequentialTest();
      break;
    default:
      console.log('사용법: ts-node enhanced-logger-wrapper.ts [enhanced|bundling|database|sequential]');
      process.exit(1);
  }
}

export { LoggedTestRunner, runLoggedEnhancedMCPTest, runLoggedBundlingTest, runLoggedDatabaseTest, runLoggedSequentialTest };