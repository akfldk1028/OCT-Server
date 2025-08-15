// scripts/comprehensive-report-generator.ts
// 종합적인 설치 결과 리포트 생성 시스템

import fs from 'fs/promises';
import path from 'path';
import { EnhancedMCPTester } from './enhanced-mcp-tester';
import { SequentialInstaller } from './sequential-installer';
import { BundlingEnvironmentTester } from './bundling-environment-tester';
import { DatabaseStateVerifier } from './database-state-verifier';

interface UnifiedTestConfig {
  testUserId: string;
  maxServersToTest: number;
  supportedMethods: string[];
  outputDirectory: string;
  includeHTML: boolean;
  includePDF: boolean;
  generateCharts: boolean;
  compressResults: boolean;
}

interface TestModuleResult {
  moduleName: string;
  success: boolean;
  duration: number;
  report: any;
  error?: string;
}

interface QualityMetrics {
  overallSuccessRate: number;
  environmentCompatibility: number;
  databaseIntegrity: number;
  installationReliability: number;
  performanceScore: number;
  readinessLevel: 'READY' | 'CAUTION' | 'NOT_READY';
}

interface ExecutiveSummary {
  testDate: string;
  totalTestsRun: number;
  overallResult: 'PASS' | 'FAIL' | 'WARNING';
  criticalIssues: string[];
  recommendations: string[];
  readinessAssessment: string;
  nextSteps: string[];
}

interface ComprehensiveReport {
  metadata: {
    generatedAt: string;
    testVersion: string;
    environment: string;
    configuration: UnifiedTestConfig;
  };
  executiveSummary: ExecutiveSummary;
  qualityMetrics: QualityMetrics;
  moduleResults: TestModuleResult[];
  detailedFindings: {
    environmentCompatibility: any;
    sequentialInstallation: any;
    bundlingEnvironment: any;
    databaseIntegrity: any;
  };
  riskAssessment: {
    highRisk: string[];
    mediumRisk: string[];
    lowRisk: string[];
  };
  performanceAnalysis: {
    averageInstallTime: number;
    fastestInstall: number;
    slowestInstall: number;
    failurePatterns: string[];
  };
  complianceChecklist: {
    item: string;
    status: 'PASS' | 'FAIL' | 'N/A';
    notes?: string;
  }[];
}

class ComprehensiveReportGenerator {
  private config: UnifiedTestConfig;
  private testResults: TestModuleResult[] = [];

  constructor(config: UnifiedTestConfig) {
    this.config = config;
  }

  async generateFullReport(): Promise<ComprehensiveReport> {
    console.log('📊 종합적인 MCP 서버 테스트 리포트 생성 시작');
    console.log(`📁 출력 디렉토리: ${this.config.outputDirectory}`);
    
    // 출력 디렉토리 생성
    await fs.mkdir(this.config.outputDirectory, { recursive: true });

    const startTime = Date.now();

    try {
      // 1. 환경 호환성 테스트
      console.log('\n🧪 1/4 환경 호환성 테스트 실행 중...');
      await this.runBundlingEnvironmentTest();

      // 2. 데이터베이스 무결성 검증
      console.log('\n🔍 2/4 데이터베이스 무결성 검증 중...');
      await this.runDatabaseVerification();

      // 3. 순차적 설치 테스트
      console.log('\n🔄 3/4 순차적 설치 테스트 실행 중...');
      await this.runSequentialInstallationTest();

      // 4. 강화된 MCP 테스트
      console.log('\n🚀 4/4 강화된 MCP 테스트 실행 중...');
      await this.runEnhancedMCPTest();

      // 5. 종합 리포트 생성
      console.log('\n📋 종합 리포트 분석 및 생성 중...');
      const report = await this.compileComprehensiveReport();

      // 6. 다양한 형식으로 출력
      await this.exportReports(report);

      const totalDuration = Date.now() - startTime;
      console.log(`\n✅ 종합 테스트 완료! (총 소요 시간: ${Math.round(totalDuration / 1000)}초)`);

      return report;

    } catch (error) {
      console.error('❌ 종합 테스트 실행 중 오류:', error);
      throw error;
    }
  }

