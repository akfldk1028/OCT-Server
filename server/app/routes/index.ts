// app/routes/index.ts 파일 확인
import express from 'express';

const router = express.Router();

// 올바른 경로
router.get('/hello', (req, res) => {
  res.json({ message: '안녕하세요!' });
});

// 올바른 매개변수 포맷
router.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});

export default router;
