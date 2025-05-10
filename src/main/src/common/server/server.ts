// D:\250430_OCT_Server\OCT\src\main\src\common\server\server.ts
import app from './app';
import { config } from './config';
// 순환 참조 방지를 위해 제거
// import { manager } from '../manager/managerInstance';

export function startExpressServer() {
  console.log('🔍 startExpressServer() 함수 호출됨 - Express 서버 시작 시도');
  const PORT = config.port || 4303;
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Express 서버가 성공적으로 시작됨 - 포트 ${PORT}`);
    console.log(`📡 접속 URL: http://localhost:${PORT}`);
    
    // manager 참조 제거
    // try {
    //   const expressServer = manager.getServer('express-server');
    //   if (expressServer) {
    //     expressServer.status = 'running'; 
    //     console.log('🔄 서버 매니저에 Express 서버 상태 업데이트: running');
    //   }
    // } catch (err) {
    //   console.error('⚠️ 서버 매니저 업데이트 실패:', err);
    // }
  });
  
  console.log('✅ Express 서버 인스턴스 생성 완료');
  // 서버 인스턴스를 반환하면 나중에 정지할 수 있음
  return server;
}

// 예기치 않은 오류 처리
process.on('uncaughtException', (error) => {
  console.error('예기치 않은 예외가 발생했습니다:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 프로미스 거부가 있습니다:', reason);
});