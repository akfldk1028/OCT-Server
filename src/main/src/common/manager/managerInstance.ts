import { ServerManager } from './severManager';
import { startExpressServer } from '../server/server';
import { getBackingServerTransport, createTransport } from '../server/services/mcp/transport';
import mcpProxy from '../server/services/mcp/proxy';
// Transport 타입 가져오기
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
// Express 타입 가져오기 (만약 이게 문제라면 나중에 제거할 수 있음)
import express from 'express';

console.log(`[managerInstance] 초기화 시작`);

// 서버 유형 상수 정의
const SERVER_TYPES = {
  EXPRESS: 'express',
  MCP: 'mcp',
};

// 서버 목록 생성 함수
function createServers() {
  let expressServerInstance: any = null;
  
  return [{
    name: 'local-express-server', // 이름을 더 명확하게 변경
    displayName: 'Express 로컬 서버', // 표시 이름 추가
    serverType: SERVER_TYPES.EXPRESS, // 서버 유형 명시
    status: 'stopped',
    config: {
      command: 'node',
      args: ['server.js'],
      port: 4303
    },
    // Express 서버 시작 메소드
    start: async function() {
      console.log('🔄 [ServerManager] local-express-server 시작 요청 받음');
      if (this.status !== 'running') {
        console.log('📡 [ServerManager] startExpressServer() 함수 호출 중...');
        expressServerInstance = startExpressServer();
        console.log('💾 [ServerManager] Express 서버 인스턴스 저장됨:', expressServerInstance ? '성공' : '실패');
        this.status = 'running';
        console.log('✅ [ServerManager] local-express-server 상태 업데이트: running');
      } else {
        console.log('⚠️ [ServerManager] Express 로컬 서버가 이미 실행 중입니다');
      }
    },
    // Express 서버 중지 메소드
    stop: async function() {
      console.log('🔄 [ServerManager] local-express-server 중지 요청 받음');
      if (this.status === 'running' && expressServerInstance) {
        console.log('📡 [ServerManager] 저장된 Express 서버 인스턴스 종료 중...');
        expressServerInstance.close(() => {
          console.log('✅ [ServerManager] Express 서버 인스턴스가 성공적으로 종료됨');
        });
        this.status = 'stopped';
        console.log('✅ [ServerManager] local-express-server 상태 업데이트: stopped');
      } else {
        console.log('⚠️ [ServerManager] Express 로컬 서버가 실행 중이 아니거나 인스턴스가 없습니다');
        console.log('  - 상태:', this.status);
        console.log('  - 인스턴스 존재:', expressServerInstance ? '예' : '아니오');
      }
    },
    checkStatus: async function() {
      return {
        name: this.name,
        displayName: this.displayName,
        serverType: this.serverType,
        online: this.status === 'running',
        status: this.status,
        pingMs: this.status === 'running' ? 0 : undefined
      };
    }
  },
  // MCP 서버 인스턴스 추가
  {
    name: 'remote-mcp-server',
    displayName: 'MCP 원격 서버',
    serverType: SERVER_TYPES.MCP,
    status: 'stopped',
    config: {
      type: 'stdio',
      command: 'python',
      args: ['path/to/server.py'],
      port: 5000
    },
    transportInstance: null as Transport | null,
    
    // MCP 서버 시작 메소드 - API 호출 사용
    mcpstart: async function() {
      console.log('🔄 [MCP] 원격 MCP 서버 시작 중...');
      if (this.status !== 'running') {
        try {
          // API 호출로 단순화
          const success = await manager.callMcpApi(this.config);
          
          if (success) {
            this.status = 'running';
            console.log('✅ [MCP] MCP 서버 시작 완료');
          } else {
            throw new Error('MCP API 호출 실패');
          }
        } catch (err) {
          console.error('❌ [MCP] MCP 서버 시작 중 오류:', err);
          this.status = 'error';
        }
      } else {
        console.log('⚠️ [MCP] MCP 원격 서버가 이미 실행 중입니다');
      }
    },
    
    // MCP 서버 중지 메소드
    mcpstop: async function() {
      console.log('🔄 [MCP] 원격 MCP 서버 중지 중...');
      if (this.status === 'running' && this.transportInstance) {
        try {
          if (typeof this.transportInstance.close === 'function') {
            await this.transportInstance.close();
          } else {
            console.warn('⚠️ [MCP] Transport 인스턴스가 close 메소드를 지원하지 않습니다.');
          }
          this.transportInstance = null;
          this.status = 'stopped';
          console.log('✅ [MCP] MCP 원격 서버가 중지되었습니다');
        } catch (err) {
          console.error('❌ [MCP] MCP 원격 서버 중지 중 오류:', err);
          this.status = 'error';
        }
      } else {
        console.log('⚠️ [MCP] MCP 원격 서버가 실행 중이 아닙니다');
      }
    },
    
    // 기존 메서드는 유지하되 mcpstart와 mcpstop을 호출하도록 수정
    start: async function() { return this.mcpstart(); },
    stop: async function() { return this.mcpstop(); },
    
    checkStatus: async function() {
      return {
        name: this.name,
        displayName: this.displayName,
        serverType: this.serverType,
        online: this.status === 'running',
        status: this.status,
        pingMs: this.status === 'running' ? 0 : undefined
      };
    }
  }];
}

// 서버 매니저 생성
export const manager = new ServerManager(createServers());
console.log(`[managerInstance] 초기화 완료`);
