import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './routes/index';
import mcpRoutes from './routes/mcp.routes';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import { swaggerSpec } from './config/swagger';

const app = express();

// 미들웨어 설정
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// CORS 헤더 추가 미들웨어
app.use((req, res, next) => {
  res.header('Access-Control-Expose-Headers', 'mcp-session-id');
  next();
});

// Swagger UI 설정
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON 엔드포인트
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API 라우트 설정
app.use('/api', apiRoutes);

// MCP 라우트 설정 (API 경로 외부에 설정)
app.use(mcpRoutes);

// 기본 경로 응답
app.get('/', (req, res) => {
  res.send('API 서버가 실행 중입니다. <br/>' + 
           '<a href="/api/hello">API</a> 경로를 통해 API에 접근하세요.<br/>' +
           '<a href="/api-docs">API 문서</a>에서 API를 테스트하고 확인하세요.');
});

// 오류 처리 미들웨어
app.use(notFoundHandler);
app.use(errorHandler);

export default app; 