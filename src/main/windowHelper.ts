// main/stores/window/windowHelper.ts - 추가 의존성 없이 안정적인 창 감지
import { desktopCapturer } from 'electron';

// Windows API 타입 정의
interface WindowInfo {
  id: string;
  name: string;
  thumbnailURL: string;
  appIcon?: string;
  display_id?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isVisible: boolean;
}

// 안정적인 창 감지 (추가 의존성 없음)
export class NativeWindowHelper {
  private static cachedWindows: WindowInfo[] = [];
  private static lastCacheTime = 0;
  private static CACHE_DURATION = 1000; // 1초 캐시

  // 모든 창 목록 가져오기 (실제 창 크기 추정)
  static async getAllWindows(): Promise<WindowInfo[]> {
    const now = Date.now();
    
    // 캐시가 유효하면 캐시된 결과 반환
    if (now - this.lastCacheTime < this.CACHE_DURATION && this.cachedWindows.length > 0) {
      return this.cachedWindows;
    }

    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        fetchWindowIcons: true,
        thumbnailSize: { width: 1920, height: 1080 } // 최대 해상도로 정확한 크기 감지
      });

      const validWindows = sources
        .filter(source => 
          !source.name.includes('Electron') && 
          !source.name.includes('DevTools') &&
          !source.name.includes('Window Selection') &&
          source.name.trim() !== '' &&
          source.name !== 'Desktop' &&
          source.name !== 'Screen'
        )
        .map((source, index) => {
          // 실제 창 크기 추정 (썸네일 크기 기반)
          const thumbnailWidth = source.thumbnail?.getSize().width || 800;
          const thumbnailHeight = source.thumbnail?.getSize().height || 600;
          
          // 일반적인 창 크기로 스케일링 (썸네일은 실제 창의 축소본)
          let actualWidth = Math.max(thumbnailWidth * 2, 400);  // 최소 400px
          let actualHeight = Math.max(thumbnailHeight * 2, 300); // 최소 300px
          
          // 창 이름에 따른 크기 조정
          if (source.name.includes('Unity') || source.name.includes('Unreal')) {
            actualWidth = Math.min(actualWidth * 1.5, 1600);
            actualHeight = Math.min(actualHeight * 1.5, 1200);
          } else if (source.name.includes('Chrome') || source.name.includes('Firefox')) {
            actualWidth = Math.min(actualWidth * 1.2, 1400);
            actualHeight = Math.min(actualHeight * 1.2, 900);
          } else if (source.name.includes('Code') || source.name.includes('Visual Studio')) {
            actualWidth = Math.min(actualWidth * 1.3, 1500);
            actualHeight = Math.min(actualHeight * 1.3, 1000);
          }

          // Z-order 기반 위치 (첫 번째는 중앙, 나머지는 계단식)
          let x, y;
          const screenWidth = 2560;  // 일반적인 화면 크기
          const screenHeight = 1440;
          
          if (index === 0) {
            // 첫 번째 창은 화면 중앙
            x = (screenWidth - actualWidth) / 2;
            y = (screenHeight - actualHeight) / 2;
          } else {
            // 나머지 창들은 계단식 배치
            const offsetX = (index % 3) * 100;
            const offsetY = (index % 3) * 80;
            x = Math.max(50 + offsetX, Math.min(screenWidth - actualWidth - 50, 200 + offsetX));
            y = Math.max(50 + offsetY, Math.min(screenHeight - actualHeight - 50, 150 + offsetY));
          }

          return {
            id: source.id,
            name: source.name,
            thumbnailURL: source.thumbnail ? `data:image/png;base64,${source.thumbnail.toPNG().toString('base64')}` : '',
            bounds: {
              x: Math.round(x),
              y: Math.round(y), 
              width: Math.round(actualWidth),
              height: Math.round(actualHeight)
            },
            isVisible: true,
            display_id: source.display_id
          };
        });

      // 캐시 업데이트
      this.cachedWindows = validWindows;
      this.lastCacheTime = now;

      console.log(`✅ 발견된 창: ${validWindows.length}개`);
      validWindows.forEach(window => {
        console.log(`📐 ${window.name}: ${window.bounds.width}x${window.bounds.height} at (${window.bounds.x}, ${window.bounds.y})`);
      });
      
      return validWindows;
    } catch (error) {
      console.error('❌ getAllWindows 실패:', error);
      return this.cachedWindows; // 에러시 이전 캐시 반환
    }
  }

  // 마우스 위치의 창 정보 가져오기 (실제 창 크기 반환)
  static async getWindowAtPoint(x: number, y: number): Promise<WindowInfo | null> {
    try {
      const allWindows = await this.getAllWindows();
      
      // 마우스 위치에 정확히 맞는 창 찾기
      for (const window of allWindows) {
        const bounds = window.bounds;
        if (x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height) {
          console.log(`✅ 정확한 창 감지: "${window.name}" (${bounds.width}x${bounds.height})`);
          // 실제 창 크기 그대로 반환
          return window;
        }
      }
      
      // 정확히 안 맞으면 Z-order 순서로 첫 번째 창 반환 (실제 크기 유지)
      if (allWindows.length > 0) {
        const topWindow = allWindows[0];
        console.log(`🎯 기본 창 반환: "${topWindow.name}" (${topWindow.bounds.width}x${topWindow.bounds.height})`);
        return topWindow;
      }
      
      console.log('❌ 감지된 창 없음');
      return null;
    } catch (error) {
      console.error('❌ getWindowAtPoint 실패:', error);
      return null;
    }
  }

  // 창 ID로 특정 창 찾기
  static async getWindowById(windowId: string): Promise<WindowInfo | null> {
    try {
      const allWindows = await this.getAllWindows();
      return allWindows.find(window => window.id === windowId) || null;
    } catch (error) {
      console.error('❌ getWindowById 실패:', error);
      return null;
    }
  }

  // 창이 여전히 존재하는지 확인
  static async isWindowValid(windowId: string): Promise<boolean> {
    try {
      const window = await this.getWindowById(windowId);
      return window !== null;
    } catch (error) {
      console.error('❌ isWindowValid 실패:', error);
      return false;
    }
  }

  // 창의 실시간 정보 업데이트
  static async refreshWindowInfo(windowId: string): Promise<WindowInfo | null> {
    // 캐시 무효화
    this.lastCacheTime = 0;
    return await this.getWindowById(windowId);
  }

  // 캐시 수동 무효화
  static clearCache(): void {
    this.cachedWindows = [];
    this.lastCacheTime = 0;
  }
}