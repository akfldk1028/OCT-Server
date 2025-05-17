// GuideManager.ts - 가이드 모드 기능 모듈화
import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { SoftwareGuideProcessingHelper } from './overlay/SoftwareGuideProcessingHelper';
import { ScreenshotHelper } from './overlay/ScreenshotHelper';
import { aiService } from './overlay/SimpleAIService';

export class GuideManager {
  private mainWindow: BrowserWindow | null;
  private softwareGuideManager: SoftwareGuideProcessingHelper | null = null;
  private guideState = {
    guideEnabled: false,
    screenshotHelper: null as ScreenshotHelper | null,
  };

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
    this.initialize();
    console.log("✅ Guide Manager initialized");
  }

  // 초기화 메서드
  private initialize(): void {
    this.initializeScreenshotHelper();
    this.initializeSoftwareGuideManager();
    this.registerShortcuts();
    this.registerIpcHandlers();
  }

  // 스크린샷 헬퍼 초기화
  private initializeScreenshotHelper(): void {
    if (!this.guideState.screenshotHelper) {
      this.guideState.screenshotHelper = new ScreenshotHelper("queue");
    }
  }

  // 소프트웨어 가이드 매니저 초기화
  private initializeSoftwareGuideManager(): void {
    if (this.mainWindow) {
      this.softwareGuideManager = new SoftwareGuideProcessingHelper(this.mainWindow);
    }
  }

  // Guide Mode에서 화면 캡처 및 분석
  private async captureAndAnalyzeScreen(question: string = "기본 사용법 알려줘") {
    if (!this.mainWindow || !this.guideState.screenshotHelper) return null;
    
    try {
      // 메인 윈도우를 잠시 숨기고 스크린샷 캡처
      const hideWindow = () => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.hide();
        }
      };
      
      const showWindow = () => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.show();
        }
      };
      
      // 스크린샷 캡처
      console.log("스크린샷 캡처 시작");
      const screenshotPath = await this.guideState.screenshotHelper.takeScreenshot(hideWindow, showWindow);
      console.log("스크린샷 캡처 완료:", screenshotPath);
      
      const screenshotData = await this.guideState.screenshotHelper.getImagePreview(screenshotPath);
      
      // 활성 소프트웨어 감지
      let software = "unknown";
      try {
        const activeWindow = await this.mainWindow.webContents.executeJavaScript(`
          window.api?.overlay?.getActiveWindow()
        `).catch(() => ({ software: 'unknown' }));
        
        software = activeWindow.software || "unknown";
      } catch (error) {
        console.error('활성 윈도우 감지 오류:', error);
        // 오류 발생 시 기본값 사용
        software = "unknown";
      }
      
      return {
        screenshotPath,
        screenshotData,
        software,
        question
      };
    } catch (error) {
      console.error('Error capturing screen for guide:', error);
      // 최소한의 정보라도 반환하여 프로세스 계속 진행
      return {
        screenshotPath: "",
        screenshotData: "",
        software: "unknown",
        question
      };
    }
  }
  // 단축키 등록
  private registerShortcuts(): void {
    // Ctrl+G: 가이드 모드 활성화 + 화면 분석 + 가이드 생성
        // Ctrl+G: 가이드 모드 활성화 + 화면 분석 + 가이드 생성
        globalShortcut.register("CommandOrControl+G", async () => {
          if (!this.mainWindow) return;
          
          try {
            console.log("가이드 모드 단축키(Ctrl+G) 감지됨");
            
            // 가이드 모드가 비활성화된 상태라면 먼저 활성화
            if (!this.guideState.guideEnabled) {
              this.guideState.guideEnabled = true;
              
              // Software Guide Manager에 가이드 모드 활성화 알림
              if (this.softwareGuideManager) {
                try {
                  await this.mainWindow.webContents.executeJavaScript(`
                    window.api?.overlay?.toggleGuideMode(true)
                  `);
                  console.log("가이드 모드 활성화됨");
                } catch (err) {
                  console.warn("가이드 모드 활성화 API 호출 실패:", err);
                }
              }
              
              console.log("Guide mode activated via Ctrl+G");
            }
            
            // 스크린샷 캡처 및 분석
            const screenData = await this.captureAndAnalyzeScreen("기본 사용법 알려줘");
            
            if (screenData) {
              console.log("캡처된 스크린샷으로 가이드 생성 중...");
              
              // AI 서비스를 사용하여 가이드 생성
              if (screenData.software && screenData.screenshotData) {
                // AI 서비스로 가이드 생성
                const guideData = await aiService.generateGuide({
                  software: screenData.software,
                  question: screenData.question,
                  screenshotData: screenData.screenshotData
                });
                
                // 생성된 가이드 표시
                if (this.softwareGuideManager) {
                  await this.softwareGuideManager.showGuide(guideData);
                }
              } else {
                console.log("소프트웨어 감지 실패 또는 스크린샷 데이터 없음");
              }
            } else {
              this.mainWindow.webContents.send('guide-error', '스크린샷 캡처 실패');
            }
          } catch (error) {
            console.error('Error in Ctrl+G handler:', error);
            // 사용자에게 오류 알림
            if (this.mainWindow) {
              this.mainWindow.webContents.send('guide-error', '가이드 기능 실행 중 오류가 발생했습니다.');
            }
          }
        });
  
    // Ctrl+Shift+G: 커스텀 질문으로 가이드 요청
    globalShortcut.register("CommandOrControl+Shift+G", async () => {
      if (!this.mainWindow) return;
      
      try {
        // 가이드 모드가 비활성화된 상태라면 먼저 활성화
        if (!this.guideState.guideEnabled) {
          this.guideState.guideEnabled = true;
          
          if (this.softwareGuideManager) {
            await this.mainWindow.webContents.executeJavaScript(`
              window.api?.overlay?.toggleGuideMode(true)
            `);
          }
          
          console.log("Guide mode activated via Ctrl+Shift+G");
        }
        
        // 활성 소프트웨어 감지
        const activeWindow = await this.mainWindow.webContents.executeJavaScript(`
          window.api?.overlay?.getActiveWindow()
        `).catch(() => ({ software: 'unknown' }));
        
        // 커스텀 질문 모달 표시
        this.mainWindow.webContents.send('show-guide-question-modal', {
          software: activeWindow.software
        });
      } catch (error) {
        console.error('Error in Ctrl+Shift+G handler:', error);
      }
    });
  
    // Ctrl+Shift+H: 가이드 모드 토글
    globalShortcut.register("CommandOrControl+Shift+H", async () => {
      if (!this.mainWindow) return;
      
      try {
        this.guideState.guideEnabled = !this.guideState.guideEnabled;
        
        if (this.softwareGuideManager) {
          await this.mainWindow.webContents.executeJavaScript(`
            window.api?.overlay?.toggleGuideMode(${this.guideState.guideEnabled})
          `);
        }
        
        console.log(`Guide mode ${this.guideState.guideEnabled ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error('Error toggling guide mode:', error);
      }
    });
  
    // Ctrl+Shift+R: 모든 가이드 오버레이 정리
    globalShortcut.register("CommandOrControl+Shift+R", async () => {
      if (!this.mainWindow || !this.softwareGuideManager) return;
      
      try {
        await this.softwareGuideManager.clearAllOverlays();
        console.log("All guide overlays cleared");
      } catch (error) {
        console.error('Error clearing guide overlays:', error);
      }
    });
  }

  // IPC 핸들러 등록
  private registerIpcHandlers(): void {
    // Guide Mode 관련 핸들러
    ipcMain.handle('get-guide-mode', async () => {
      return {
        guideEnabled: this.guideState.guideEnabled
      };
    });
  
    // 스크린샷과 함께 가이드 요청하는 핸들러
    ipcMain.handle('process-software-guide-with-screenshot', async (_, { software, question }) => {
      try {
        if (!this.guideState.guideEnabled) {
          return { error: "Guide mode is disabled" };
        }
  
        // 화면 캡처 및 분석
        const screenData = await this.captureAndAnalyzeScreen(question);
        
        if (screenData && this.softwareGuideManager) {
          await this.softwareGuideManager.processSoftwareGuideWithScreenshot(
            software || screenData.software,
            question,
            screenData.screenshotData
          );
          return { success: true };
        } else {
          return { error: "Failed to capture screen or guide manager not available" };
        }
      } catch (error) {
        console.error("Error in process-software-guide-with-screenshot:", error);
        return { error: "Failed to process software guide" };
      }
    });
  
    // 기존 가이드 핸들러 (스크린샷 없이)
    ipcMain.handle('process-software-guide', async (_, { software, question }) => {
      try {
        if (this.softwareGuideManager) {
          await this.softwareGuideManager.processSoftwareGuide(software, question);
          return { success: true };
        } else {
          return { error: "Software guide manager not available" };
        }
      } catch (error) {
        console.error("Error in process-software-guide:", error);
        return { error: "Failed to process software guide" };
      }
    });
  
    ipcMain.handle('submit-guide-question', async (_, { software, question }) => {
      try {
        // 커스텀 질문의 경우 항상 스크린샷과 함께 분석
        const screenData = await this.captureAndAnalyzeScreen(question);
        
        if (screenData && this.softwareGuideManager) {
          await this.softwareGuideManager.processSoftwareGuideWithScreenshot(
            software || screenData.software,
            question,
            screenData.screenshotData
          );
          return { success: true };
        } else {
          return { error: "Failed to capture screen or processing helper not available" };
        }
      } catch (error) {
        console.error("Error processing guide question:", error);
        return { error: "Failed to process guide question" };
      }
    });
  }

  // 메인 윈도우 업데이트
  public updateMainWindow(mainWindow: BrowserWindow | null): void {
    this.mainWindow = mainWindow;
    if (this.softwareGuideManager) {
      this.softwareGuideManager.updateMainWindow(mainWindow);
    }
  }

  // 가이드 모드 상태 가져오기
  public isGuideEnabled(): boolean {
    return this.guideState.guideEnabled;
  }

  // 가이드 모드 토글
  public toggleGuideMode(enabled?: boolean): void {
    this.guideState.guideEnabled = enabled !== undefined ? enabled : !this.guideState.guideEnabled;
  }

  // 앱 종료 시 정리
  public cleanup(): void {
    if (this.softwareGuideManager) {
      this.softwareGuideManager.cleanup();
    }
    
    // Screenshot Helper 정리
    if (this.guideState.screenshotHelper) {
      this.guideState.screenshotHelper.clearQueues();
    }
    
    // 단축키 해제는 app.on('will-quit')에서 전역으로 처리
    
    console.log("✅ Guide Manager cleaned up");
  }
}