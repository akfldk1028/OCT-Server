import express from 'express';
import usersRoutes from './users.routes';

const router = express.Router();

// JSON parser 는 app.ts 에서 이미 타기 때문에 여기선 안 써도 됩니다.
// router.use(express.json());

// 일반 API 테스트
router.get('/hello', (req, res) => {
  res.json({ message: '안녕하세요!' });
});

// 사용자 관련
router.use('/users', usersRoutes);

export default router;
