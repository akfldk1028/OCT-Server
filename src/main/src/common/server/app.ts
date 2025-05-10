import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import mcpRoutes from './routes/mcp.routes';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import { swaggerSpec } from './config/swagger';

const app = express();

// 1) 공통 미들웨어
app.use(compression());
app.use(cors());
app.use(morgan('dev'));
app.use((req, res, next) => {
  res.header('Access-Control-Expose-Headers', 'mcp-session-id');
  next();
});

// 2) Swagger 설정
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => {
  res.type('application/json').send(swaggerSpec);
});

// 3) MCP 라우트 (raw-body만 타고 express.json()은 타지 않음)
app.use('/', mcpRoutes);

// 4) 그 다음 JSON 파서
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5) 일반 API 라우트

// 6) 기본 페이지 및 에러 핸들러
app.get('/', (req, res) => {
  res.send(
    'API 서버가 실행 중입니다. <br/>' +
    '<a href="/api/hello">API</a> 경로를 통해 API에 접근하세요.<br/>' +
    '<a href="/api-docs">API 문서</a>에서 테스트하세요.'
  );
});
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
