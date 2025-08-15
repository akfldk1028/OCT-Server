// scripts/logging-system.ts
// 상세한 로그 파일 저장 시스템

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  module: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

interface LogSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  testType: string;
  userId: string;
  environment: {
    platform: string;
    nodeVersion: string;
    npmVersion: string;
  };
  logs: LogEntry[];
}

class DetailedLogger {
  private session: LogSession;
  private logDir: string;
  private currentLogFile: string;
  private consoleOutput: string[] = [];

  constructor(testType: string, userId: string, logDir?: string) {
    this.logDir = logDir || path.join(__dirname, '..', 'logs');
    this.session = {
      sessionId: `mcp-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date().toISOString(),
      testType,
      userId,
      environment: {
        platform: `${os.platform()} ${os.release()}`,
        nodeVersion: process.version,
        npmVersion: process.env.npm_version || 'unknown'
      },
      logs: []
    };
    
    this.currentLogFile = path.join(this.logDir, `${this.session.sessionId}.json`);
    
    // 콘솔 출력 캡처
    this.interceptConsole();
  }

  async initialize(): Promise<void> {
    // 로그 디렉토리 생성
    await fs.mkdir(this.logDir, { recursive: true });
    
    // 세션 시작 로그
    this.log('INFO', 'Logger', `테스트 세션 시작: ${this.session.testType}`, {
      sessionId: this.session.sessionId,
      userId: this.session.userId,
      environment: this.session.environment
    });
  }

  log(level: LogEntry['level'], module: string, message: string, data?: any, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      stackTrace: error?.stack
    };

    this.session.logs.push(entry);
    
    // 실시간 파일 저장
    this.saveToFile();
    
    // 콘솔에도 출력 (원래 형태 유지)
    const prefix = `[${level}][${module}]`;
    const fullMessage = `${prefix} ${message}`;
    
    switch (level) {
      case 'ERROR':
        console.error(fullMessage, data || '');
        if (error) console.error(error.stack);
        break;
      case 'WARN':
        console.warn(fullMessage, data || '');
        break;
      case 'DEBUG':
        if (process.env.DEBUG_MODE === 'true') {
          console.debug(fullMessage, data || '');
        }
        break;
      default:
        console.log(fullMessage, data || '');
    }
  }

  info(module: string, message: string, data?: any): void {
    this.log('INFO', module, message, data);
  }

  warn(module: string, message: string, data?: any): void {
    this.log('WARN', module, message, data);
  }

  error(module: string, message: string, data?: any, error?: Error): void {
    this.log('ERROR', module, message, data, error);
  }

  debug(module: string, message: string, data?: any): void {
    this.log('DEBUG', module, message, data);
  }

  // 단계별 진행 상황 로깅
  step(stepNumber: number, totalSteps: number, stepName: string, data?: any): void {
    this.info('Progress', `[${stepNumber}/${totalSteps}] ${stepName}`, data);
  }

  // 테스트 결과 로깅
  testResult(testName: string, success: boolean, duration: number, details?: any): void {
    const level = success ? 'INFO' : 'ERROR';
    const status = success ? '✅ PASS' : '❌ FAIL';
    
    this.log(level, 'TestResult', `${status} ${testName} (${Math.round(duration/1000)}초)`, {
      success,
      duration,
      details
    });
  }

  // 성능 메트릭 로깅
  performance(operation: string, startTime: number, endTime?: number, metadata?: any): void {
    const duration = (endTime || Date.now()) - startTime;
    this.info('Performance', `${operation} 완료`, {
      operation,
      duration,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime || Date.now()).toISOString(),
      ...metadata
    });
  }

  // 에러 상황 상세 로깅
  detailedError(module: string, operation: string, error: Error, context?: any): void {
    this.error(module, `${operation} 중 오류 발생`, {
      operation,
      errorName: error.name,
      errorMessage: error.message,
      context,
      timestamp: new Date().toISOString()
    }, error);
  }

  // 설치 단계별 로깅
  installStep(serverName: string, step: string, status: 'start' | 'progress' | 'success' | 'fail', details?: any): void {
    const level = status === 'fail' ? 'ERROR' : status === 'success' ? 'INFO' : 'DEBUG';
    const emoji = status === 'fail' ? '❌' : status === 'success' ? '✅' : '🔄';
    
    this.log(level, 'Installation', `${emoji} ${serverName}: ${step}`, {
      serverName,
      step,
      status,
      details
    });
  }

  // 데이터베이스 쿼리 로깅
  dbQuery(query: string, result: any, duration: number, error?: Error): void {
    if (error) {
      this.error('Database', `쿼리 실패: ${query}`, { duration, result }, error);
    } else {
      this.debug('Database', `쿼리 성공: ${query}`, { duration, recordCount: result?.data?.length });
    }
  }

  // 네트워크 요청 로깅
  networkRequest(method: string, url: string, status: number, duration: number, error?: Error): void {
    const level = error || status >= 400 ? 'ERROR' : 'DEBUG';
    this.log(level, 'Network', `${method} ${url} → ${status}`, {
      method,
      url,
      status,
      duration
    }, error);
  }

  private interceptConsole(): void {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      this.consoleOutput.push(`[LOG] ${args.join(' ')}`);
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.consoleOutput.push(`[ERROR] ${args.join(' ')}`);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.consoleOutput.push(`[WARN] ${args.join(' ')}`);
      originalWarn.apply(console, args);
    };
  }

  private async saveToFile(): Promise<void> {
    try {
      const sessionData = {
        ...this.session,
        endTime: new Date().toISOString(),
        totalLogs: this.session.logs.length,
        consoleOutput: this.consoleOutput
      };

      await fs.writeFile(this.currentLogFile, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      // 로그 저장 실패는 콘솔에만 출력 (무한 루프 방지)
      console.error('로그 파일 저장 실패:', error);
    }
  }

  async finalize(): Promise<string> {
    this.session.endTime = new Date().toISOString();
    
    this.info('Logger', '테스트 세션 종료', {
      sessionId: this.session.sessionId,
      duration: Date.now() - new Date(this.session.startTime).getTime(),
      totalLogs: this.session.logs.length
    });

    // 최종 로그 파일 저장
    await this.saveToFile();

    // 요약 로그 파일 생성
    await this.generateSummaryLog();

    return this.currentLogFile;
  }

  private async generateSummaryLog(): Promise<void> {
    const errors = this.session.logs.filter(log => log.level === 'ERROR');
    const warnings = this.session.logs.filter(log => log.level === 'WARN');
    const testResults = this.session.logs.filter(log => log.module === 'TestResult');

    const summary = `
MCP 테스트 세션 요약 리포트
========================

세션 ID: ${this.session.sessionId}
테스트 유형: ${this.session.testType}
사용자 ID: ${this.session.userId}
시작 시간: ${this.session.startTime}
종료 시간: ${this.session.endTime}
소요 시간: ${this.getSessionDuration()}

환경 정보:
- 플랫폼: ${this.session.environment.platform}
- Node.js: ${this.session.environment.nodeVersion}
- NPM: ${this.session.environment.npmVersion}

로그 통계:
- 총 로그 수: ${this.session.logs.length}
- 오류: ${errors.length}개
- 경고: ${warnings.length}개
- 테스트 결과: ${testResults.length}개

${errors.length > 0 ? `
주요 오류:
${errors.slice(0, 10).map(err => `- [${err.timestamp}] ${err.message}`).join('\n')}
` : ''}

${warnings.length > 0 ? `
주요 경고:
${warnings.slice(0, 5).map(warn => `- [${warn.timestamp}] ${warn.message}`).join('\n')}
` : ''}

테스트 결과:
${testResults.map(test => {
  const success = test.data?.success;
  const emoji = success ? '✅' : '❌';
  return `${emoji} ${test.message}`;
}).join('\n')}

상세 로그: ${this.currentLogFile}
`;

    const summaryFile = path.join(this.logDir, `${this.session.sessionId}-summary.txt`);
    await fs.writeFile(summaryFile, summary);
  }

  private getSessionDuration(): string {
    if (!this.session.endTime) return '진행중';
    
    const start = new Date(this.session.startTime);
    const end = new Date(this.session.endTime);
    const duration = end.getTime() - start.getTime();
    
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    return `${minutes}분 ${seconds}초`;
  }

  // 로그 파일 목록 조회
  static async getLogFiles(logDir?: string): Promise<string[]> {
    const dir = logDir || path.join(__dirname, '..', 'logs');
    
    try {
      const files = await fs.readdir(dir);
      return files
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a)); // 최신순
    } catch (error) {
      return [];
    }
  }

  // 로그 파일 읽기
  static async readLogFile(filePath: string): Promise<LogSession | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('로그 파일 읽기 실패:', error);
      return null;
    }
  }

  // 로그 파일 정리 (오래된 로그 삭제)
  static async cleanupOldLogs(logDir?: string, keepDays: number = 7): Promise<number> {
    const dir = logDir || path.join(__dirname, '..', 'logs');
    const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
    
    try {
      const files = await fs.readdir(dir);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('로그 정리 실패:', error);
      return 0;
    }
  }

  getSessionInfo(): { sessionId: string; logFile: string; startTime: string } {
    return {
      sessionId: this.session.sessionId,
      logFile: this.currentLogFile,
      startTime: this.session.startTime
    };
  }
}

export { DetailedLogger, LogEntry, LogSession };