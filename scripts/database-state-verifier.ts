// scripts/database-state-verifier.ts
// 데이터베이스 저장 및 상태 확인 자동화 시스템

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface DatabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
  testUserId: string;
  retryAttempts: number;
  retryDelay: number;
  verificationTimeout: number;
}

interface DbVerificationTest {
  name: string;
  description: string;
  query: (client: SupabaseClient) => Promise<any>;
  expectedResult: (result: any) => boolean;
  critical: boolean;
}

interface DbVerificationResult {
  testName: string;
  success: boolean;
  duration: number;
  result?: any;
  error?: string;
  critical: boolean;
  retryCount: number;
}

interface InstallationRecord {
  id: number;
  profile_id: string;
  original_server_id: number;
  install_status: string;
  install_method_id?: number;
  config_id?: number;
  user_platform: string;
  user_client: string;
  install_path?: string;
  config_content?: any;
  user_env_variables?: any;
  install_error?: string;
  created_at: string;
  updated_at: string;
}

interface ServerInfo {
  id: number;
  name: string;
  description?: string;
  github_url?: string;
  is_active: boolean;
  install_methods?: any[];
  config_options?: any[];
}

interface DatabaseStateReport {
  timestamp: string;
  config: DatabaseConfig;
  connectionTest: {
    success: boolean;
    duration: number;
    error?: string;
  };
  schemaValidation: {
    tablesExist: boolean;
    requiredTables: string[];
    missingTables: string[];
    foreignKeysValid: boolean;
  };
  dataIntegrity: {
    orphanedRecords: number;
    duplicateRecords: number;
    invalidStatuses: number;
    missingReferences: number;
  };
  verificationTests: DbVerificationResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    criticalFailures: number;
    successRate: number;
  };
  recommendations: string[];
}

