import express from 'express';
import usersRoutes from './users.routes';
import mcpRoutes from './mcp.routes';

const router = express.Router();

// 기본 API 테스트 라우트
router.get('/hello', (req, res) => {
  res.json({ message: '안녕하세요!' });
});

// 사용자 관련 라우트
router.use('/users', usersRoutes);

// MCP 관련 라우트
router.use('/mcp', mcpRoutes);

// 라우터 내보내기
export default router; 