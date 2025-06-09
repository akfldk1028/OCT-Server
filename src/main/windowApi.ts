// src/main/windowApi.ts
import { ipcMain, desktopCapturer, screen, BrowserWindow } from 'electron';
import * as os from 'os';

let windowsApi: typeof import('windows-api') | null = null;
if (process.platform === 'win32') {
  try {
    windowsApi = require('windows-api');
    console.log('✅ windows-api 패키지 로드 성공');
  } catch (error) {
    console.warn('⚠️ windows-api 로드 실패:', error);
    windowsApi = null;
  }
}

export interface WinApiWindowInfo {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 창 목록 캐시 (성능 최적화)
let windowCache: Array<{
  id: string;
  name: string;
  estimatedBounds: { x: number; y: number; width: number; height: number };
  lastSeen: number;
}> = [];

let lastCacheUpdate = 0;
const CACHE_DURATION = 2000; // 2초마다 캐시 업데이트

// 🔥 실제 창 감지를 위한 고급 알고리즘
async function updateWindowCache(): Promise<void> {
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_DURATION) {
    return; // 캐시가 아직 유효함
  }

  try {
    console.log('🔄 [windowApi] 창 목록 캐시 업데이트 중...');
    
    // 1. desktopCapturer로 모든 창 가져오기
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      fetchWindowIcons: false,
      thumbnailSize: { width: 1, height: 1 } // 성능을 위해 최소 크기
    });

    // 2. 🔥 현재 화면에 보이는 창들만 필터링 (개선됨)
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x: screenX, y: screenY, width: screenWidth, height: screenHeight } = primaryDisplay.bounds;
    
    const validWindows = sources.filter(source => {
      // 기본 필터링
      if (source.name.includes('Electron') || 
          source.name.includes('DevTools') ||
          source.name.includes('Window Selection') ||
          source.name.trim() === '' ||
          source.name === 'Desktop' ||
          source.name.includes('Screen') ||
          source.name.includes('Task Switching') ||
          source.name.includes('Program Manager') ||
          source.name.includes('Windows Input Experience') ||
          source.name.includes('Microsoft Text Input Application')) {
        return false;
      }
      
      // 🔥 숨겨진 창이나 최소화된 창 제외
      if (source.name.includes('Hidden') || 
          source.name.includes('Minimized') ||
          source.name.length === 0) {
        return false;
      }
      
      return true;
    });

    // 3. Electron 창들의 정확한 위치 정보 가져오기
    const electronWindows = BrowserWindow.getAllWindows();
    const electronBoundsMap = new Map<string, Electron.Rectangle>();
    
    for (const win of electronWindows) {
      if (!win.isDestroyed() && win.isVisible() && !win.isMinimized()) {
        const title = win.getTitle();
        const bounds = win.getBounds();
        electronBoundsMap.set(title, bounds);
      }
    }

    // 4. 🔥 창 위치 추정 (현재 화면 기준으로 개선됨)
    windowCache = validWindows.map((window, index) => {
      // Electron 창인 경우 정확한 위치 사용
      const electronBounds = electronBoundsMap.get(window.name);
      
      if (electronBounds) {
        return {
          id: window.id,
          name: window.name,
          estimatedBounds: electronBounds,
          lastSeen: now
        };
      }

      // 일반 창들의 위치 추정 (현재 화면 내에서만)
      const estimatedBounds = estimateWindowPositionOnScreen(window.name, index, screenX, screenY, screenWidth, screenHeight);
      
      return {
        id: window.id,
        name: window.name,
        estimatedBounds,
        lastSeen: now
      };
    });

    lastCacheUpdate = now;
    console.log(`✅ [windowApi] 창 캐시 업데이트 완료: ${windowCache.length}개 창 (화면 내 창만)`);
    
  } catch (error) {
    console.error('❌ [windowApi] 창 캐시 업데이트 실패:', error);
  }
}

