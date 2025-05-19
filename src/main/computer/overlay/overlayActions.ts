// src/main/store/overlayActions.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { GuideStep } from '@/common/types/overlay-types';

export function addOverlayActions(set: (state: any) => void, get: () => any) {
  return {
    // 0) 활성 소프트웨어 감지
    DETECT_ACTIVE_SOFTWARE: async () => {
      if (process.platform === 'win32') {
        try {
          const { execSync } = require('child_process');
          const fs = require('fs');
          const tempDir = app.getPath('temp');
          const scriptPath = path.join(tempDir, `detect_window_${Date.now()}.ps1`);

          const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$active = Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Sort-Object CPU -Descending | Select-Object -First 1
if ($active) { $result=@{ProcessName=$active.ProcessName;WindowTitle=$active.MainWindowTitle;Id=$active.Id};ConvertTo-Json -InputObject $result -Compress } else { Write-Output '{"ProcessName":"unknown","WindowTitle":"unknown","Id":0}' }
`;
          fs.writeFileSync(scriptPath, psScript);
          const result = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { encoding: 'utf8', windowsHide: true });
          fs.unlinkSync(scriptPath);
          const data = JSON.parse(result.trim());
          const software = identifySoftware(data.ProcessName, data.WindowTitle);
          set({ activeSoftware: software });
          return { processName: data.ProcessName||'unknown', windowTitle: data.WindowTitle||'unknown', id: data.Id||0, software };
        } catch {
          set({ activeSoftware: 'unknown' });
          return { processName:'unknown', windowTitle:'unknown', id:0, software:'unknown' };
        }
      }
      return { processName:'unknown', windowTitle:'unknown', id:0, software:'unknown' };
    },

    // 1) SHOW_GUIDE: 전체 스텝 오버레이 한 번에 표시
    // 1) SHOW_GUIDE: 전체 스텝 오버레이 한 번에 표시 + 하이라이트
    SHOW_GUIDE: async (guideData: { software: string; steps: GuideStep[] }) => {
      const laidOut = autoLayout(guideData.steps);
      const newWindows = new Map<string, BrowserWindow>();
      for (const step of laidOut) {
        const win = await createOverlayWindow({
          id: `guide-${step.id}`,
          x: step.x, y: step.y,
          width: step.width, height: step.height,
          content: generateGuideHTML(step),
        });
        // 각 오버레이 닫을 때 다음 스텝 자동 실행
        win.on('closed', () => {
          const { overlayWindows, guideSteps, currentStepIndex } = get();
          // 다음 스텝이 남아 있으면 이동
          if (currentStepIndex < guideSteps.length - 1) {
            get().NEXT_STEP();
          } else {
            // 마지막 스텝 닫으면 가이드 종료
            get().END_GUIDE();
          }
        });
        newWindows.set(`guide-${step.id}`, win);
      }
      set({ guideSteps: laidOut, overlayWindows: newWindows, currentStepIndex: 0, activeSoftware: guideData.software });
      // 첫 스텝 하이라이트
      highlightOverlays(newWindows, laidOut, 0);
      return { success: true };
    },

    // 2) NEXT_STEP: 다음 스텝으로 이동하며 하이라이트 조정
    NEXT_STEP: async () => {
      const { guideSteps, currentStepIndex, overlayWindows } = get();
      if (currentStepIndex < guideSteps.length - 1) {
        const newIndex = currentStepIndex + 1;
        set({ currentStepIndex: newIndex });
        highlightOverlays(overlayWindows, guideSteps, newIndex);
      }
    },

    // 3) PREV_STEP: 이전 스텝으로 이동하며 하이라이트 조정
    PREV_STEP: async () => {
      const { guideSteps, currentStepIndex, overlayWindows } = get();
      if (currentStepIndex > 0) {
        const newIndex = currentStepIndex - 1;
        set({ currentStepIndex: newIndex });
        highlightOverlays(overlayWindows, guideSteps, newIndex);
      }
    },

    // 4) END_GUIDE: 전체 종료
    END_GUIDE: async () => {
      const { overlayWindows } = get();
      for (const win of overlayWindows.values()) win.close();
      set({ overlayWindows: new Map(), guideSteps: [], currentStepIndex: 0 });
    },

    // 5) CLEAR_GUIDE_OVERLAYS: 임시 정리
    CLEAR_GUIDE_OVERLAYS: async () => {
      const { overlayWindows } = get();
      for (const win of overlayWindows.values()) win.close();
      set({ overlayWindows: new Map() });
    },
  };
}

// 하이라이트 유틸: 현재 스텝만 불투명, 나머지는 반투명
// 하이라이트 유틸: 현재 스텝만 불투명 및 색상 변경
// 하이라이트 유틸: 현재 스텝만 불투명 및 색상 변경
function highlightOverlays(
  overlayWindows: Map<string, BrowserWindow>,
  guideSteps: GuideStep[],
  currentIndex: number
) {
  const currentId = `guide-${guideSteps[currentIndex].id}`;
  for (const [key, win] of overlayWindows.entries()) {
    // 투명도 제어
    try {
      win.setOpacity(key === currentId ? 1 : 0.5);
    } catch {}
    // CSS 삽입으로 스타일 전환
    try {
      if (win.webContents) {
        if (key === currentId) {
          win.webContents.insertCSS(`
            .guide-content { border: 2px solid hotpink !important; }
            .step-badge { background: hotpink !important; }
            .guide-title, .guide-description, .guide-shortcut { color: hotpink !important; }
            .close-btn { color: hotpink !important; }
          `);
        } else {
          win.webContents.insertCSS(`
            .guide-content { border: 1px solid rgba(0,255,136,0.3) !important; }
            .step-badge { background: rgba(0,255,136,0.3) !important; }
            .guide-title, .guide-description, .guide-shortcut { color: rgba(0,255,136,0.9) !important; }
            .close-btn { color: rgba(0,255,136,0.9) !important; }
          `);
        }
      }
    } catch {}
  }
}




// 자동 배치: 겹침 감지 후 y축으로 분리
function autoLayout(steps: GuideStep[]): GuideStep[] {
  const placed: GuideStep[] = [];
  const margin = 10;
  for (const s of steps) {
    let { x, y, width, height } = s;
    for (const p of placed) {
      const overlapX = x < p.x + p.width + margin && p.x < x + width + margin;
      const overlapY = y < p.y + p.height + margin && p.y < y + height + margin;
      if (overlapX && overlapY) y = p.y + p.height + margin;
    }
    placed.push({ ...s, x, y });
  }
  return placed;
}


// 오버레이 윈도우 생성
async function createOverlayWindow(options: { id: string; x: number; y: number; width: number; height: number; content: string; }): Promise<BrowserWindow> {
  const overlay = new BrowserWindow({
    width: options.width, height: options.height,
    x: options.x, y: options.y,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, focusable: false, resizable: false,
    movable: false, minimizable: false, maximizable: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, devTools: false,
      preload: app.isPackaged ? path.join(__dirname,'preload.js') : path.join(__dirname,'../../.erb/dll/preload.js'),
    },
  });
  overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(options.content)}`);
  return overlay;
}

  // 가이드 HTML 생성 함수
  function generateGuideHTML(step: GuideStep): string {
    const stepType = step.type || 'tooltip';
    const arrowPosition = step.arrowPosition || 'top';

    // 설명 길이에 따라 높이 동적 조정 (최소 150px, 최대 400px)
    const descriptionLength = (step.description || '').length;
    const dynamicHeight = Math.min(
      400,
      Math.max(150, 100 + descriptionLength * 0.3),
    );

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
          <div class="guide-description">${formatDescription(step.description || '가이드를 확인하세요')}</div>
          ${
            step.shortcut
              ? `
            <div class="guide-shortcut">
              <span class="shortcut-icon">⌨</span>
              ${step.shortcut}
            </div>
          `
              : ''
          }
        </div>
      </div>
    </body>
    </html>
  `;
  }

  function formatDescription(text: string): string {
    let formatted = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }
  
  // 소프트웨어 식별
  function identifySoftware(processName: string, windowTitle: string): string {
    const proc = processName.toLowerCase();
    const title = windowTitle.toLowerCase();
    const map: Record<string,string> = {
      photoshop: 'photoshop', vscode: 'vscode', chrome: 'chrome', firefox: 'firefox',
      excel: 'excel', word: 'word', figma: 'figma', sketch: 'sketch', unity: 'unity', unreal: 'unreal',
    };
    for (const key in map) {
      if (proc.includes(key) || title.includes(key)) return map[key];
    }
    return 'unknown';
  }
