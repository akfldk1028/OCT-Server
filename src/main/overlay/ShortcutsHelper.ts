// ShortcutsHelper.ts - 소프트웨어 가이드 단축키 추가

import { globalShortcut, app } from "electron"
import { IShortcutsHelperDeps } from "./main"



export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps
  }

  public registerGlobalShortcuts(): void {
    // 기존 인터뷰 코더 단축키들
    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.deps.takeScreenshot()
          const preview = await this.deps.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    globalShortcut.register("CommandOrControl+Enter", async () => {
      await this.deps.processingHelper?.processScreenshots()
    })

    globalShortcut.register("CommandOrControl+R", () => {
      console.log("Command + R pressed. Canceling requests and resetting...")

      // Cancel ongoing API requests
      this.deps.processingHelper?.cancelOngoingRequests()

      // Clear both screenshot queues
      this.deps.clearQueues()

      console.log("Cleared queues.")

      // Update the view state to 'queue'
      this.deps.setView("queue")

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }
    })

    // 기존 윈도우 이동 단축키들
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.")
      this.deps.moveWindowLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.")
      this.deps.moveWindowRight()
    })

    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.")
      this.deps.moveWindowDown()
    })

    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.")
      this.deps.moveWindowUp()
    })

    globalShortcut.register("CommandOrControl+B", () => {
      this.deps.toggleMainWindow()
    })

    // ===== 새로운 소프트웨어 가이드 단축키들 =====

    // Ctrl+G: 소프트웨어 가이드 요청
    globalShortcut.register("CommandOrControl+G", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) return

      try {
        // 1. 현재 활성 소프트웨어 감지
        const activeWindow = await mainWindow.webContents.executeJavaScript(`
          window.api.overlay.getActiveWindow()
        `)

        if (activeWindow && activeWindow.software !== 'unknown') {
          console.log(`Active software detected: ${activeWindow.software}`)

          // 2. 기본 질문으로 가이드 요청
          const defaultQuestion = "기본 사용법 알려줘"

          // 3. 가이드 요청 및 표시
          const guideData = await mainWindow.webContents.executeJavaScript(`
            window.api.overlay.requestSoftwareGuide("${activeWindow.software}", "${defaultQuestion}")
              .then(data => window.api.overlay.showSoftwareGuide(data))
          `)

          console.log("Software guide displayed via Ctrl+G")
        } else {
          // 소프트웨어를 감지하지 못한 경우 알림
          mainWindow.webContents.send('guide-error', '활성 소프트웨어를 감지할 수 없습니다.')
        }
      } catch (error) {
        console.error('Error in Ctrl+G handler:', error)
      }
    })

    // Ctrl+Shift+G: 커스텀 질문으로 가이드 요청
    globalShortcut.register("CommandOrControl+Shift+G", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) return

      try {
        // 현재 활성 소프트웨어 감지
        const activeWindow = await mainWindow.webContents.executeJavaScript(`
          window.api.overlay.getActiveWindow()
        `)

        if (activeWindow && activeWindow.software !== 'unknown') {
          // 렌더러에 질문 입력 모달 표시 요청
          mainWindow.webContents.send('show-guide-question-modal', {
            software: activeWindow.software
          })
        } else {
          mainWindow.webContents.send('guide-error', '활성 소프트웨어를 감지할 수 없습니다.')
        }
      } catch (error) {
        console.error('Error in Ctrl+Shift+G handler:', error)
      }
    })

    // Ctrl+Shift+H: 소프트웨어 가이드 토글
    globalShortcut.register("CommandOrControl+Shift+H", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) return

      try {
        // 현재 가이드 모드 상태 확인
        const appMode = await mainWindow.webContents.executeJavaScript(`
          window.api.overlay.getAppMode()
        `)

        // 가이드 모드 토글
        const newMode = !appMode.guideEnabled
        await mainWindow.webContents.executeJavaScript(`
          window.api.overlay.toggleGuideMode(${newMode})
        `)

        console.log(`Guide mode ${newMode ? 'enabled' : 'disabled'} via Ctrl+Shift+H`)
      } catch (error) {
        console.error('Error toggling guide mode:', error)
      }
    })

    // Ctrl+Shift+R: 모든 가이드 오버레이 정리
    globalShortcut.register("CommandOrControl+Shift+R", async () => {
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) return

      try {
        await mainWindow.webContents.executeJavaScript(`
          window.api.overlay.clearGuideOverlays()
        `)
        console.log("All guide overlays cleared via Ctrl+Shift+R")
      } catch (error) {
        console.error('Error clearing guide overlays:', error)
      }
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      if (app.isReady()) {
        globalShortcut.unregisterAll()
      }
    })
  }
}
