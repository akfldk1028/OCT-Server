// ipcHandlers.ts - MCP 핸들러와 인터뷰 코더 핸들러 병합

import { ipcMain } from "electron"
import { IIpcHandlerDeps } from "./main"

export function initializeIpcHandlers(deps: IIpcHandlerDeps): void {
  console.log("Initializing IPC handlers (MCP + Interview Coder)")

  // ===== 기존 인터뷰 코더 핸들러들 =====

  // Credits handlers
  ipcMain.handle("set-initial-credits", async (_event, credits: number) => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      await mainWindow.webContents.executeJavaScript(
        `window.__CREDITS__ = ${credits}`
      )
      mainWindow.webContents.send("credits-updated", credits)
    } catch (error) {
      console.error("Error setting initial credits:", error)
      throw error
    }
  })

  ipcMain.handle("decrement-credits", async () => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      const currentCredits = await mainWindow.webContents.executeJavaScript(
        "window.__CREDITS__"
      )
      if (currentCredits > 0) {
        const newCredits = currentCredits - 1
        await mainWindow.webContents.executeJavaScript(
          `window.__CREDITS__ = ${newCredits}`
        )
        mainWindow.webContents.send("credits-updated", newCredits)
      }
    } catch (error) {
      console.error("Error decrementing credits:", error)
    }
  })

  // Screenshot queue handlers
  ipcMain.handle("get-screenshot-queue", () => {
    return deps.getScreenshotQueue()
  })

  ipcMain.handle("get-extra-screenshot-queue", () => {
    return deps.getExtraScreenshotQueue()
  })

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return deps.deleteScreenshot(path)
  })

  ipcMain.handle("get-image-preview", async (event, path: string) => {
    return deps.getImagePreview(path)
  })

  // Screenshot processing handlers
  ipcMain.handle("process-screenshots", async () => {
    await deps.processingHelper?.processScreenshots()
  })

  // Window dimension handlers
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        deps.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle(
    "set-window-dimensions",
    (event, width: number, height: number) => {
      deps.setWindowDimensions(width, height)
    }
  )

  // Screenshot management handlers
  ipcMain.handle("get-screenshots", async () => {
    try {
      let previews = []
      const currentView = deps.getView()

      if (currentView === "queue") {
        const queue = deps.getScreenshotQueue()
        previews = await Promise.all(
          queue.map(async (path) => ({
            path,
            preview: await deps.getImagePreview(path)
          }))
        )
      } else {
        const extraQueue = deps.getExtraScreenshotQueue()
        previews = await Promise.all(
          extraQueue.map(async (path) => ({
            path,
            preview: await deps.getImagePreview(path)
          }))
        )
      }

      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  // Screenshot trigger handlers
  ipcMain.handle("trigger-screenshot", async () => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      try {
        const screenshotPath = await deps.takeScreenshot()
        const preview = await deps.getImagePreview(screenshotPath)
        mainWindow.webContents.send("screenshot-taken", {
          path: screenshotPath,
          preview
        })
        return { success: true }
      } catch (error) {
        console.error("Error triggering screenshot:", error)
        return { error: "Failed to trigger screenshot" }
      }
    }
    return { error: "No main window available" }
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await deps.takeScreenshot()
      const preview = await deps.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      return { error: "Failed to take screenshot" }
    }
  })

  // Window management handlers
  ipcMain.handle("toggle-window", () => {
    try {
      deps.toggleMainWindow()
      return { success: true }
    } catch (error) {
      console.error("Error toggling window:", error)
      return { error: "Failed to toggle window" }
    }
  })

  ipcMain.handle("reset-queues", async () => {
    try {
      deps.clearQueues()
      return { success: true }
    } catch (error) {
      console.error("Error resetting queues:", error)
      return { error: "Failed to reset queues" }
    }
  })

  // Process screenshot handlers
  ipcMain.handle("trigger-process-screenshots", async () => {
    try {
      await deps.processingHelper?.processScreenshots()
      return { success: true }
    } catch (error) {
      console.error("Error processing screenshots:", error)
      return { error: "Failed to process screenshots" }
    }
  })

  // Reset handlers
  ipcMain.handle("trigger-reset", () => {
    try {
      // First cancel any ongoing requests
      deps.processingHelper?.cancelOngoingRequests()

      // Clear all queues immediately
      deps.clearQueues()

      // Reset view to queue
      deps.setView("queue")

      // Get main window and send reset events
      const mainWindow = deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Send reset events in sequence
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }

      return { success: true }
    } catch (error) {
      console.error("Error triggering reset:", error)
      return { error: "Failed to trigger reset" }
    }
  })

  // Window movement handlers
  ipcMain.handle("trigger-move-left", () => {
    try {
      deps.moveWindowLeft()
      return { success: true }
    } catch (error) {
      console.error("Error moving window left:", error)
      return { error: "Failed to move window left" }
    }
  })

  ipcMain.handle("trigger-move-right", () => {
    try {
      deps.moveWindowRight()
      return { success: true }
    } catch (error) {
      console.error("Error moving window right:", error)
      return { error: "Failed to move window right" }
    }
  })

  ipcMain.handle("trigger-move-up", () => {
    try {
      deps.moveWindowUp()
      return { success: true }
    } catch (error) {
      console.error("Error moving window up:", error)
      return { error: "Failed to move window up" }
    }
  })

  ipcMain.handle("trigger-move-down", () => {
    try {
      deps.moveWindowDown()
      return { success: true }
    } catch (error) {
      console.error("Error moving window down:", error)
      return { error: "Failed to move window down" }
    }
  })

  // ===== 기존 MCP 서버 핸들러들 유지 =====

  // MCP 서버 상태 조회
  ipcMain.handle('server:getStatus', async () => {
    try {
      const allServers = await Promise.all(
        deps.mcpManager.getAllServers().map(server =>
          deps.mcpManager.getServerStatus(server.name)
        )
      );
      return allServers.filter(server =>
        server && server.name !== 'local-express-server'
      );
    } catch (error) {
      console.error('서버 상태 조회 오류:', error);
      return { error: '서버 상태 조회 실패' };
    }
  });

  // 전체 서버 설정 정보 조회
  ipcMain.handle('server:getFullConfigs', async () => {
    try {
      const allServers = deps.mcpManager.getAllServersWithFullConfig();
      return allServers.filter(server => server.name !== 'local-express-server');
    } catch (error) {
      console.error('서버 전체 설정 조회 오류:', error);
      return { error: '서버 전체 설정 조회 실패' };
    }
  });

  // MCP 서버 시작
  ipcMain.handle('server:start', async (_, name) => {
    try {
      if (!name || name === 'undefined' || typeof name !== 'string') {
        console.error(`유효하지 않은 서버 시작 요청: "${name}"`);
        return { success: false, message: '유효한 서버 이름이 필요합니다.' };
      }

      const server = deps.mcpManager.getServer(name);
      if (!server) {
        console.error(`존재하지 않는 서버(${name}) 시작 요청`);
        return { success: false, message: `서버 '${name}'을 찾을 수 없습니다.` };
      }

      console.log(`[ipcHandlers] 서버 시작 요청: ${name}`);
      await deps.mcpManager.startServer(name);
      return { success: true, message: `${name} 서버가 시작되었습니다.` };
    } catch (error) {
      console.error(`${name || 'unknown'} 서버 시작 오류:`, error);
      return {
        success: false,
        message: `${name || 'unknown'} 서버 시작 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  });

  // MCP 서버 중지
  ipcMain.handle('server:stop', async (_, name) => {
    try {
      await deps.mcpManager.stopServer(name);
      return { success: true, message: `${name} 서버가 중지되었습니다.` };
    } catch (error) {
      console.error(`${name} 서버 중지 오류:`, error);
      return { success: false, error: `${name} 서버 중지 실패` };
    }
  });

  // ===== 소프트웨어 가이드 관련 핸들러들 =====

  // 가이드 처리 요청 (SoftwareGuideProcessingHelper 연동)
  ipcMain.handle("process-software-guide", async (_, { software, question }) => {
    try {
      if (deps.softwareGuideProcessingHelper) {
        await deps.softwareGuideProcessingHelper.processSoftwareGuide(software, question)
        return { success: true }
      } else {
        return { error: "Software guide processing helper not available" }
      }
    } catch (error) {
      console.error("Error in process-software-guide:", error)
      return { error: "Failed to process software guide" }
    }
  })

  // 커스텀 질문 모달 관련 핸들러
  ipcMain.handle("submit-guide-question", async (_, { software, question }) => {
    try {
      // SoftwareGuideProcessingHelper를 통해 처리
      if (deps.softwareGuideProcessingHelper) {
        await deps.softwareGuideProcessingHelper.processSoftwareGuide(software, question)
        return { success: true }
      } else {
        return { error: "Processing helper not available" }
      }
    } catch (error) {
      console.error("Error processing guide question:", error)
      return { error: "Failed to process guide question" }
    }
  })
}
