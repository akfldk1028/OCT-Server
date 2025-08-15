// scripts/bundling-environment-tester.ts
// NPX 및 Python 번들링 환경 전용 테스터

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface BundlingTestConfig {
  testTimeout: number;
  tempDir: string;
  npxPath?: string;
  pythonPath?: string;
  pipPath?: string;
  testPackages: {
    npx: string[];
    python: string[];
  };
}

interface EnvironmentTest {
  name: string;
  type: 'npx' | 'python';
  command: string;
  args: string[];
  expectedOutput?: string[];
  shouldSucceed: boolean;
  timeout: number;
}

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  exitCode?: number;
}

interface BundlingTestReport {
  environment: {
    platform: string;
    nodeVersion: string;
    electronVersion?: string;
    npxAvailable: boolean;
    pythonAvailable: boolean;
    pipAvailable: boolean;
  };
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    npxTests: { passed: number; failed: number };
    pythonTests: { passed: number; failed: number };
  };
  recommendations: string[];
}

class BundlingEnvironmentTester {
  private config: BundlingTestConfig;
  private tempDir: string;

  constructor(config: BundlingTestConfig) {
    this.config = config;
    this.tempDir = config.tempDir;
  }

  async runFullBundlingTest(): Promise<BundlingTestReport> {
    console.log('🧪 번들링 환경 테스트 시작');
    
    // 1. 환경 정보 수집
    const environment = await this.collectEnvironmentInfo();
    console.log('🔍 환경 정보:', environment);
    
    // 2. 테스트 준비
    await this.prepareTesting();
    
    // 3. 테스트 실행
    const tests = this.createTestSuite();
    const testResults: TestResult[] = [];
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      console.log(`\n[${i + 1}/${tests.length}] 🧪 ${test.name} 테스트 중...`);
      
      const result = await this.runSingleTest(test);
      testResults.push(result);
      
      console.log(`  ${result.success ? '✅' : '❌'} ${Math.round(result.duration / 1000)}초`);
      if (!result.success && result.error) {
        console.log(`    오류: ${result.error}`);
      }
    }
    
    // 4. 결과 분석
    const report = this.analyzeResults(environment, testResults);
    
    // 5. 정리
    await this.cleanup();
    
    console.log('\n📊 번들링 환경 테스트 완료');
    this.printReport(report);
    
