import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

// 모든 사용자 조회
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users);
    return res.json(allUsers);
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return res.status(500).json({ error: '사용자 조회 중 오류가 발생했습니다' });
  }
};

// ID로 특정 사용자 조회
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다' });
    }
    
    const user = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user || user.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }
    
    return res.json(user[0]);
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return res.status(500).json({ error: '사용자 조회 중 오류가 발생했습니다' });
  }
}; 