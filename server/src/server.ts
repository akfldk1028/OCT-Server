import app from './app';
import { config } from './config';

const PORT = config.port || 4303;

app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`http://localhost:${PORT}`);
});

// 예기치 않은 오류 처리
process.on('uncaughtException', (error) => {
  console.error('예기치 않은 예외가 발생했습니다:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 프로미스 거부가 있습니다:', reason);
}); 