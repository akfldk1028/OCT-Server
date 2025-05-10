import { db } from '../db';
import { users, User, NewUser } from '../db/schema/users';
import { eq } from 'drizzle-orm';

// 모든 사용자 조회
export const findAllUsers = async (): Promise<User[]> => {
  return db.select().from(users);
};

// ID로 사용자 조회
export const findUserById = async (id: number): Promise<User | null> => {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result.length > 0 ? result[0] : null;
};

// 이메일로 사용자 조회
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result.length > 0 ? result[0] : null;
};

// 사용자 생성
export const createUser = async (userData: NewUser): Promise<User> => {
  const result = await db.insert(users).values(userData).returning();
  return result[0];
};

// 사용자 정보 업데이트
export const updateUser = async (id: number, userData: Partial<NewUser>): Promise<User | null> => {
  const result = await db.update(users)
    .set({ ...userData, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  
  return result.length > 0 ? result[0] : null;
};

// 사용자 삭제
export const deleteUser = async (id: number): Promise<boolean> => {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  return result.length > 0;
}; 