    return report;
  }

  private async collectEnvironmentInfo(): Promise<BundlingTestReport['environment']> {
    const info = {
      platform: os.platform(),
      nodeVersion: process.version,
      electronVersion: process.env.ELECTRON_VERSION || 'unknown',
      npxAvailable: false,
      pythonAvailable: false,
      pipAvailable: false
    };

    // NPX 확인
    try {
      const npxResult = await this.runCommand('npx', ['--version'], 5000);
      info.npxAvailable = npxResult.success;
      console.log(`📦 NPX: ${info.npxAvailable ? '✅ 사용 가능' : '❌ 사용 불가'}`);
    } catch (error) {
      console.log('📦 NPX: ❌ 사용 불가');
    }

    // Python 확인
    try {
      const pythonResult = await this.runCommand('python', ['--version'], 5000);
      info.pythonAvailable = pythonResult.success;
      console.log(`🐍 Python: ${info.pythonAvailable ? '✅ 사용 가능' : '❌ 사용 불가'}`);
    } catch (error) {
      console.log('🐍 Python: ❌ 사용 불가');
    }

    // Pip 확인
    try {
      const pipResult = await this.runCommand('pip', ['--version'], 5000);
      info.pipAvailable = pipResult.success;
      console.log(`📦 Pip: ${info.pipAvailable ? '✅ 사용 가능' : '❌ 사용 불가'}`);
    } catch (error) {
      console.log('📦 Pip: ❌ 사용 불가');
    }

    return info;
  }

  private async prepareTesting(): Promise<void> {
    // 임시 디렉토리 생성
    await fs.mkdir(this.tempDir, { recursive: true });
    console.log(`📁 테스트 디렉토리 생성: ${this.tempDir}`);
  }

  private createTestSuite(): EnvironmentTest[] {
    const tests: EnvironmentTest[] = [
      // NPX 기본 테스트
      {
        name: 'NPX 버전 확인',
        type: 'npx',
        command: 'npx',
        args: ['--version'],
        shouldSucceed: true,
        timeout: 10000
      },
      {
        name: 'NPX 도움말',
        type: 'npx',
        command: 'npx',
        args: ['--help'],
        shouldSucceed: true,
        timeout: 10000
      },
      
      // NPX 패키지 설치 테스트
      {
        name: 'NPX 경량 패키지 실행',
        type: 'npx',
        command: 'npx',
        args: ['cowsay', 'Hello MCP'],
        shouldSucceed: true,
        timeout: 30000
      },
      {
        name: 'NPX create-react-app 정보',
        type: 'npx',
        command: 'npx',
        args: ['create-react-app', '--version'],
        shouldSucceed: true,
        timeout: 60000
      },
      
      // Python 기본 테스트
      {
        name: 'Python 버전 확인',
        type: 'python',
        command: 'python',
        args: ['--version'],
        shouldSucceed: true,
        timeout: 10000
      },
      {
        name: 'Python 간단 스크립트',
        type: 'python',
        command: 'python',
        args: ['-c', 'print("Hello MCP from Python")'],
        expectedOutput: ['Hello MCP from Python'],
        shouldSucceed: true,
        timeout: 10000
      },
      
      // Pip 테스트
      {
        name: 'Pip 버전 확인',
        type: 'python',
        command: 'pip',
        args: ['--version'],
        shouldSucceed: true,
        timeout: 10000
      },
      {
        name: 'Pip 패키지 목록',
        type: 'python',
        command: 'pip',
        args: ['list'],
        shouldSucceed: true,
        timeout: 15000
      },
      
      // 실제 MCP 관련 패키지 테스트 (가벼운 것들)
      {
        name: 'NPX MCP 패키지 정보 확인',
        type: 'npx',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', '--help'],
        shouldSucceed: true,
        timeout: 45000
      },
      
      // Python 패키지 설치 테스트 (가상환경에서)
      {
        name: 'Python 가상환경 생성',
        type: 'python',
        command: 'python',
        args: ['-m', 'venv', path.join(this.tempDir, 'test-venv')],
        shouldSucceed: true,
        timeout: 30000
      }
    ];

    return tests;
  }

  private async runSingleTest(test: EnvironmentTest): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.runCommand(test.command, test.args, test.timeout);
      
      // 예상 출력 확인
      let outputMatches = true;
      if (test.expectedOutput) {
        outputMatches = test.expectedOutput.some(expected => 
          result.output.toLowerCase().includes(expected.toLowerCase())
        );
      }
      
      const success = test.shouldSucceed ? (result.success && outputMatches) : !result.success;
      
      return {
        testName: test.name,
        success,
        duration: Date.now() - startTime,
        output: result.output,
        error: result.success ? undefined : result.error,
        exitCode: result.exitCode
      };
      
    } catch (error) {
      return {
        testName: test.name,
        success: false,
        duration: Date.now() - startTime,
        output: '',
        error: String(error)
      };
    }
  }

  private async runCommand(
    command: string, 
    args: string[], 
    timeout: number
  ): Promise<{ success: boolean; output: string; error?: string; exitCode?: number }> {
    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';
      
      console.log(`    🔧 실행: ${command} ${args.join(' ')}`);
      
      const childProcess: ChildProcess = spawn(command, args, {
        cwd: this.tempDir,
        shell: true,
        env: { ...process.env }
      });

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });
      }

      childProcess.on('close', (code: number | null) => {
        const allOutput = output + errorOutput;
        resolve({
          success: code === 0,
          output: allOutput,
          error: code !== 0 ? errorOutput || `Exit code: ${code}` : undefined,
          exitCode: code || undefined
        });
      });

      childProcess.on('error', (error: Error) => {
        resolve({
          success: false,
          output: output,
          error: error.message
        });
      });

      // 타임아웃 처리
      const timeoutId = setTimeout(() => {
        childProcess.kill('SIGTERM');
        resolve({
          success: false,
          output: output,
          error: `Timeout after ${timeout}ms`
        });
      }, timeout);

      childProcess.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  private analyzeResults(
    environment: BundlingTestReport['environment'], 
    testResults: TestResult[]
  ): BundlingTestReport {
    const total = testResults.length;
    const passed = testResults.filter(r => r.success).length;
    const failed = total - passed;
    
    const npxTests = testResults.filter(r => r.testName.toLowerCase().includes('npx'));
    const pythonTests = testResults.filter(r => 
      r.testName.toLowerCase().includes('python') || r.testName.toLowerCase().includes('pip')
    );
    
    const recommendations: string[] = [];
    
    // 추천사항 생성
    if (!environment.npxAvailable) {
      recommendations.push('NPX가 설치되어 있지 않습니다. Node.js 최신 버전 설치를 권장합니다.');
    }
    
    if (!environment.pythonAvailable) {
      recommendations.push('Python이 설치되어 있지 않습니다. Python 3.8 이상 설치를 권장합니다.');
    }
    
    if (!environment.pipAvailable && environment.pythonAvailable) {
      recommendations.push('Pip이 사용할 수 없습니다. Python 재설치 또는 pip 별도 설치를 권장합니다.');
    }
    
    const successRate = (passed / total) * 100;
    if (successRate < 70) {
      recommendations.push('전체 성공률이 70% 미만입니다. 번들링 환경 설정을 점검해주세요.');
    }
    
    const npxSuccessRate = npxTests.length > 0 ? (npxTests.filter(t => t.success).length / npxTests.length) * 100 : 0;
    if (npxSuccessRate < 80) {
      recommendations.push('NPX 테스트 성공률이 낮습니다. Node.js 환경을 확인해주세요.');
    }
    
    const pythonSuccessRate = pythonTests.length > 0 ? (pythonTests.filter(t => t.success).length / pythonTests.length) * 100 : 0;
    if (pythonSuccessRate < 80) {
      recommendations.push('Python 테스트 성공률이 낮습니다. Python 환경을 확인해주세요.');
    }

    return {
      environment,
      tests: testResults,
      summary: {
        total,
        passed,
        failed,
        npxTests: {
          passed: npxTests.filter(t => t.success).length,
          failed: npxTests.filter(t => !t.success).length
        },
        pythonTests: {
          passed: pythonTests.filter(t => t.success).length,
          failed: pythonTests.filter(t => !t.success).length
        }
      },
      recommendations
    };
  }

  private printReport(report: BundlingTestReport): void {
    console.log('\n📊 번들링 환경 테스트 리포트');
    console.log('=====================================');
    
    console.log('\n🖥️ 환경 정보:');
    console.log(`   플랫폼: ${report.environment.platform}`);
    console.log(`   Node.js: ${report.environment.nodeVersion}`);
    console.log(`   Electron: ${report.environment.electronVersion}`);
    console.log(`   NPX: ${report.environment.npxAvailable ? '✅' : '❌'}`);
    console.log(`   Python: ${report.environment.pythonAvailable ? '✅' : '❌'}`);
    console.log(`   Pip: ${report.environment.pipAvailable ? '✅' : '❌'}`);
    
    console.log('\n📈 테스트 결과:');
    console.log(`   전체: ${report.summary.passed}/${report.summary.total} (${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%)`);
    console.log(`   NPX: ${report.summary.npxTests.passed}/${report.summary.npxTests.passed + report.summary.npxTests.failed}`);
    console.log(`   Python: ${report.summary.pythonTests.passed}/${report.summary.pythonTests.passed + report.summary.pythonTests.failed}`);
    
    // 실패한 테스트 표시
    const failedTests = report.tests.filter(t => !t.success);
    if (failedTests.length > 0) {
      console.log('\n❌ 실패한 테스트:');
      failedTests.forEach(test => {
        console.log(`   ${test.testName}: ${test.error}`);
      });
    }
    
    // 추천사항
    if (report.recommendations.length > 0) {
      console.log('\n💡 추천사항:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
  }

  async exportReport(report: BundlingTestReport, filePath: string): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 리포트 저장: ${filePath}`);
  }

  private async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      console.log(`🧹 임시 디렉토리 정리: ${this.tempDir}`);
    } catch (error) {
      console.log(`⚠️ 정리 중 오류: ${error}`);
    }
  }
}

// 실행 함수
async function runBundlingEnvironmentTest(): Promise<void> {
  const config: BundlingTestConfig = {
    testTimeout: 120000,
    tempDir: path.join(os.tmpdir(), `mcp-bundling-test-${Date.now()}`),
    testPackages: {
      npx: ['cowsay', '@modelcontextprotocol/server-filesystem'],
      python: ['requests', 'click']
    }
  };
  
  const tester = new BundlingEnvironmentTester(config);
  const report = await tester.runFullBundlingTest();
  
  // 리포트 저장
  const reportPath = path.join(__dirname, '..', 'reports', `bundling-test-${Date.now()}.json`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await tester.exportReport(report, reportPath);
  
  // 성공률 확인
  const successRate = (report.summary.passed / report.summary.total) * 100;
  const npxSuccessRate = report.summary.npxTests.passed + report.summary.npxTests.failed > 0 
    ? (report.summary.npxTests.passed / (report.summary.npxTests.passed + report.summary.npxTests.failed)) * 100 
    : 0;
  const pythonSuccessRate = report.summary.pythonTests.passed + report.summary.pythonTests.failed > 0
    ? (report.summary.pythonTests.passed / (report.summary.pythonTests.passed + report.summary.pythonTests.failed)) * 100
    : 0;
  
  console.log('\n🎯 최종 평가:');
  
  if (successRate < 70) {
    console.log('❌ 번들링 환경 테스트 실패 (성공률 70% 미만)');
    process.exit(1);
  } else if (npxSuccessRate < 80 || pythonSuccessRate < 80) {
    console.log('⚠️ 일부 환경에서 문제 발견 (NPX 또는 Python 성공률 80% 미만)');
    process.exit(1);
  } else {
    console.log('✅ 번들링 환경 테스트 성공');
    process.exit(0);
  }
}

if (require.main === module) {
  runBundlingEnvironmentTest().catch(error => {
    console.error('❌ 번들링 환경 테스트 실행 중 오류:', error);
    process.exit(1);
  });
}

export { BundlingEnvironmentTester, runBundlingEnvironmentTest };