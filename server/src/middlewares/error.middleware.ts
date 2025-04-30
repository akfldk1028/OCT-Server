import { Request, Response, NextFunction } from 'express';

/**
 * 404 - 찾을 수 없음 오류 처리
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`요청한 경로를 찾을 수 없습니다: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * 전역 오류 처리기
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  
  // 개발 환경에서는 스택 트레이스를 포함하고, 프로덕션에서는 제외
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
}; 