// src/main/store/overlayActions.ts
import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { GuideStep } from '../../stores/overlay/overlay-types';

export function addOverlayActions(set: (state: any) => void, get: () => any) {
  // 🔥 창 이동 추적 인터벌
  let windowTrackingInterval: NodeJS.Timeout | null = null;
  
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

    // 1) SHOW_GUIDE: 전체 스텝 오버레이 한 번에 표시 + 창 추적
    SHOW_GUIDE: async (guideData: { software: string; steps: GuideStep[] }) => {
      // 기존 오버레이 정리
      await get().CLEAR_GUIDE_OVERLAYS();
      
      // 창 추적 중지
      if (windowTrackingInterval) {
        clearInterval(windowTrackingInterval);
        windowTrackingInterval = null;
      }
      
      const laidOut = autoLayout(guideData.steps);
      const newWindows = new Map<string, BrowserWindow>();
      
      // 🔥 현재 창 정보 가져오기
      const { combinedStore } = require('../../stores/combinedStore');
      const windowState = combinedStore.getState().window;
      const targetWindow = windowState?.targetWindowInfo;
      
      console.log('🎯 [SHOW_GUIDE] 창 정보:', {
        hasTargetWindow: !!targetWindow,
        windowName: targetWindow?.name,
        windowPos: targetWindow ? { x: targetWindow.x, y: targetWindow.y } : null
      });
      
      for (const step of laidOut) {
        const win = await createOverlayWindow({
          id: `guide-${step.id}`,
          x: step.x,
          y: step.y,
          width: step.width,
          height: step.height,
          content: generateGuideHTML(step),
          metadata: step.metadata // 창 정보 전달
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
      
      set({ 
        guideSteps: laidOut, 
        overlayWindows: newWindows, 
        currentStepIndex: 0, 
        activeSoftware: guideData.software 
      });
      
      // 첫 스텝 하이라이트
      highlightOverlays(newWindows, laidOut, 0);
      
      // 🔥 창 이동 추적 시작 (선택된 창이 있을 때만)
      if (targetWindow) {
        // 원본 창 정보 복사 (참조가 아닌 값 복사)
        const originalWindowInfo = {
          id: targetWindow.id,
          x: targetWindow.x,
          y: targetWindow.y,
          width: targetWindow.width,
          height: targetWindow.height
        };
        
        windowTrackingInterval = setInterval(async () => {
          await updateOverlayPositions(get, originalWindowInfo);
        }, 100); // 100ms마다 체크
        
        console.log('🔄 [SHOW_GUIDE] 창 추적 시작');
      }
      
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
      if (windowTrackingInterval) {
        clearInterval(windowTrackingInterval);
        windowTrackingInterval = null;
        console.log('🔄 [END_GUIDE] 창 추적 중지');
      }
      
      const { overlayWindows } = get();
      for (const win of overlayWindows.values()) {
        if (!win.isDestroyed()) win.close();
      }
      set({ overlayWindows: new Map(), guideSteps: [], currentStepIndex: 0 });
    },

    // 5) CLEAR_GUIDE_OVERLAYS: 임시 정리
    CLEAR_GUIDE_OVERLAYS: async () => {
      if (windowTrackingInterval) {
        clearInterval(windowTrackingInterval);
        windowTrackingInterval = null;
      }
      
      const { overlayWindows } = get();
      for (const win of overlayWindows.values()) {
        if (!win.isDestroyed()) win.close();
      }
      set({ overlayWindows: new Map() });
    },
  };
}

// 🔥 창 위치 업데이트 함수 (targetWindow 기준으로 개선)
async function updateOverlayPositions(get: () => any, originalWindow: any) {
  try {
    const { combinedStore } = require('../../stores/combinedStore');
    const currentWindowState = combinedStore.getState().window;
    const currentWindow = currentWindowState?.targetWindowInfo;
    
    if (!currentWindow || currentWindow.id !== originalWindow.id) {
      console.log('⚠️ [updateOverlayPositions] 창이 변경되었거나 없음');
      return; // 창이 변경되었으면 중지
    }
    
    // 창 위치가 변경되었는지 확인
    const deltaX = currentWindow.x - originalWindow.x;
    const deltaY = currentWindow.y - originalWindow.y;
    
    if (deltaX !== 0 || deltaY !== 0) {
      console.log('🔄 [updateOverlayPositions] 창 이동 감지:', { deltaX, deltaY });
      
      const { overlayWindows, guideSteps } = get();
      
      // 모든 오버레이 위치 업데이트
      guideSteps.forEach((step: GuideStep, index: number) => {
        const overlayId = `guide-${step.id}`;
        const win = overlayWindows.get(overlayId);
        
        if (win && !win.isDestroyed()) {
          let newX, newY;
          
          // 🔥 metadata가 있으면 상대 좌표 기반으로 재계산
          if (step.metadata?.isWindowBased && step.metadata?.relativeX !== undefined) {
            // 창 기준 상대 좌표로 새 위치 계산
            newX = currentWindow.x + step.metadata.relativeX;
            newY = currentWindow.y + step.metadata.relativeY;
            
            console.log(`📍 [updateOverlayPositions] Step ${step.id}: 상대 좌표 기반 이동`, {
              relativeX: step.metadata.relativeX,
              relativeY: step.metadata.relativeY,
              newX,
              newY
            });
          } else {
            // 단순 delta 적용 (기존 방식)
            newX = step.x + deltaX;
            newY = step.y + deltaY;
            
            console.log(`📍 [updateOverlayPositions] Step ${step.id}: delta 기반 이동`, {
              deltaX,
              deltaY,
              newX,
              newY
            });
          }
          
          // 🔥 targetWindow 경계 체크 (화면 경계가 아닌 창 경계)
          const windowMaxX = currentWindow.x + currentWindow.width - (step.width || 340) - 10;
          const windowMaxY = currentWindow.y + currentWindow.height - (step.height || 200) - 10;
          const windowMinX = currentWindow.x + 10;
          const windowMinY = currentWindow.y + 10;
          
          // 창 경계 내에서만 배치
          const finalX = Math.max(windowMinX, Math.min(newX, windowMaxX));
          const finalY = Math.max(windowMinY, Math.min(newY, windowMaxY));
          
          // 화면 경계도 체크 (최종 안전장치)
          const primaryDisplay = screen.getPrimaryDisplay();
          const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
          const screenSafeX = Math.max(0, Math.min(finalX, screenWidth - (step.width || 340)));
          const screenSafeY = Math.max(0, Math.min(finalY, screenHeight - (step.height || 200)));
          
          win.setPosition(screenSafeX, screenSafeY);
          
          // step의 위치도 업데이트 (다음 이동을 위해)
          step.x = screenSafeX;
          step.y = screenSafeY;
          
          // 🔥 metadata도 업데이트 (상대 좌표 유지)
          if (step.metadata?.isWindowBased) {
            step.metadata.relativeX = screenSafeX - currentWindow.x;
            step.metadata.relativeY = screenSafeY - currentWindow.y;
            step.metadata.windowX = currentWindow.x;
            step.metadata.windowY = currentWindow.y;
          }
        }
      });
      
      // 원본 창 정보 업데이트
      originalWindow.x = currentWindow.x;
      originalWindow.y = currentWindow.y;
      originalWindow.width = currentWindow.width;
      originalWindow.height = currentWindow.height;
    }
  } catch (error) {
    console.error('❌ [updateOverlayPositions] 오류:', error);
  }
}

// 하이라이트 유틸: 현재 스텝만 불투명 및 색상 변경 (🔥 모던 스타일 적용)
function highlightOverlays(
  overlayWindows: Map<string, BrowserWindow>,
  guideSteps: GuideStep[],
  currentIndex: number
) {
  const currentId = `guide-${guideSteps[currentIndex].id}`;
  for (const [key, win] of overlayWindows.entries()) {
    if (win.isDestroyed()) continue;
    
    // 투명도 제어
    try {
      win.setOpacity(key === currentId ? 1 : 0.7);
    } catch {}
    
    // 🔥 CSS 클래스 기반 스타일 전환 (모던 디자인)
    try {
      if (win.webContents) {
        if (key === currentId) {
          // 현재 활성 스텝: active 클래스 추가
          win.webContents.insertCSS(`
            .guide-content { 
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%) !important;
              border: 2px solid #3b82f6 !important;
              box-shadow: 
                0 25px 50px -12px rgba(59, 130, 246, 0.25),
                0 0 0 1px rgba(59, 130, 246, 0.1) !important;
              transform: scale(1.02) !important;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .step-badge { 
              background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4) !important;
              animation: pulse 2s infinite !important;
            }
            .guide-title { 
              color: #3b82f6 !important; 
              font-weight: 700 !important;
            }
            .guide-description { 
              color: #1e293b !important; 
            }
            .close-btn { 
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
              color: white !important;
              border: 1px solid rgba(59, 130, 246, 0.3) !important;
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `);
        } else {
          // 비활성 스텝: inactive 클래스 추가
          win.webContents.insertCSS(`
            .guide-content { 
              background: linear-gradient(135deg, rgba(248, 250, 252, 0.7) 0%, rgba(241, 245, 249, 0.7) 100%) !important;
              border: 1px solid rgba(203, 213, 225, 0.6) !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
              transform: scale(0.98) !important;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .step-badge { 
              background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%) !important;
              box-shadow: 0 2px 8px rgba(148, 163, 184, 0.3) !important;
            }
            .guide-title { 
              color: #64748b !important; 
              font-weight: 600 !important;
            }
            .guide-description { 
              color: #94a3b8 !important; 
            }
            .close-btn { 
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
              color: #64748b !important;
              border: 1px solid rgba(203, 213, 225, 0.8) !important;
            }
          `);
        }
      }
    } catch (error) {
      console.warn('⚠️ [highlightOverlays] CSS 삽입 실패:', error);
    }
  }
}

// 🔥 간단한 배치: AI가 분석한 좌표를 선택된 창 위에 그대로 표시
function autoLayout(steps: GuideStep[]): GuideStep[] {
  // 🔥 선택된 창 정보 가져오기
  const { combinedStore } = require('../../stores/combinedStore');
  const windowState = combinedStore.getState().window;
  const targetWindow = windowState?.targetWindowInfo;
  
  if (!targetWindow) {
    console.log('⚠️ [autoLayout] 선택된 창이 없음, 화면 기준 배치');
    // 선택된 창이 없으면 화면 기준으로 배치
    return steps.map((step, index) => ({
      ...step,
      x: step.x || (100 + index * 50),
      y: step.y || (100 + index * 50),
      width: step.width || 340,
      height: step.height || 200
    }));
  }
  
  console.log('🎯 [autoLayout] 선택된 창 기준 배치:', {
    window: targetWindow.name,
    bounds: { x: targetWindow.x, y: targetWindow.y, width: targetWindow.width, height: targetWindow.height }
  });
  
  return steps.map((step, index) => {
    // 🔥 AI가 분석한 좌표를 창 위치에 더해서 절대 좌표로 변환
    const aiX = step.x || 50; // AI가 제공한 상대 좌표
    const aiY = step.y || 50;
    
    const absoluteX = targetWindow.x + aiX; // 창 위치 + AI 좌표
    const absoluteY = targetWindow.y + aiY;
    
    const overlayWidth = step.width || 340;
    const overlayHeight = step.height || 200;
    
    console.log(`📍 Step ${step.id}: AI 좌표 (${aiX}, ${aiY}) → 절대 좌표 (${absoluteX}, ${absoluteY})`);
    
    return {
      ...step,
      x: absoluteX,
      y: absoluteY,
      width: overlayWidth,
      height: overlayHeight,
      // 🔥 창 기준 metadata 추가
      metadata: {
        targetWindow: targetWindow.name,
        relativeX: aiX, // AI가 제공한 원본 상대 좌표
        relativeY: aiY,
        windowX: targetWindow.x,
        windowY: targetWindow.y,
        windowWidth: targetWindow.width,
        windowHeight: targetWindow.height,
        isWindowBased: true
      }
    };
  });
}

// 🔥 오버레이 윈도우 생성 (메타데이터 포함)
async function createOverlayWindow(options: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  metadata?: any;
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
      devTools: false,
      preload: app.isPackaged 
        ? path.join(__dirname, 'preload.js') 
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  
  overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(options.content)}`);
  
  console.log(`🎯 [createOverlayWindow]:`, {
    id: options.id,
    position: { x: options.x, y: options.y },
    size: { width: options.width, height: options.height },
    hasMetadata: !!options.metadata,
    metadata: options.metadata
  });
  
  return overlay;
}

// 가이드 HTML 생성 함수 (🔥 모던 디자인으로 변경)
function generateGuideHTML(step: GuideStep): string {
  const stepType = step.type || 'tooltip';
  const arrowPosition = step.arrowPosition || 'top';

  // 설명 길이에 따라 높이 동적 조정 (autoLayout과 동일한 로직)
  const descriptionLength = (step.description || '').length;
  const minHeight = 150;
  const dynamicHeight = Math.min(400, Math.max(minHeight, 100 + descriptionLength * 0.8));

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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', Arial, sans-serif;
          overflow: hidden;
        }
        .guide-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 12px;
        }
        .guide-content {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
          color: #1e293b;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(226, 232, 240, 0.8);
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          max-width: 340px;
          width: 100%;
          position: relative;
          min-height: 150px;
          max-height: ${dynamicHeight}px;
          overflow-y: auto;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .guide-header {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          position: relative;
        }
        .step-badge {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          margin-right: 12px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }
        .guide-title {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          flex-grow: 1;
          padding-right: 35px;
          line-height: 1.4;
          letter-spacing: -0.01em;
        }
        .guide-description {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 16px;
          white-space: pre-wrap;
          color: #475569;
          letter-spacing: -0.005em;
        }
        .guide-description code {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 3px 8px;
          border-radius: 6px;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-size: 13px;
          color: #3730a3;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .guide-description pre {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 16px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 12px 0;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
        }
        .guide-description pre code {
          background: transparent;
          padding: 0;
          color: #1e293b;
          border: none;
        }
        .guide-shortcut {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 10px 14px;
          border-radius: 8px;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #92400e;
          font-weight: 500;
        }
        .shortcut-icon {
          margin-right: 8px;
          font-size: 16px;
          opacity: 0.8;
        }
        .close-btn {
          position: absolute;
          top: -2px;
          right: -2px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border: 1px solid rgba(203, 213, 225, 0.8);
          color: #64748b;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-weight: 500;
        }
        .close-btn:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        /* 스크롤바 스타일 */
        .guide-content::-webkit-scrollbar {
          width: 6px;
        }
        .guide-content::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.5);
          border-radius: 3px;
        }
        .guide-content::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
          border-radius: 3px;
        }
        .guide-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
        }
        @keyframes slideInUp {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        /* 🔥 현재 활성 스텝 스타일 */
        .guide-content.active {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
          border: 2px solid #3b82f6;
          box-shadow: 
            0 25px 50px -12px rgba(59, 130, 246, 0.25),
            0 0 0 1px rgba(59, 130, 246, 0.1);
        }
        .guide-content.active .step-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
        .guide-content.active .guide-title {
          color: #3b82f6;
        }
        /* 🔥 비활성 스텝 스타일 */
        .guide-content.inactive {
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.7) 0%, rgba(241, 245, 249, 0.7) 100%);
          border: 1px solid rgba(203, 213, 225, 0.6);
          opacity: 0.6;
        }
        .guide-content.inactive .step-badge {
          background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
          box-shadow: 0 2px 8px rgba(148, 163, 184, 0.3);
        }
        .guide-content.inactive .guide-title {
          color: #64748b;
        }
        .guide-content.inactive .guide-description {
          color: #94a3b8;
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
              <span class="shortcut-icon">⌨️</span>
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

// 설명 텍스트 포맷팅
function formatDescription(text: string): string {
  let formatted = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#00ff88;text-decoration:none;">$1</a>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

// 소프트웨어 식별
function identifySoftware(processName: string, windowTitle: string): string {
  const proc = processName.toLowerCase();
  const title = windowTitle.toLowerCase();
  const map: Record<string, string> = {
    photoshop: 'photoshop',
    ps: 'photoshop',
    'adobe photoshop': 'photoshop',
    code: 'vscode',
    vscode: 'vscode',
    'visual studio code': 'vscode',
    excel: 'excel',
    winword: 'word',
    word: 'word',
    chrome: 'chrome',
    firefox: 'firefox',
    figma: 'figma',
    sketch: 'sketch',
    blender: 'blender',
    unity: 'unity',
    unreal: 'unreal',
    slack: 'slack',
    discord: 'discord',
    notion: 'notion',
    obsidian: 'obsidian',
  };
  
  for (const key in map) {
    if (proc.includes(key) || title.includes(key)) return map[key];
  }
  
  return 'unknown';
}