  private async runBundlingEnvironmentTest(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const tester = new BundlingEnvironmentTester({
        testTimeout: 120000,
        tempDir: path.join(this.config.outputDirectory, 'temp-bundling'),
        testPackages: {
          npx: ['cowsay'],
          python: ['requests']
        }
      });

      const report = await tester.runFullBundlingTest();
      
      this.testResults.push({
        moduleName: 'Bundling Environment',
        success: (report.summary.passed / report.summary.total) >= 0.8,
        duration: Date.now() - startTime,
        report
      });

    } catch (error) {
      this.testResults.push({
        moduleName: 'Bundling Environment',
        success: false,
        duration: Date.now() - startTime,
        report: null,
        error: String(error)
      });
    }
  }

  private async runDatabaseVerification(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const verifier = new DatabaseStateVerifier({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseKey: process.env.SUPABASE_ANON_KEY || '',
        testUserId: this.config.testUserId,
        retryAttempts: 3,
        retryDelay: 1000,
        verificationTimeout: 30000
      });

      const report = await verifier.runFullVerification();
      
      this.testResults.push({
        moduleName: 'Database Verification',
        success: report.summary.successRate >= 80 && report.summary.criticalFailures === 0,
        duration: Date.now() - startTime,
        report
      });

    } catch (error) {
      this.testResults.push({
        moduleName: 'Database Verification',
        success: false,
        duration: Date.now() - startTime,
        report: null,
        error: String(error)
      });
    }
  }

  private async runSequentialInstallationTest(): Promise<void> {
    const startTime = Date.now();
    
    try {
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
          supportedMethods: this.config.supportedMethods,
          retryCount: 2
        }
      );

      // 테스트용 서버 목록 (실제로는 DB에서 가져와야 함)
      const testServers = [
        { id: 1, name: 'test-server-1', install_methods: [{ command: 'npx' }] },
        { id: 2, name: 'test-server-2', install_methods: [{ command: 'python' }] }
      ];

      const results = await installer.runSequentialTest(testServers);
      
      this.testResults.push({
        moduleName: 'Sequential Installation',
        success: results.filter(r => r.success).length / results.length >= 0.7,
        duration: Date.now() - startTime,
        report: { results }
      });

    } catch (error) {
      this.testResults.push({
        moduleName: 'Sequential Installation',
        success: false,
        duration: Date.now() - startTime,
        report: null,
        error: String(error)
      });
    }
  }

  private async runEnhancedMCPTest(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const tester = new EnhancedMCPTester({
        maxServersToTest: this.config.maxServersToTest,
        testUserId: this.config.testUserId,
        supportedMethods: this.config.supportedMethods,
        delayBetweenTests: 3000,
        maxRetries: 2,
        timeout: 120000,
        reportPath: path.join(this.config.outputDirectory, 'enhanced-mcp-test.json'),
        environment: 'test'
      });

      const session = await tester.runFullTest();
      
      this.testResults.push({
        moduleName: 'Enhanced MCP Test',
        success: session.summary.successRate >= 70,
        duration: Date.now() - startTime,
        report: session
      });

    } catch (error) {
      this.testResults.push({
        moduleName: 'Enhanced MCP Test',
        success: false,
        duration: Date.now() - startTime,
        report: null,
        error: String(error)
      });
    }
  }

  private async compileComprehensiveReport(): Promise<ComprehensiveReport> {
    const qualityMetrics = this.calculateQualityMetrics();
    const executiveSummary = this.generateExecutiveSummary(qualityMetrics);
    
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        testVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'test',
        configuration: this.config
      },
      executiveSummary,
      qualityMetrics,
      moduleResults: this.testResults,
      detailedFindings: this.extractDetailedFindings(),
      riskAssessment: this.performRiskAssessment(),
      performanceAnalysis: this.analyzePerformance(),
      complianceChecklist: this.generateComplianceChecklist()
    };
  }

  private calculateQualityMetrics(): QualityMetrics {
    const successfulModules = this.testResults.filter(r => r.success).length;
    const totalModules = this.testResults.length;
    const overallSuccessRate = totalModules > 0 ? (successfulModules / totalModules) * 100 : 0;

    // 각 모듈별 점수 계산
    const bundlingResult = this.testResults.find(r => r.moduleName === 'Bundling Environment');
    const environmentCompatibility = bundlingResult?.success ? 100 : 
      bundlingResult?.report ? (bundlingResult.report.summary.passed / bundlingResult.report.summary.total) * 100 : 0;

    const dbResult = this.testResults.find(r => r.moduleName === 'Database Verification');
    const databaseIntegrity = dbResult?.success ? 100 : 
      dbResult?.report ? dbResult.report.summary.successRate : 0;

    const seqResult = this.testResults.find(r => r.moduleName === 'Sequential Installation');
    const installationReliability = seqResult?.success ? 100 : 
      seqResult?.report ? (seqResult.report.results.filter((r: any) => r.success).length / seqResult.report.results.length) * 100 : 0;

    const enhancedResult = this.testResults.find(r => r.moduleName === 'Enhanced MCP Test');
    const performanceScore = enhancedResult?.success ? 100 : 
      enhancedResult?.report ? enhancedResult.report.summary.successRate : 0;

    // 준비도 평가
    let readinessLevel: QualityMetrics['readinessLevel'] = 'NOT_READY';
    if (overallSuccessRate >= 85 && databaseIntegrity >= 90 && installationReliability >= 80) {
      readinessLevel = 'READY';
    } else if (overallSuccessRate >= 70 && databaseIntegrity >= 70) {
      readinessLevel = 'CAUTION';
    }

    return {
      overallSuccessRate,
      environmentCompatibility,
      databaseIntegrity,
      installationReliability,
      performanceScore,
      readinessLevel
    };
  }

  private generateExecutiveSummary(metrics: QualityMetrics): ExecutiveSummary {
    const totalTests = this.testResults.reduce((sum, result) => {
      if (result.report?.summary?.total) return sum + result.report.summary.total;
      if (result.report?.results) return sum + result.report.results.length;
      return sum + 1; // 기본값
    }, 0);

    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    // 중요 이슈 및 추천사항 수집
    if (metrics.databaseIntegrity < 80) {
      criticalIssues.push('데이터베이스 무결성 문제 발견');
      recommendations.push('데이터베이스 스키마 및 데이터 정합성 점검 필요');
    }
    
    if (metrics.environmentCompatibility < 70) {
      criticalIssues.push('환경 호환성 문제 발견');
      recommendations.push('NPX 및 Python 환경 설정 점검 필요');
    }
    
    if (metrics.installationReliability < 60) {
      criticalIssues.push('설치 안정성 부족');
      recommendations.push('설치 로직 및 에러 처리 개선 필요');
    }

    // 전체 결과 판정
    let overallResult: ExecutiveSummary['overallResult'] = 'FAIL';
    if (metrics.readinessLevel === 'READY') {
      overallResult = 'PASS';
    } else if (metrics.readinessLevel === 'CAUTION') {
      overallResult = 'WARNING';
    }

    // 준비도 평가
    let readinessAssessment = '';
    switch (metrics.readinessLevel) {
      case 'READY':
        readinessAssessment = '운영 환경 배포 가능. 모든 주요 테스트를 통과했습니다.';
        break;
      case 'CAUTION':
        readinessAssessment = '주의 필요. 일부 개선 후 배포 가능합니다.';
        break;
      case 'NOT_READY':
        readinessAssessment = '배포 불가. 중요한 문제들을 해결해야 합니다.';
        break;
    }

    // 다음 단계 제안
    const nextSteps: string[] = [];
    if (criticalIssues.length > 0) {
      nextSteps.push('중요 이슈 해결');
    }
    if (metrics.overallSuccessRate < 80) {
      nextSteps.push('테스트 성공률 개선');
    }
    nextSteps.push('성능 최적화 검토');
    nextSteps.push('사용자 승인 테스트 실시');

    return {
      testDate: new Date().toISOString().split('T')[0],
      totalTestsRun: totalTests,
      overallResult,
      criticalIssues,
      recommendations,
      readinessAssessment,
      nextSteps
    };
  }

  private extractDetailedFindings(): ComprehensiveReport['detailedFindings'] {
    return {
      environmentCompatibility: this.testResults.find(r => r.moduleName === 'Bundling Environment')?.report || null,
      sequentialInstallation: this.testResults.find(r => r.moduleName === 'Sequential Installation')?.report || null,
      bundlingEnvironment: this.testResults.find(r => r.moduleName === 'Bundling Environment')?.report || null,
      databaseIntegrity: this.testResults.find(r => r.moduleName === 'Database Verification')?.report || null
    };
  }

  private performRiskAssessment(): ComprehensiveReport['riskAssessment'] {
    const highRisk: string[] = [];
    const mediumRisk: string[] = [];
    const lowRisk: string[] = [];

    this.testResults.forEach(result => {
      if (!result.success) {
        if (result.moduleName === 'Database Verification') {
          highRisk.push('데이터베이스 무결성 실패 - 데이터 손실 위험');
        } else if (result.moduleName === 'Sequential Installation') {
          highRisk.push('설치 프로세스 불안정 - 사용자 경험 저하');
        } else {
          mediumRisk.push(`${result.moduleName} 모듈 실패`);
        }
      } else {
        lowRisk.push(`${result.moduleName} 정상 동작`);
      }
    });

    return { highRisk, mediumRisk, lowRisk };
  }

  private analyzePerformance(): ComprehensiveReport['performanceAnalysis'] {
    const installTimes: number[] = [];
    const failurePatterns: string[] = [];

    this.testResults.forEach(result => {
      if (result.report?.results) {
        result.report.results.forEach((testResult: any) => {
          if (testResult.installDuration) {
            installTimes.push(testResult.installDuration);
          }
          if (!testResult.success && testResult.errors) {
            failurePatterns.push(...testResult.errors);
          }
        });
      }
    });

    return {
      averageInstallTime: installTimes.length > 0 ? installTimes.reduce((a, b) => a + b) / installTimes.length : 0,
      fastestInstall: installTimes.length > 0 ? Math.min(...installTimes) : 0,
      slowestInstall: installTimes.length > 0 ? Math.max(...installTimes) : 0,
      failurePatterns: [...new Set(failurePatterns)].slice(0, 10)
    };
  }

  private generateComplianceChecklist(): ComprehensiveReport['complianceChecklist'] {
    return [
      {
        item: '환경 호환성 확인',
        status: this.testResults.find(r => r.moduleName === 'Bundling Environment')?.success ? 'PASS' : 'FAIL',
        notes: 'NPX 및 Python 환경 테스트'
      },
      {
        item: '데이터베이스 무결성',
        status: this.testResults.find(r => r.moduleName === 'Database Verification')?.success ? 'PASS' : 'FAIL',
        notes: '스키마 및 외래키 검증'
      },
      {
        item: '순차적 설치 안정성',
        status: this.testResults.find(r => r.moduleName === 'Sequential Installation')?.success ? 'PASS' : 'FAIL',
        notes: '설치-검증-제거 사이클 테스트'
      },
      {
        item: '성능 기준 충족',
        status: this.testResults.find(r => r.moduleName === 'Enhanced MCP Test')?.success ? 'PASS' : 'FAIL',
        notes: '설치 시간 및 성공률 기준'
      },
      {
        item: '에러 처리 적절성',
        status: this.testResults.every(r => r.success || r.error) ? 'PASS' : 'FAIL',
        notes: '예외 상황 처리 검증'
      }
    ];
  }

  private async exportReports(report: ComprehensiveReport): Promise<void> {
    // JSON 리포트
    const jsonPath = path.join(this.config.outputDirectory, 'comprehensive-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 JSON 리포트 저장: ${jsonPath}`);

    if (this.config.includeHTML) {
      const htmlPath = path.join(this.config.outputDirectory, 'comprehensive-report.html');
      await this.generateHTMLReport(report, htmlPath);
      console.log(`🌐 HTML 리포트 저장: ${htmlPath}`);
    }

    // 요약 리포트 (텍스트)
    const summaryPath = path.join(this.config.outputDirectory, 'executive-summary.txt');
    await this.generateTextSummary(report, summaryPath);
    console.log(`📋 요약 리포트 저장: ${summaryPath}`);
  }

  private async generateHTMLReport(report: ComprehensiveReport, filePath: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP 서버 종합 테스트 리포트</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f5f7fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .status-ready { color: #22c55e; }
        .status-caution { color: #f59e0b; }
        .status-fail { color: #ef4444; }
        .section { background: white; margin: 20px 0; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .module-result { padding: 15px; border-left: 4px solid #e5e7eb; margin: 10px 0; }
        .module-success { border-left-color: #22c55e; background: #f0fdf4; }
        .module-failure { border-left-color: #ef4444; background: #fef2f2; }
        .compliance-table { width: 100%; border-collapse: collapse; }
        .compliance-table th, .compliance-table td { padding: 12px; border: 1px solid #e5e7eb; text-align: left; }
        .compliance-table th { background: #f9fafb; }
        .pass { color: #22c55e; font-weight: bold; }
        .fail { color: #ef4444; font-weight: bold; }
        .readiness-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-left: 10px; }
        .ready { background: #dcfce7; color: #16a34a; }
        .caution { background: #fef3c7; color: #d97706; }
        .not-ready { background: #fee2e2; color: #dc2626; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 MCP 서버 종합 테스트 리포트</h1>
            <p>생성일: ${report.metadata.generatedAt}</p>
            <p>전체 결과: <span class="readiness-badge ${report.qualityMetrics.readinessLevel.toLowerCase().replace('_', '-')}">${report.qualityMetrics.readinessLevel}</span></p>
        </div>

        <div class="section">
            <h2>📊 품질 지표</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value ${report.qualityMetrics.overallSuccessRate >= 80 ? 'status-ready' : report.qualityMetrics.overallSuccessRate >= 60 ? 'status-caution' : 'status-fail'}">
                        ${report.qualityMetrics.overallSuccessRate.toFixed(1)}%
                    </div>
                    <div class="metric-label">전체 성공률</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value ${report.qualityMetrics.environmentCompatibility >= 80 ? 'status-ready' : 'status-caution'}">
                        ${report.qualityMetrics.environmentCompatibility.toFixed(1)}%
                    </div>
                    <div class="metric-label">환경 호환성</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value ${report.qualityMetrics.databaseIntegrity >= 90 ? 'status-ready' : 'status-caution'}">
                        ${report.qualityMetrics.databaseIntegrity.toFixed(1)}%
                    </div>
                    <div class="metric-label">DB 무결성</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value ${report.qualityMetrics.installationReliability >= 80 ? 'status-ready' : 'status-caution'}">
                        ${report.qualityMetrics.installationReliability.toFixed(1)}%
                    </div>
                    <div class="metric-label">설치 안정성</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🎯 경영진 요약</h2>
            <p><strong>테스트 일자:</strong> ${report.executiveSummary.testDate}</p>
            <p><strong>총 테스트 수:</strong> ${report.executiveSummary.totalTestsRun}개</p>
            <p><strong>준비도 평가:</strong> ${report.executiveSummary.readinessAssessment}</p>
            
            ${report.executiveSummary.criticalIssues.length > 0 ? `
                <h3>⚠️ 중요 이슈</h3>
                <ul>
                    ${report.executiveSummary.criticalIssues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
            ` : ''}
            
            <h3>💡 권장사항</h3>
            <ul>
                ${report.executiveSummary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="section">
            <h2>🧪 모듈별 테스트 결과</h2>
            ${report.moduleResults.map(result => `
                <div class="module-result ${result.success ? 'module-success' : 'module-failure'}">
                    <h3>${result.moduleName} ${result.success ? '✅' : '❌'}</h3>
                    <p>소요 시간: ${Math.round(result.duration / 1000)}초</p>
                    ${result.error ? `<p>오류: ${result.error}</p>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>✅ 준수 체크리스트</h2>
            <table class="compliance-table">
                <thead>
                    <tr>
                        <th>항목</th>
                        <th>상태</th>
                        <th>비고</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.complianceChecklist.map(item => `
                        <tr>
                            <td>${item.item}</td>
                            <td class="${item.status.toLowerCase()}">${item.status}</td>
                            <td>${item.notes || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>⚡ 성능 분석</h2>
            <p><strong>평균 설치 시간:</strong> ${Math.round(report.performanceAnalysis.averageInstallTime / 1000)}초</p>
            <p><strong>최고 속도:</strong> ${Math.round(report.performanceAnalysis.fastestInstall / 1000)}초</p>
            <p><strong>최저 속도:</strong> ${Math.round(report.performanceAnalysis.slowestInstall / 1000)}초</p>
            
            ${report.performanceAnalysis.failurePatterns.length > 0 ? `
                <h3>주요 실패 패턴</h3>
                <ul>
                    ${report.performanceAnalysis.failurePatterns.slice(0, 5).map(pattern => `<li>${pattern}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(filePath, html, 'utf-8');
  }

  private async generateTextSummary(report: ComprehensiveReport, filePath: string): Promise<void> {
    const summary = `
MCP 서버 테스트 - 경영진 요약 리포트
=====================================

생성일: ${report.metadata.generatedAt}
테스트 환경: ${report.metadata.environment}

🎯 종합 결과
-----------
전체 성공률: ${report.qualityMetrics.overallSuccessRate.toFixed(1)}%
준비도 상태: ${report.qualityMetrics.readinessLevel}
총 테스트 수: ${report.executiveSummary.totalTestsRun}개

📊 품질 지표
-----------
환경 호환성: ${report.qualityMetrics.environmentCompatibility.toFixed(1)}%
데이터베이스 무결성: ${report.qualityMetrics.databaseIntegrity.toFixed(1)}%
설치 안정성: ${report.qualityMetrics.installationReliability.toFixed(1)}%
성능 점수: ${report.qualityMetrics.performanceScore.toFixed(1)}%

⚠️ 중요 이슈
-----------
${report.executiveSummary.criticalIssues.length > 0 ? 
  report.executiveSummary.criticalIssues.map(issue => `• ${issue}`).join('\n') : 
  '중요 이슈 없음'}

💡 권장사항
-----------
${report.executiveSummary.recommendations.map(rec => `• ${rec}`).join('\n')}

🚀 다음 단계
-----------
${report.executiveSummary.nextSteps.map(step => `• ${step}`).join('\n')}

📈 준비도 평가
-----------
${report.executiveSummary.readinessAssessment}

⚡ 성능 요약
-----------
평균 설치 시간: ${Math.round(report.performanceAnalysis.averageInstallTime / 1000)}초
최고 성능: ${Math.round(report.performanceAnalysis.fastestInstall / 1000)}초
최저 성능: ${Math.round(report.performanceAnalysis.slowestInstall / 1000)}초

---
생성 시스템: MCP Server Test Automation v1.0.0
`;

    await fs.writeFile(filePath, summary, 'utf-8');
  }
}

// 실행 함수
async function runComprehensiveTest(): Promise<void> {
  const config: UnifiedTestConfig = {
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    maxServersToTest: parseInt(process.env.MAX_SERVERS_TO_TEST || '5'),
    supportedMethods: ['npx', 'python'],
    outputDirectory: path.join(__dirname, '..', 'reports', `comprehensive-${Date.now()}`),
    includeHTML: true,
    includePDF: false,
    generateCharts: false,
    compressResults: false
  };

  const generator = new ComprehensiveReportGenerator(config);
  const report = await generator.generateFullReport();

  console.log('\n🎯 최종 평가:');
  console.log(`전체 성공률: ${report.qualityMetrics.overallSuccessRate.toFixed(1)}%`);
  console.log(`준비도: ${report.qualityMetrics.readinessLevel}`);

  if (report.qualityMetrics.readinessLevel === 'READY') {
    console.log('✅ 운영 환경 배포 준비 완료');
    process.exit(0);
  } else if (report.qualityMetrics.readinessLevel === 'CAUTION') {
    console.log('⚠️ 주의사항 확인 후 배포 가능');
    process.exit(1);
  } else {
    console.log('❌ 배포 불가 - 중요 이슈 해결 필요');
    process.exit(1);
  }
}

if (require.main === module) {
  runComprehensiveTest().catch(error => {
    console.error('❌ 종합 테스트 실행 중 오류:', error);
    process.exit(1);
  });
}

export { ComprehensiveReportGenerator, runComprehensiveTest };