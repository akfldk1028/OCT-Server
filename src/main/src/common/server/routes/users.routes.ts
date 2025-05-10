import express from 'express';
import { getAllUsers, getUserById } from '../controllers/user.controller';

const router = express.Router();

// 사용자 라우트 정의
router.get('/', getAllUsers);      // 모든 사용자 조회
router.get('/:id', getUserById);   // ID로 특정 사용자 조회

// 향후 추가 가능한 라우트:
// router.post('/', createUser);
// router.put('/:id', updateUser);
// router.delete('/:id', deleteUser);

export default router; 