// 🧠 현재 화면 기준 스마트한 창 위치 추정 알고리즘
function estimateWindowPositionOnScreen(windowName: string, index: number, screenX: number, screenY: number, screenWidth: number, screenHeight: number) {
  // 일반적인 창 크기 패턴 (더 현실적으로)
  const commonSizes = [
    { width: 1200, height: 800 },  // 대형 창 (브라우저, IDE)
    { width: 900, height: 600 },   // 중형 창 (일반 앱)
    { width: 600, height: 400 },   // 소형 창 (유틸리티)
    { width: 300, height: 200 },   // 미니 창 (알림, 계산기)
  ];

  // 창 이름 기반 크기 추정 (더 정확하게)
  let estimatedSize = commonSizes[1]; // 기본값: 중형
  
  if (windowName.includes('Chrome') || windowName.includes('Firefox') || windowName.includes('Edge') || windowName.includes('Safari')) {
    estimatedSize = commonSizes[0]; // 브라우저는 대형
  } else if (windowName.includes('Code') || windowName.includes('Studio') || windowName.includes('Visual')) {
    estimatedSize = commonSizes[0]; // 개발 도구는 대형
  } else if (windowName.includes('Notepad') || windowName.includes('Calculator') || windowName.includes('스티커')) {
    estimatedSize = commonSizes[3]; // 간단한 앱은 미니
  } else if (windowName.includes('Explorer') || windowName.includes('File') || windowName.includes('폴더')) {
    estimatedSize = commonSizes[1]; // 파일 탐색기는 중형
  }

  // 🔥 현재 화면 내에서만 창들을 배치 (겹치지 않게)
  const maxCols = Math.floor(screenWidth / estimatedSize.width);
  const maxRows = Math.floor(screenHeight / estimatedSize.height);
  
  const col = index % maxCols;
  const row = Math.floor(index / maxCols) % maxRows;
  
  // 화면 내 위치 계산
  const x = screenX + col * estimatedSize.width;
  const y = screenY + row * estimatedSize.height;
  
  // 화면 경계 체크
  const finalX = Math.min(x, screenX + screenWidth - estimatedSize.width);
  const finalY = Math.min(y, screenY + screenHeight - estimatedSize.height);
  
  return {
    x: Math.max(screenX, finalX),
    y: Math.max(screenY, finalY),
    width: estimatedSize.width,
    height: estimatedSize.height
  };
}

// 🔥 메인 프로세스에서 직접 사용할 수 있는 로컬 함수 (export)
export async function getWindowAtPoint(x: number, y: number): Promise<WinApiWindowInfo | null> {
  console.log(`🔍 [windowApi] getWindowAtPoint 호출: (${x}, ${y})`);
  
  try {
    // 캐시 업데이트
    await updateWindowCache();
    
    if (windowCache.length === 0) {
      console.warn('⚠️ [windowApi] 캐시된 창이 없음');
      return null;
    }

    // 마우스 위치에 가장 가까운 창 찾기
    let bestMatch: WinApiWindowInfo | null = null;
    let shortestDistance = Infinity;

    for (const cachedWindow of windowCache) {
      const bounds = cachedWindow.estimatedBounds;
      
      // 1. 마우스가 창 영역 안에 있는지 확인 (최우선)
      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        console.log(`🎯 [windowApi] 정확히 창 안에 있음: "${cachedWindow.name}"`);
        return {
          id: cachedWindow.id,
          name: cachedWindow.name,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        };
      }

      // 2. 창 중심점까지의 거리 계산
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );

      if (distance < shortestDistance) {
        shortestDistance = distance;
        bestMatch = {
          id: cachedWindow.id,
          name: cachedWindow.name,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        };
      }
    }

    if (bestMatch) {
      console.log(`✅ [windowApi] 가장 가까운 창: "${bestMatch.name}" (거리: ${Math.round(shortestDistance)}px)`);
    } else {
      console.log(`❌ [windowApi] 적합한 창을 찾을 수 없음`);
    }

    return bestMatch;
    
  } catch (error) {
    console.error('❌ [windowApi] getWindowAtPoint 에러:', error);
    return null;
  }
}

// 🔥 렌더러 프로세스용 IPC 핸들러 (window.api.getWindowAtPoint 용)
export function registerWindowApi() {
  console.log('🔧 [windowApi] IPC 핸들러 등록 중...');
  
  ipcMain.handle('window-at-point', async (_evt, { x, y }: { x: number; y: number }) => {
    console.log(`🔍 [IPC] window-at-point 요청: (${x}, ${y})`);
    return await getWindowAtPoint(x, y);
  });
  
  console.log('✅ [windowApi] IPC 핸들러 등록 완료');
}
