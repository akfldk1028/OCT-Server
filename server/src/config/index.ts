// 환경변수 읽기 (나중에 dotenv 사용 가능)
const env = process.env.NODE_ENV || 'development';

// 기본 설정
export const config = {
  env,
  isDev: env === 'development',
  isProd: env === 'production',
  isTest: env === 'test',
  port: process.env.PORT || 3000,
  
  // 데이터베이스 설정 (Drizzle 용)
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'myapp_db',
  },
  
  // API 기본 경로
  apiPrefix: '/api',
}; 