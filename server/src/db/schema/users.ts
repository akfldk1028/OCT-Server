import { pgTable, serial, varchar, timestamp, text, boolean } from 'drizzle-orm/pg-core';

// 사용자 테이블 정의
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// 사용자 관련 타입 정의
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert; 