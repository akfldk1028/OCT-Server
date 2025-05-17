import { BrowserWindow, app, ipcMain } from 'electron';
import path from 'path';
import { aiService } from './SimpleAIService';

export interface AppState {
  mode: 'server-only' | 'guide-enabled';
  overlayWindows: Map<string, BrowserWindow>;
  guideEnabled: boolean;
}

export class SoftwareGuideProcessingHelper {
  private appState: AppState;
  private mainWindow: BrowserWindow | null;
  private handlersRegistered: boolean = false; // 핸들러 등록 상태 추적

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
    this.appState = {
      mode: 'server-only',
      overlayWindows: new Map(),
      guideEnabled: false
    };
    this.initializeHandlers();
  }

  // IPC 핸들러 초기화 - 중복 등록 방지
  private initializeHandlers(): void {
    if (this.handlersRegistered) {
      console.log('Guide handlers already registered, skipping...');
      return;
    }

    try {
      // 기존 핸들러 확인 및 제거
      this.safeRegisterHandler('toggle-guide-mode', async (_, enabled: boolean) => {
        this.appState.guideEnabled = enabled;
        this.appState.mode = enabled ? 'guide-enabled' : 'server-only';

        // 가이드 모드 비활성화시 모든 오버레이 정리
        if (!enabled) {
          await this.clearAllOverlays();
        }

        console.log(`Guide mode ${enabled ? 'enabled' : 'disabled'}`);

        // 메인 윈도우에 상태 변경 알림
        if (this.mainWindow) {
          this.mainWindow.webContents.send('guide-mode-changed', {
            enabled,
            mode: this.appState.mode
          });
        }

        return { success: true, mode: this.appState.mode };
      });

      // 나머지 핸들러들도 안전하게 등록
      this.safeRegisterHandler('get-app-mode', async () => {
        return {
          mode: this.appState.mode,
          guideEnabled: this.appState.guideEnabled
        };
      });

      this.safeRegisterHandler('show-software-guide', async (_, guideData) => {
        return this.showGuide(guideData);
      });

      this.safeRegisterHandler('clear-guide-overlays', async () => {
        await this.clearAllOverlays();
        return { success: true };
      });

      this.safeRegisterHandler('get-active-window', async () => {
        return this.getActiveWindow();
      });

      this.safeRegisterHandler('request-software-guide', async (_, { software, question }) => {
        return this.requestGuide(software, question);
      });

      this.safeRegisterHandler('update-overlay-positions', async (_, windowBounds) => {
        return this.updateOverlayPositions(windowBounds);
      });

      this.handlersRegistered = true;
      console.log('✅ Guide IPC handlers registered successfully');

    } catch (error) {
      console.error('Error registering guide handlers:', error);
    }
  }

  // 안전한 핸들러 등록 메서드 - 중복 등록 방지
  private safeRegisterHandler(channel: string, handler: (...args: any[]) => any): void {
    try {
      // 핸들러가 이미 등록되어 있는지 확인하는 방법이 제한적이므로
      // try-catch로 중복 등록 오류 처리
      try {
        // 먼저 기존 핸들러 제거 시도
        ipcMain.removeHandler(channel);
        console.log(`Removed existing handler for ${channel}`);
      } catch (error) {
        // 등록된 핸들러가 없으면 오류가 발생할 수 있지만 무시
        console.log(`No existing handler for ${channel} to remove`);
      }

      // 새 핸들러 등록
      ipcMain.handle(channel, handler);
      console.log(`Handler registered: ${channel}`);
    } catch (error) {
      console.error(`Failed to register handler for ${channel}:`, error);
    }
  }

  // 메인 윈도우 참조 업데이트
  public updateMainWindow(mainWindow: BrowserWindow | null): void {
    this.mainWindow = mainWindow;
  }

  // ===== 기존 메서드들 =====
  
  // 스크린샷과 함께 가이드 처리
  public async processSoftwareGuideWithScreenshot(
    software: string, 
    question: string, 
    screenshotData: string
  ): Promise<void> {
    if (!this.appState.guideEnabled) {
      console.warn('Guide mode is disabled');
      return;
    }

    try {
      // 실제 AI/LLM 서비스로 스크린샷과 질문을 전송
      // 현재는 더미 응답 생성
      console.log("가이드 생성 시작:", software);
      const guideResponse = await this.generateGuideWithScreenshot(software, question, screenshotData);
      
      // 생성된 가이드를 화면에 표시
      console.log("가이드 표시 시작...");
      await this.showGuide(guideResponse);
      console.log("가이드 표시 완료");

      
    } catch (error) {
      console.error('Error processing software guide with screenshot:', error);
      
      // 오류 발생 시 기본 가이드 표시
      await this.processSoftwareGuide(software, question);
    }
  }

  // 기존 메서드 - 스크린샷 없이 가이드 처리
  public async processSoftwareGuide(software: string, question: string): Promise<void> {
    if (!this.appState.guideEnabled) {
      console.warn('Guide mode is disabled');
      return;
    }

    const guideData = await this.requestGuide(software, question);
    if (guideData && !guideData.error) {
      await this.showGuide(guideData);
    }
  }

  // 스크린샷 포함 가이드 생성 (추후 실제 AI 서비스 연동)
  // private async generateGuideWithScreenshot(
  //   software: string, 
  //   question: string, 
  //   screenshotData: string
  // ): Promise<any> {
  //   // 여기에 실제 LLM API 호출 구현
  //   console.log(`Generating guide for ${software} with screenshot...`);
    
  //   // 현재는 더미 데이터 반환
  //   return {
  //     software,
  //     question,
  //     steps: [
  //       {
  //         id: '1',
  //         title: `${software} - ${question}`,
  //         description: `스크린샷을 분석한 결과입니다. (실제 AI 응답 대신 임시 텍스트)`,
  //         x: 100,
  //         y: 100,
  //         width: 350,
  //         height: 200,
  //         type: 'tooltip',
  //         shortcut: this.getSoftwareShortcut(software)
  //       }
  //     ]
  //   };
  // }
  private async generateGuideWithScreenshot(
    software: string, 
    question: string, 
    screenshotData: string
  ): Promise<any> {
    try {
      // AI 서비스 사용
      console.log(`Generating guide for ${software} with screenshot using AI service...`);
      return await aiService.generateGuide({
        software,
        question,
        screenshotData
      });
    } catch (error) {
      console.error('AI guide generation error:', error);
      
      // 오류 시 기본 가이드 반환
      return {
        software,
        question,
        steps: [
          {
            id: '1',
            title: `${software} - ${question}`,
            description: `AI 서비스 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n기본 가이드를 표시합니다.`,
            x: 100,
            y: 100,
            width: 350,
            height: 200,
            type: 'tooltip',
            shortcut: this.getSoftwareShortcut(software)
          }
        ]
      };
    }
  }




  // 소프트웨어별 기본 단축키 반환
  private getSoftwareShortcut(software: string): string {
    const shortcuts: Record<string, string> = {
      'photoshop': 'Ctrl+Shift+N',
      'vscode': 'Ctrl+N',
      'excel': 'Ctrl+N',
      'word': 'Ctrl+N',
      'chrome': 'Ctrl+T',
      'firefox': 'Ctrl+T'
    };
    
    return shortcuts[software.toLowerCase()] || 'Ctrl+N';
  }

  // 가이드 표시
  private async showGuide(guideData: any): Promise<{ success: boolean; error?: string }> {
    if (!this.appState.guideEnabled) {
      return { success: false, error: 'Guide mode is disabled' };
    }

    try {
      // 기존 오버레이 정리
      await this.clearAllOverlays();

      // 새 가이드 오버레이 생성
      if (guideData && guideData.steps) {
        for (const step of guideData.steps) {
          const overlayId = `guide-${step.id || Math.random().toString(36)}`;
          const overlay = await this.createOverlayWindow({
            x: step.x || 100,
            y: step.y || 100,
            width: step.width || 300,
            height: step.height || 200,
            content: this.generateGuideHTML(step),
            id: overlayId
          });

          this.appState.overlayWindows.set(overlayId, overlay);
        }
      }

      // 메인 윈도우에 가이드 시작 알림
      if (this.mainWindow) {
        this.mainWindow.webContents.send('guide-started', guideData);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error showing software guide:', error);
      return { success: false, error: error.message };
    }
  }

  // 오버레이 윈도우 생성
  private async createOverlayWindow(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
    id: string;
  }): Promise<BrowserWindow> {
    const overlay = new BrowserWindow({
      width: options.width,
      height: options.height,
      x: options.x,
      y: options.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false, // 개발자 도구 명시적으로 비활성화
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
      }
    });

    // HTML 로드
    overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(options.content)}`);

    // 오버레이 윈도우 이벤트 처리
    overlay.on('closed', () => {
      this.appState.overlayWindows.delete(options.id);
    });

    return overlay;
  }

  // 모든 오버레이 정리
  public async clearAllOverlays(): Promise<void> {
    for (const [id, window] of this.appState.overlayWindows) {
      if (!window.isDestroyed()) {
        window.close();
      }
    }
    this.appState.overlayWindows.clear();

    // 메인 윈도우에 가이드 종료 알림
    if (this.mainWindow) {
      this.mainWindow.webContents.send('guide-completed');
    }
  }

  // 활성 윈도우 감지
  private async getActiveWindow(): Promise<any> {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        // PowerShell 스크립트 수정 - JSON 형식으로 확실히 출력하도록
        const script = `
          Add-Type -AssemblyName System.Windows.Forms
          $active = Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Sort-Object CPU -Descending | Select-Object -First 1
          if ($active) {
            $result = @{
              ProcessName = $active.ProcessName
              WindowTitle = $active.MainWindowTitle
              Id = $active.Id
            }
            ConvertTo-Json -InputObject $result -Compress
          } else {
            Write-Output "{\"ProcessName\": \"unknown\", \"WindowTitle\": \"unknown\", \"Id\": 0}"
          }
        `;
        
        const result = execSync(`powershell -command "${script}"`, { encoding: 'utf8' });
        console.log("PowerShell result:", result); // 디버깅용 로그 추가
        
        // JSON 파싱 전에 결과 유효성 확인
        if (!result || result.trim() === '') {
          return {
            processName: "unknown",
            windowTitle: "unknown",
            id: 0,
            software: "unknown"
          };
        }
        
        try {
          const data = JSON.parse(result.toString().trim());
          return {
            processName: data.ProcessName || "unknown",
            windowTitle: data.WindowTitle || "unknown",
            id: data.Id || 0,
            software: this.identifySoftware(data.ProcessName || "", data.WindowTitle || "")
          };
        } catch (parseError) {
          console.error("JSON 파싱 오류:", parseError, "원본 데이터:", result);
          return {
            processName: "unknown",
            windowTitle: "unknown",
            id: 0,
            software: "unknown"
          };
        }
      } catch (error) {
        console.error('Error detecting active window:', error);
        // 기본값 반환하여 오류 방지
        return {
          processName: "unknown",
          windowTitle: "unknown",
          id: 0,
          software: "unknown"
        };
      }
    }
  
    // macOS 및 Linux는 추후 구현
    return {
      processName: "unknown",
      windowTitle: "unknown",
      id: 0,
      software: "unknown"
    };
  }

  // 소프트웨어 식별
  private identifySoftware(processName: string, windowTitle: string): string {
    const process = processName.toLowerCase();
    const title = windowTitle.toLowerCase();

    const softwareMap: Record<string, string> = {
      'photoshop': 'photoshop',
      'ps': 'photoshop',
      'adobe photoshop': 'photoshop',
      'code': 'vscode',
      'vscode': 'vscode',
      'visual studio code': 'vscode',
      'excel': 'excel',
      'winword': 'word',
      'word': 'word',
      'chrome': 'chrome',
      'firefox': 'firefox',
      'figma': 'figma',
      'sketch': 'sketch',
      'blender': 'blender',
      'unity': 'unity',
      'unreal': 'unreal'
    };

    // 프로세스 이름으로 확인
    for (const [key, value] of Object.entries(softwareMap)) {
      if (process.includes(key) || title.includes(key)) {
        return value;
      }
    }

    return 'unknown';
  }

  // 소프트웨어별 가이드 요청
  private async requestGuide(software: string, question: string): Promise<any> {
    if (!this.appState.guideEnabled) {
      return { error: 'Guide mode is disabled' };
    }
  
    try {
      // AI 서비스 사용 (스크린샷 없는 버전)
      console.log(`Requesting guide for ${software} without screenshot...`);
      return await aiService.generateGuide({
        software,
        question
      });
    } catch (error) {
      console.error('Error requesting software guide:', error);
      
      // 오류 시 백업용 더미 가이드
      return {
        software,
        question,
        steps: [
          {
            id: '1',
            title: `${software} 가이드`,
            description: `${question}에 대한 답변입니다.`,
            x: 100,
            y: 100,
            width: 300,
            height: 150,
            type: 'tooltip',
            shortcut: this.getSoftwareShortcut(software)
          }
        ]
      };
    }
  }

  // 오버레이 위치 업데이트
  private async updateOverlayPositions(windowBounds: any): Promise<{ success: boolean }> {
    // 활성 윈도우가 이동했을 때 오버레이들도 같이 이동
    // TODO: 구현 필요
    return { success: true };
  }

  // 가이드 HTML 생성
// SoftwareGuideProcessingHelper.ts 파일의 generateGuideHTML 메서드에서 
// 화살표 CSS 수정 및 위치 옵션 추가

private generateGuideHTML(step: any): string {
  const stepType = step.type || 'tooltip';
  const arrowPosition = step.arrowPosition || 'top'; 
  
  // 설명 길이에 따라 높이 동적 조정 (최소 150px, 최대 400px)
  const descriptionLength = (step.description || '').length;
  const dynamicHeight = Math.min(400, Math.max(150, 100 + descriptionLength * 0.3));
  
  // 스텝 번호가 제공되면 사용, 아니면 ID 사용
  const stepNumber = step.stepNumber || step.id || '1';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          margin: 0;
          padding: 0;
          background: transparent;
          font-family: 'Segoe UI', Arial, sans-serif;
          overflow: hidden;
        }
        .guide-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 16px;
        }
        .guide-content {
          background: rgba(22, 22, 22, 0.95);
          color: white;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          border: 1px solid rgba(0, 255, 136, 0.3);
          animation: fadeIn 0.3s ease-out;
          max-width: 320px;
          width: 100%;
          position: relative;
          max-height: ${dynamicHeight}px;
          overflow-y: auto;
        }
        .guide-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          position: relative;
        }
        .step-badge {
          background: #00ff88;
          color: #111;
          width: 22px;
          height: 22px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 13px;
          margin-right: 8px;
          flex-shrink: 0;
        }
        .guide-title {
          font-size: 14px;
          font-weight: 600;
          color: #00ff88;
          flex-grow: 1;
          padding-right: 24px;
          line-height: 1.3;
        }
        .guide-description {
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 12px;
          white-space: pre-wrap;
          color: rgba(255, 255, 255, 0.9);
        }
        .guide-description code {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Consolas', monospace;
          font-size: 12px;
        }
        .guide-description pre {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .guide-description pre code {
          background: transparent;
          padding: 0;
        }
        .guide-shortcut {
          background: rgba(255, 255, 255, 0.1);
          padding: 6px 10px;
          border-radius: 4px;
          font-family: 'Consolas', monospace;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
        }
        .shortcut-icon {
          margin-right: 6px;
          font-size: 14px;
          opacity: 0.7;
        }
        .close-btn {
          position: absolute;
          top: 0;
          right: 0;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          width: 20px;
          height: 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
        }
        /* 스크롤바 스타일 */
        .guide-content::-webkit-scrollbar {
          width: 4px;
        }
        .guide-content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .guide-content::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 136, 0.3);
          border-radius: 2px;
        }
        .guide-content::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 136, 0.5);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    </head>
    <body>
      <div class="guide-container">
        <div class="guide-content">
          <div class="guide-header">
            <div class="step-badge">${stepNumber}</div>
            ${step.title ? `<div class="guide-title">${step.title}</div>` : ''}
            <button class="close-btn" onclick="window.close()">×</button>
          </div>
          <div class="guide-description">${this.formatDescription(step.description || '가이드를 확인하세요')}</div>
          ${step.shortcut ? `
            <div class="guide-shortcut">
              <span class="shortcut-icon">⌨</span>
              ${step.shortcut}
            </div>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

// 설명 텍스트 포맷팅 (코드 블록 등 처리)
private formatDescription(text: string): string {
  // 코드 블록 처리 (```code```)
  let formatted = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // 인라인 코드 처리 (`code`)
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 마크다운 링크 처리 ([text](url))
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#00ff88;text-decoration:none;">$1</a>');
  
  // 자동 줄바꿈 처리
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}
  // 정리 메서드 (앱 종료 시 호출)
  public async cleanup(): Promise<void> {
    // 모든 handler 해제
    try {
      const handlersToRemove = [
        'toggle-guide-mode',
        'get-app-mode', 
        'show-software-guide',
        'clear-guide-overlays',
        'get-active-window',
        'request-software-guide',
        'update-overlay-positions'
      ];

      handlersToRemove.forEach(channel => {
        try {
          ipcMain.removeHandler(channel);
          console.log(`Handler removed: ${channel}`);
        } catch (error) {
          console.error(`Error removing handler ${channel}:`, error);
        }
      });

      this.handlersRegistered = false;
    } catch (error) {
      console.error('Error cleaning up handlers:', error);
    }

    // 모든 오버레이 윈도우 닫기
    await this.clearAllOverlays();
  }
}