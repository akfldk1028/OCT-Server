import { redirect } from 'react-router';

/**
 * 현재 실행 환경이 일렉트론인지 확인하는 유틸리티 함수 (개선된 버전)
 * @returns {boolean} 일렉트론 환경이면 true, 아니면 false
 */
export const isElectron = (): boolean => {
  // 브라우저 환경이 아니면 false
  if (typeof window === 'undefined') {
    return false;
  }
  
  // 1. window.electron 또는 window.electronAPI 확인 (preload에서 설정된 경우)
  if ((window as any).electron || (window as any).electronAPI) {
    return true;
  }
  
  // 2. userAgent 확인
  if (typeof navigator !== 'undefined' && 
      navigator.userAgent.toLowerCase().indexOf('electron') !== -1) {
    return true;
  }
  
  // 3. window.process 확인
  if ((window as any).process && (window as any).process.type) {
    return true;
  }
  
  // 4. require 함수 존재 확인 (일렉트론에서만 존재)
  try {
    if (typeof (window as any).require !== 'undefined') {
      return true;
    }
  } catch (e) {
    // require를 확인할 수 없음
  }
  
  return false;
};

/**
 * 현재 실행 환경이 웹인지 확인하는 유틸리티 함수
 * @returns {boolean} 웹 환경이면 true, 아니면 false
 */
export const isWeb = (): boolean => {
  return !isElectron();
};

/**
 * 환경에 따라 라우터 모드를 반환하는 함수
 * 일렉트론에서는 HashRouter를, 웹에서는 BrowserRouter를 사용할 수 있도록 함
 */
export const getRouterMode = (): 'hash' | 'browser' => {
  return isElectron() ? 'hash' : 'browser';
};

/**
 * 런타임 환경 상수 (환경 변수에서 가져온 값)
 */
export const IS_ELECTRON = isElectron();
export const IS_WEB = isWeb();

// 편의를 위한 redirect 함수 재export
export { redirect };

// 디버깅을 위한 환경 정보 로그
if (typeof console !== 'undefined') {
  console.log('🔍 Environment Detection:');
  console.log('- Is Electron:', IS_ELECTRON);
  console.log('- Is Web:', IS_WEB);
  console.log('- User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');
  console.log('- Window.process:', typeof window !== 'undefined' ? !!(window as any).process : false);
  console.log('- Window.electron:', typeof window !== 'undefined' ? !!(window as any).electron : false);
}