class DatabaseStateVerifier {
  private client: SupabaseClient;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.client = createClient(config.supabaseUrl, config.supabaseKey);
  }

  async runFullVerification(): Promise<DatabaseStateReport> {
    console.log('🔍 데이터베이스 상태 검증 시작');
    
    const report: DatabaseStateReport = {
      timestamp: new Date().toISOString(),
      config: { ...this.config, supabaseKey: '***' }, // 키 마스킹
      connectionTest: { success: false, duration: 0 },
      schemaValidation: {
        tablesExist: false,
        requiredTables: [],
        missingTables: [],
        foreignKeysValid: false
      },
      dataIntegrity: {
        orphanedRecords: 0,
        duplicateRecords: 0,
        invalidStatuses: 0,
        missingReferences: 0
      },
      verificationTests: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalFailures: 0,
        successRate: 0
      },
      recommendations: []
    };

    try {
      // 1. 연결 테스트
      console.log('🔌 데이터베이스 연결 테스트...');
      report.connectionTest = await this.testConnection();
      
      if (!report.connectionTest.success) {
        report.recommendations.push('데이터베이스 연결 실패 - 설정을 확인해주세요');
        return report;
      }
      
      // 2. 스키마 검증
      console.log('📋 스키마 검증...');
      report.schemaValidation = await this.validateSchema();
      
      // 3. 데이터 무결성 검사
      console.log('🔍 데이터 무결성 검사...');
      report.dataIntegrity = await this.checkDataIntegrity();
      
      // 4. 검증 테스트 실행
      console.log('🧪 검증 테스트 실행...');
      const tests = this.createVerificationTests();
      
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`  [${i + 1}/${tests.length}] ${test.name}...`);
        
        const result = await this.runVerificationTest(test);
        report.verificationTests.push(result);
        
        console.log(`    ${result.success ? '✅' : '❌'} ${Math.round(result.duration)}ms`);
        if (!result.success && result.error) {
          console.log(`    오류: ${result.error}`);
        }
      }
      
      // 5. 요약 및 추천사항 생성
      this.generateSummaryAndRecommendations(report);
      
    } catch (error) {
      console.error('❌ 검증 중 오류:', error);
      report.recommendations.push(`검증 중 예외 발생: ${error}`);
    }
    
    console.log('\n📊 데이터베이스 검증 완료');
    this.printReport(report);
    
    return report;
  }

  private async testConnection(): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await this.client
        .from('mcp_servers')
        .select('count')
        .limit(1);
      
      if (error) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        };
      }
      
      return {
        success: true,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: String(error)
      };
    }
  }

  private async validateSchema(): Promise<DatabaseStateReport['schemaValidation']> {
    const requiredTables = [
      'mcp_servers',
      'user_mcp_usage',
      'install_methods',
      'mcp_configs',
      'profiles'
    ];
    
    const validation = {
      tablesExist: false,
      requiredTables,
      missingTables: [] as string[],
      foreignKeysValid: false
    };
    
    try {
      // 테이블 존재 확인
      for (const table of requiredTables) {
        try {
          const { error } = await this.client
            .from(table)
            .select('*')
            .limit(1);
          
          if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
            validation.missingTables.push(table);
          }
        } catch (error) {
          validation.missingTables.push(table);
        }
      }
      
      validation.tablesExist = validation.missingTables.length === 0;
      
      // 외래키 제약 조건 확인 (user_mcp_usage 테이블 기준)
      if (validation.tablesExist) {
        validation.foreignKeysValid = await this.validateForeignKeys();
      }
      
    } catch (error) {
      console.error('스키마 검증 중 오류:', error);
    }
    
    return validation;
  }

  private async validateForeignKeys(): Promise<boolean> {
    try {
      // user_mcp_usage -> profiles 외래키 확인
      const { data: orphanedUsers } = await this.client
        .from('user_mcp_usage')
        .select('profile_id')
        .not('profile_id', 'in', 
          this.client.from('profiles').select('id')
        )
        .limit(1);
      
      // user_mcp_usage -> mcp_servers 외래키 확인
      const { data: orphanedServers } = await this.client
        .from('user_mcp_usage')
        .select('original_server_id')
        .not('original_server_id', 'in',
          this.client.from('mcp_servers').select('id')
        )
        .limit(1);
      
      return (orphanedUsers?.length || 0) === 0 && (orphanedServers?.length || 0) === 0;
      
    } catch (error) {
      console.error('외래키 검증 중 오류:', error);
      return false;
    }
  }

  private async checkDataIntegrity(): Promise<DatabaseStateReport['dataIntegrity']> {
    const integrity = {
      orphanedRecords: 0,
      duplicateRecords: 0,
      invalidStatuses: 0,
      missingReferences: 0
    };
    
    try {
      // 고아 레코드 확인 (프로필이 없는 사용 기록)
      const { data: orphaned } = await this.client
        .from('user_mcp_usage')
        .select('id, profile_id')
        .not('profile_id', 'in',
          this.client.from('profiles').select('id')
        );
      integrity.orphanedRecords = orphaned?.length || 0;
      
      // 중복 레코드 확인 (같은 사용자, 같은 서버의 성공 설치가 여러개)
      const { data: duplicates } = await this.client.rpc('find_duplicate_installations', {
        user_id: this.config.testUserId
      });
      integrity.duplicateRecords = duplicates?.length || 0;
      
      // 잘못된 상태 확인
      const { data: invalidStatuses } = await this.client
        .from('user_mcp_usage')
        .select('id, install_status')
        .not('install_status', 'in', ['attempted', 'success', 'failed']);
      integrity.invalidStatuses = invalidStatuses?.length || 0;
      
      // 참조 누락 확인 (존재하지 않는 서버 ID 참조)
      const { data: missingRefs } = await this.client
        .from('user_mcp_usage')
        .select('id, original_server_id')
        .not('original_server_id', 'in',
          this.client.from('mcp_servers').select('id')
        );
      integrity.missingReferences = missingRefs?.length || 0;
      
    } catch (error) {
      console.error('데이터 무결성 검사 중 오류:', error);
    }
    
    return integrity;
  }

  private createVerificationTests(): DbVerificationTest[] {
    return [
      {
        name: '사용자 설치 기록 조회',
        description: '테스트 사용자의 MCP 설치 기록을 조회할 수 있는지 확인',
        critical: true,
        query: async (client) => {
          return await client
            .from('user_mcp_usage')
            .select('*')
            .eq('profile_id', this.config.testUserId);
        },
        expectedResult: (result) => !result.error
      },
      
      {
        name: 'MCP 서버 목록 조회',
        description: '활성 MCP 서버 목록을 조회할 수 있는지 확인',
        critical: true,
        query: async (client) => {
          return await client
            .from('mcp_servers')
            .select('*')
            .eq('is_active', true)
            .limit(10);
        },
        expectedResult: (result) => !result.error && (result.data?.length || 0) > 0
      },
      
      {
        name: '설치 방법 정보 조회',
        description: '설치 방법 정보를 조회할 수 있는지 확인',
        critical: false,
        query: async (client) => {
          return await client
            .from('install_methods')
            .select('*')
            .limit(5);
        },
        expectedResult: (result) => !result.error
      },
      
      {
        name: '설정 옵션 조회',
        description: 'MCP 설정 옵션을 조회할 수 있는지 확인',
        critical: false,
        query: async (client) => {
          return await client
            .from('mcp_configs')
            .select('*')
            .limit(5);
        },
        expectedResult: (result) => !result.error
      },
      
      {
        name: '프로필 정보 조회',
        description: '사용자 프로필 정보를 조회할 수 있는지 확인',
        critical: true,
        query: async (client) => {
          return await client
            .from('profiles')
            .select('*')
            .eq('id', this.config.testUserId);
        },
        expectedResult: (result) => !result.error
      },
      
      {
        name: '조인 쿼리 테스트',
        description: '사용자 설치 기록과 서버 정보를 조인하여 조회',
        critical: true,
        query: async (client) => {
          return await client
            .from('user_mcp_usage')
            .select(`
              *,
              mcp_servers!user_mcp_usage_original_server_id_fkey (
                id,
                name,
                description
              )
            `)
            .eq('profile_id', this.config.testUserId)
            .limit(5);
        },
        expectedResult: (result) => !result.error
      },
      
      {
        name: '설치 상태별 집계',
        description: '설치 상태별로 레코드 수를 집계',
        critical: false,
        query: async (client) => {
          return await client
            .from('user_mcp_usage')
            .select('install_status, count(*)')
            .eq('profile_id', this.config.testUserId);
        },
        expectedResult: (result) => !result.error
      },
      
      {
        name: '최근 설치 기록 조회',
        description: '최근 30일 내 설치 기록 조회',
        critical: false,
        query: async (client) => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          return await client
            .from('user_mcp_usage')
            .select('*')
            .eq('profile_id', this.config.testUserId)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false });
        },
        expectedResult: (result) => !result.error
      }
    ];
  }

  private async runVerificationTest(test: DbVerificationTest): Promise<DbVerificationResult> {
    const startTime = Date.now();
    let retryCount = 0;
    
    while (retryCount <= this.config.retryAttempts) {
      try {
        const result = await test.query(this.client);
        const success = test.expectedResult(result);
        
        return {
          testName: test.name,
          success,
          duration: Date.now() - startTime,
          result: success ? result.data : result,
          error: success ? undefined : result.error?.message || '예상 결과와 다름',
          critical: test.critical,
          retryCount
        };
        
      } catch (error) {
        retryCount++;
        
        if (retryCount <= this.config.retryAttempts) {
          console.log(`    ⏳ 재시도 ${retryCount}/${this.config.retryAttempts}...`);
          await this.delay(this.config.retryDelay);
          continue;
        }
        
        return {
          testName: test.name,
          success: false,
          duration: Date.now() - startTime,
          error: String(error),
          critical: test.critical,
          retryCount: retryCount - 1
        };
      }
    }
    
    // 이 코드는 실행되지 않아야 함
    throw new Error('Unexpected control flow');
  }

  private generateSummaryAndRecommendations(report: DatabaseStateReport): void {
    const { verificationTests, schemaValidation, dataIntegrity } = report;
    
    report.summary.totalTests = verificationTests.length;
    report.summary.passedTests = verificationTests.filter(t => t.success).length;
    report.summary.failedTests = verificationTests.filter(t => !t.success).length;
    report.summary.criticalFailures = verificationTests.filter(t => !t.success && t.critical).length;
    report.summary.successRate = report.summary.totalTests > 0 
      ? (report.summary.passedTests / report.summary.totalTests) * 100 
      : 0;
    
    // 추천사항 생성
    if (!schemaValidation.tablesExist) {
      report.recommendations.push('필수 테이블이 누락되었습니다. 데이터베이스 마이그레이션을 실행하세요.');
      if (schemaValidation.missingTables.length > 0) {
        report.recommendations.push(`누락된 테이블: ${schemaValidation.missingTables.join(', ')}`);
      }
    }
    
    if (!schemaValidation.foreignKeysValid) {
      report.recommendations.push('외래키 제약 조건에 문제가 있습니다. 데이터 정합성을 확인하세요.');
    }
    
    if (dataIntegrity.orphanedRecords > 0) {
      report.recommendations.push(`${dataIntegrity.orphanedRecords}개의 고아 레코드가 발견되었습니다. 데이터 정리가 필요합니다.`);
    }
    
    if (dataIntegrity.duplicateRecords > 0) {
      report.recommendations.push(`${dataIntegrity.duplicateRecords}개의 중복 레코드가 발견되었습니다. 중복 제거가 필요합니다.`);
    }
    
    if (dataIntegrity.invalidStatuses > 0) {
      report.recommendations.push(`${dataIntegrity.invalidStatuses}개의 잘못된 상태 값이 발견되었습니다. 상태 값을 수정하세요.`);
    }
    
    if (report.summary.criticalFailures > 0) {
      report.recommendations.push('중요한 검증 테스트에서 실패가 발생했습니다. 즉시 점검이 필요합니다.');
    }
    
    if (report.summary.successRate < 80) {
      report.recommendations.push('검증 성공률이 80% 미만입니다. 데이터베이스 상태를 전반적으로 점검하세요.');
    }
  }

  private printReport(report: DatabaseStateReport): void {
    console.log('\n📊 데이터베이스 검증 리포트');
    console.log('===========================');
    
    console.log('\n🔌 연결 테스트:');
    console.log(`   상태: ${report.connectionTest.success ? '✅ 성공' : '❌ 실패'}`);
    console.log(`   소요 시간: ${report.connectionTest.duration}ms`);
    if (report.connectionTest.error) {
      console.log(`   오류: ${report.connectionTest.error}`);
    }
    
    console.log('\n📋 스키마 검증:');
    console.log(`   테이블 존재: ${report.schemaValidation.tablesExist ? '✅' : '❌'}`);
    console.log(`   외래키 유효: ${report.schemaValidation.foreignKeysValid ? '✅' : '❌'}`);
    if (report.schemaValidation.missingTables.length > 0) {
      console.log(`   누락된 테이블: ${report.schemaValidation.missingTables.join(', ')}`);
    }
    
    console.log('\n🔍 데이터 무결성:');
    console.log(`   고아 레코드: ${report.dataIntegrity.orphanedRecords}개`);
    console.log(`   중복 레코드: ${report.dataIntegrity.duplicateRecords}개`);
    console.log(`   잘못된 상태: ${report.dataIntegrity.invalidStatuses}개`);
    console.log(`   참조 누락: ${report.dataIntegrity.missingReferences}개`);
    
    console.log('\n🧪 검증 테스트:');
    console.log(`   전체: ${report.summary.passedTests}/${report.summary.totalTests} (${report.summary.successRate.toFixed(1)}%)`);
    console.log(`   중요 실패: ${report.summary.criticalFailures}개`);
    
    // 실패한 테스트 표시
    const failedTests = report.verificationTests.filter(t => !t.success);
    if (failedTests.length > 0) {
      console.log('\n❌ 실패한 테스트:');
      failedTests.forEach(test => {
        const critical = test.critical ? ' [중요]' : '';
        console.log(`   ${test.testName}${critical}: ${test.error}`);
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

  async exportReport(report: DatabaseStateReport, filePath: string): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 리포트 저장: ${filePath}`);
  }

  // 특정 설치 기록 검증
  async verifyInstallationRecord(serverId: number, expectedStatus: string = 'success'): Promise<{
    found: boolean;
    status: string | null;
    record?: InstallationRecord;
    error?: string;
  }> {
    try {
      const { data, error } = await this.client
        .from('user_mcp_usage')
        .select('*')
        .eq('profile_id', this.config.testUserId)
        .eq('original_server_id', serverId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        return { found: false, status: null, error: error.message };
      }
      
      if (!data) {
        return { found: false, status: null };
      }
      
      return {
        found: true,
        status: data.install_status,
        record: data as InstallationRecord
      };
      
    } catch (error) {
      return { found: false, status: null, error: String(error) };
    }
  }

  // 설치 기록 정리
  async cleanupInstallationRecords(serverId: number): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const { data, error } = await this.client
        .from('user_mcp_usage')
        .delete()
        .eq('profile_id', this.config.testUserId)
        .eq('original_server_id', serverId)
        .select();
      
      if (error) {
        return { success: false, deletedCount: 0, error: error.message };
      }
      
      return { success: true, deletedCount: data?.length || 0 };
      
    } catch (error) {
      return { success: false, deletedCount: 0, error: String(error) };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 실행 함수
async function runDatabaseStateVerification(): Promise<void> {
  const config: DatabaseConfig = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
    testUserId: process.env.TEST_USER_ID || 'test-user-id',
    retryAttempts: 3,
    retryDelay: 1000,
    verificationTimeout: 30000
  };
  
  const verifier = new DatabaseStateVerifier(config);
  const report = await verifier.runFullVerification();
  
  // 리포트 저장
  const reportPath = path.join(__dirname, '..', 'reports', `db-verification-${Date.now()}.json`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await verifier.exportReport(report, reportPath);
  
  // 검증 결과 확인
  const hasConnection = report.connectionTest.success;
  const hasValidSchema = report.schemaValidation.tablesExist;
  const hasGoodIntegrity = report.dataIntegrity.orphanedRecords === 0 && 
                           report.dataIntegrity.invalidStatuses === 0;
  const hasHighSuccessRate = report.summary.successRate >= 80;
  const hasNoCriticalFailures = report.summary.criticalFailures === 0;
  
  console.log('\n🎯 최종 평가:');
  
  if (!hasConnection) {
    console.log('❌ 데이터베이스 연결 실패');
    process.exit(1);
  } else if (!hasValidSchema) {
    console.log('❌ 스키마 검증 실패');
    process.exit(1);
  } else if (!hasGoodIntegrity) {
    console.log('⚠️ 데이터 무결성 문제 발견');
    process.exit(1);
  } else if (hasNoCriticalFailures && hasHighSuccessRate) {
    console.log('✅ 데이터베이스 검증 성공');
    process.exit(0);
  } else {
    console.log('⚠️ 일부 검증에서 문제 발견');
    process.exit(1);
  }
}

if (require.main === module) {
  runDatabaseStateVerification().catch(error => {
    console.error('❌ 데이터베이스 검증 실행 중 오류:', error);
    process.exit(1);
  });
}

export { DatabaseStateVerifier, runDatabaseStateVerification };