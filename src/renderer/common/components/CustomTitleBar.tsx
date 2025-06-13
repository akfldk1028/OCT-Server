import React from 'react';
import { Minus, Square, X, Menu } from 'lucide-react';

interface CustomTitleBarProps {
  title?: string;
  showMenuButton?: boolean;
}

export function CustomTitleBar({ title = "OCT Server", showMenuButton = true }: CustomTitleBarProps) {
  const handleMinimize = () => {
    window.electron?.ipcRenderer.invoke('minimize-window');
  };

  const handleMaximize = () => {
    window.electron?.ipcRenderer.invoke('maximize-window');
  };

  const handleClose = () => {
    window.electron?.ipcRenderer.invoke('close-window');
  };

  const handleMenuClick = () => {
    // 메뉴 토글 로직 (나중에 구현)
    console.log('Menu clicked');
  };

  return (
    <div className="flex items-center h-8 bg-[#264A2B] text-[#E8F5E9] select-none absolute top-0 left-0 right-0 z-[9999] border-b border-[#E8F5E9]/10">
      {/* 🌲 왼쪽 영역: 메뉴 버튼 + 타이틀 */}
      <div className="flex items-center pl-3 min-w-[200px]">
        {showMenuButton && (
          <button 
            className="titlebar-no-drag bg-transparent border-none text-[#E8F5E9] cursor-pointer flex items-center justify-center p-2 mr-2 rounded transition-colors duration-150 hover:bg-[#E8F5E9]/10"
            onClick={handleMenuClick}
            title="메뉴"
          >
            <Menu size={16} />
          </button>
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