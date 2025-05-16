import { isElectron } from './environment';

/**
 * 웹 전용 라우트인지 확인하는 함수
 * @param path 체크할 라우트 경로
 * @returns 웹 전용 라우트인 경우 true, 아니면 false
 */
export const isWebOnlyRoute = (path: string): boolean => {
  // 웹 전용 라우트 정의 (필요한 경우 확장)
  const webOnlyRoutes = [
    '/web-only', 
    '/marketing'
  ];
  
  return webOnlyRoutes.some(route => path.startsWith(route));
};

/**
 * 일렉트론 전용 라우트인지 확인하는 함수
 * @param path 체크할 라우트 경로
 * @returns 일렉트론 전용 라우트인 경우 true, 아니면 false
 */
export const isElectronOnlyRoute = (path: string): boolean => {
  // 일렉트론 전용 라우트 정의
  const electronOnlyRoutes = [
    '/jobs',
    '/configuration',
    '/local-files'
  ];
  
  return electronOnlyRoutes.some(route => path.startsWith(route));
};

/**
 * 현재 환경에 맞지 않는 라우트로 접근할 경우 적절한 리다이렉션 경로를 반환하는 함수
 * @param path 현재 접근하려는 경로 
 * @returns 적절한 리다이렉션 경로 또는 그대로 진행해도 되는 경우 null
 */
export const getRedirectPathIfNeeded = (path: string): string | null => {
  // 일렉트론 환경에서 웹 전용 라우트 접근 시
  if (isElectron() && isWebOnlyRoute(path)) {
    return '/'; // 홈으로 리다이렉트
  }
  
  // 웹 환경에서 일렉트론 전용 라우트 접근 시
  if (!isElectron() && isElectronOnlyRoute(path)) {
    return '/'; // 홈으로 리다이렉트
  }
  
  return null; // 리다이렉트 필요 없음
};

/**
 * 현재 환경에 적합한 형태의 라우트를 필터링하여 반환
 * @param routes 전체 라우트 배열
 * @returns 현재 환경에 적합한 라우트 배열
 */
export const filterRoutesByEnvironment = (routes: any[]): any[] => {
  if (isElectron()) {
    // 일렉트론 환경 - 웹 전용 라우트 제외
    return routes.filter(route => !isWebOnlyRoute(route.path || ''));
  } else {
    // 웹 환경 - 일렉트론 전용 라우트 제외 
    return routes.filter(route => !isElectronOnlyRoute(route.path || ''));
  }
}; 