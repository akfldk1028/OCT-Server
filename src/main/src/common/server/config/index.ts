// 환경변수 읽기 (나중에 dotenv 사용 가능)
const env = process.env.NODE_ENV || 'development';

// 기본 설정
export const config = {
  env,
  isDev: env === 'development',
  isProd: env === 'production',
  isTest: env === 'test',
  port: process.env.PORT || 4303,
  

  // API 기본 경로
  apiPrefix: '/api',
}; 