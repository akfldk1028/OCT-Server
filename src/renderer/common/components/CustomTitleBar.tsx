import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Menu, Settings, RotateCcw, Code } from 'lucide-react';

interface CustomTitleBarProps {
  title?: string;
  showMenuButton?: boolean;
}

export function CustomTitleBar({ title = "OCT Server", showMenuButton = true }: CustomTitleBarProps) {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // 🔥 개발자 도구 상태 확인
  useEffect(() => {
    const checkDevToolsStatus = async () => {
      try {
        if (window.electron?.devTools) {
          const status = await window.electron.devTools.getStatus();
          setIsDevToolsOpen(status?.isOpen || false);
        }
      } catch (error) {
        console.warn('개발자 도구 상태 확인 실패:', error);
      }
    };

    checkDevToolsStatus();
    
    // 주기적으로 상태 확인 (옵션)
    const interval = setInterval(checkDevToolsStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => {
    window.electron?.ipcRenderer.invoke('minimize-window');
  };

  const handleMaximize = () => {
    window.electron?.ipcRenderer.invoke('maximize-window');
  };

  const handleClose = () => {
    window.electron?.ipcRenderer.invoke('close-window');
  };

  // 🔥 컨텍스트 메뉴 토글
  const handleMenuClick = () => {
    setShowContextMenu(!showContextMenu);
  };

  // 🔥 개발자 도구 토글 (F12와 동일한 기능)  
  const handleToggleDevTools = async () => {
    try {
      if (window.electron?.devTools) {
        await window.electron.devTools.toggle();
        const status = await window.electron.devTools.getStatus();
        setIsDevToolsOpen(status?.isOpen || false);
      }
    } catch (error) {
      console.error('개발자 도구 토글 실패:', error);
    }
    setShowContextMenu(false);
  };

  // 🔥 페이지 새로고침 (Ctrl+R과 동일한 기능)
  const handleReload = () => {
    window.location.reload();
    setShowContextMenu(false);
  };

  // 🔥 외부 클릭 시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <div className="flex items-center h-8 bg-[#264A2B] text-[#E8F5E9] select-none absolute top-0 left-0 right-0 z-[9999] border-b border-[#E8F5E9]/10">
      {/* 🌲 왼쪽 영역: 메뉴 버튼 + 타이틀 */}
      <div className="flex items-center pl-3 min-w-[200px] relative">
        {showMenuButton && (
          <div className="relative">
            <button 
              className="titlebar-no-drag bg-transparent border-none text-[#E8F5E9] cursor-pointer flex items-center justify-center p-2 mr-2 rounded transition-colors duration-150 hover:bg-[#E8F5E9]/10"
              onClick={handleMenuClick}
              title="개발자 메뉴"
            >
              <Menu size={16} />
            </button>
            
            {/* 🔥 컨텍스트 메뉴 */}
            {showContextMenu && (
              <div className="titlebar-no-drag absolute top-8 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[180px] z-[10000]">
                <button
                  onClick={handleReload}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <RotateCcw size={14} />
                  새로고침 (Ctrl+R)
                </button>
                <button
                  onClick={handleToggleDevTools}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                    isDevToolsOpen 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Code size={14} />
                  {isDevToolsOpen ? '개발자 도구 닫기' : '개발자 도구 열기'} (F12)
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                  단축키: F12, Ctrl+Shift+I
                </div>
              </div>
            )}
          </div>
        )}
        <div className="text-sm font-semibold text-[#E8F5E9] ml-1">
          {title}
        </div>
      </div>

      {/* 🌲 가운데 영역: 드래그 가능한 영역 */}
      <div className="flex-1 h-full titlebar-drag-region">
        {/* 빈 영역 - 드래그용 */}
      </div>

      {/* 🌲 오른쪽 영역: 윈도우 컨트롤 버튼 */}
      <div className="flex items-center">
        <button 
          className="titlebar-no-drag bg-transparent border-none text-[#E8F5E9] cursor-pointer flex items-center justify-center w-[46px] h-8 transition-colors duration-150 hover:bg-[#E8F5E9]/10"
          onClick={handleMinimize}
          title="최소화"
        >
          <Minus size={16} />
        </button>
        <button 
          className="titlebar-no-drag bg-transparent border-none text-[#E8F5E9] cursor-pointer flex items-center justify-center w-[46px] h-8 transition-colors duration-150 hover:bg-[#E8F5E9]/10"
          onClick={handleMaximize}
          title="최대화"
        >
          <Square size={16} />
        </button>
        <button 
          className="titlebar-no-drag bg-transparent border-none text-[#E8F5E9] cursor-pointer flex items-center justify-center w-[46px] h-8 transition-colors duration-150 hover:bg-red-600 hover:text-white"
          onClick={handleClose}
          title="닫기"
        >
          <X size={16} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .titlebar-drag-region {
            -webkit-app-region: drag;
            app-region: drag;
          }

          .titlebar-no-drag {
            -webkit-app-region: no-drag;
            app-region: no-drag;
          }
        `
      }} />
    </div>
  );
}

export default CustomTitleBar; 