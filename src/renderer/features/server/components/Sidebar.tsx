import React, { useState } from 'react';
import { useDnD } from './DnDContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NodesTab from './NodesTab';
import SettingsTab from './SettingsTab';
import HelpTab from './HelpTab';
import { useOutletContext } from 'react-router';
import type { AllServersResponse, ServerItem } from '../../../types';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { servers } = useOutletContext<{ servers: AllServersResponse }>();
  const [_, setType] = useDnD();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'nodes' | 'settings' | 'help'>('nodes');

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', nodeType);
  };

  return (
    <div
      className="absolute top-4 right-4 h-[calc(100%-2rem)] z-30"
      style={{ width: collapsed ? 64 : 350, minWidth: collapsed ? 64 : 350, maxWidth: collapsed ? 64 : 350 }}
    >
      <aside
        className={`h-full bg-sidebar text-sidebar-foreground border border-sidebar-border shadow-2xl rounded-xl flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'w-16 min-w-[4rem] max-w-[4rem]' : 'w-[350px] min-w-[350px] max-w-[350px]'}`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar rounded-t-xl">
          {!collapsed && (
            <div>
              <div className="text-base font-semibold text-gray-800">노드 툴박스</div>
              <div className="text-xs text-gray-500 mt-1">노드를 캔버스로 드래그하세요</div>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
              type="button"
            >
              {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            {!collapsed && onClose && (
              <button
                onClick={onClose}
                className="ml-1 p-1 rounded hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="사이드바 닫기"
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {/* 노드 리스트 */}
        <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-3 transition-all duration-300 ${collapsed ? 'items-center p-2' : ''}`}>
          <div className={`flex gap-2 border-b mb-2 ${collapsed ? 'flex-col items-center gap-1 p-0 justify-center' : ''}`}>
            <button
              onClick={() => setActiveTab('nodes')}
              className={`${activeTab === 'nodes' ? 'font-bold' : ''} ${collapsed ? 'w-8 h-8 p-0 flex items-center justify-center text-lg' : ''}`}
              title="노드"
            >
              {collapsed ? <span>🧩</span> : '노드'}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${activeTab === 'settings' ? 'font-bold' : ''} ${collapsed ? 'w-8 h-8 p-0 flex items-center justify-center text-lg' : ''}`}
              title="설정"
            >
              {collapsed ? <span>⚙️</span> : '설정'}
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`${activeTab === 'help' ? 'font-bold' : ''} ${collapsed ? 'w-8 h-8 p-0 flex items-center justify-center text-lg' : ''}`}
              title="도움말"
            >
              {collapsed ? <span>❓</span> : '도움말'}
            </button>
          </div>
          <div>
            {activeTab === 'nodes' && (
              <NodesTab collapsed={collapsed} onDragStart={handleDragStart} />
            )}
            {activeTab === 'settings' && (
              <SettingsTab collapsed={collapsed} onDragStart={handleDragStart} />
            )}
            {activeTab === 'help' && (
              <HelpTab collapsed={collapsed} onDragStart={handleDragStart} servers={servers?.allServers ?? []} />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
