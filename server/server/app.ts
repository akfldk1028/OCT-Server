import express from 'express';
import compression from 'compression';
// import cors from 'cors';
import morgan from 'morgan';
import apiRoutes from '../app/routes/index';

const app = express();

// 미들웨어 설정
app.use(compression());
// app.use(cors());
app.use(morgan('dev'));

// API 라우트 설정
app.use('/api', apiRoutes);

// 기본 경로 응답
app.get('/', (req, res) => {
  res.send('API 서버가 실행 중입니다. /api 경로를 통해 API에 접근하세요.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
});

export default app;
