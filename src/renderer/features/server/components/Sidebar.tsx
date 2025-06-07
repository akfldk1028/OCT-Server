import React, { useState } from 'react';
import { useDnD } from '../hook/DnDContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NodesTab from './tab/NodesTab';
import ServiceTab from './tab/ServiceTab';
import ServerTab from './tab/ServerTab';
import { useOutletContext } from 'react-router';
import type { AllServersResponse, ServerItem, ClientRow } from '../../../types';
import type { Database } from '../../../database.types';

// 🔥 server-layout.tsx에서 정의한 정확한 타입 사용
type InstalledServer = Database['public']['Tables']['user_mcp_usage']['Row'] & {
  mcp_install_methods: Database['public']['Tables']['mcp_install_methods']['Row'] | null;
  mcp_servers: Database['public']['Tables']['mcp_servers']['Row'] | null;
  mcp_configs?: Database['public']['Tables']['mcp_configs']['Row'][];
};
import ComputerUseTab from "@/renderer/features/server/components/tab/ComputerUseTab";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { servers, clients } = useOutletContext<{ servers: InstalledServer[], clients: ClientRow[] }>();

  const [_, setType] = useDnD();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'Toolbox' | 'Client' | 'Server' | 'ComputerUse'>('Toolbox');

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
              onClick={() => setActiveTab('Toolbox')}
              className={`${activeTab === 'Toolbox' ? 'font-bold' : ''} ${collapsed ? 'w-8 h-8 p-0 flex items-center justify-center text-lg' : ''}`}
              title="Toolbox"
            >
              {collapsed ? <span>🧩</span> : 'Toolbox'}
            </button>
            <button
              onClick={() => setActiveTab('Client')}
              className={`${activeTab === 'Client' ? 'font-bold' : ''} ${collapsed ? 'w-8 h-8 p-0 flex items-center justify-center text-lg' : ''}`}
              title="Client"
            >
              {collapsed ? <span>⚙️</span> : 'Client'}
            </button>
            <button
              onClick={() => setActiveTab('Server')}
              className={`${activeTab === 'Server' ? 'font-bold' : ''} ${collapsed ? 'w-8 h-8 p-0 flex items-center justify-center text-lg' : ''}`}
              title="Server"
            >
              {collapsed ? <span>❓</span> : 'Server'}
            </button>
            {/* <button
              onClick={() => setActiveTab('ComputerUse')}
              className={`${activeTab === 'ComputerUse' ? 'font-bold' : ''} ${collapsed ? 'w-8 h-8 p-0 flex items-center justify-center text-lg' : ''}`}
              title="ComputerUse"
            >
              {collapsed ? <span>❓</span> : 'ComputerUse'}
            </button> */}
          </div>
          <div>
            {activeTab === 'Toolbox' && (
              <NodesTab collapsed={collapsed} onDragStart={handleDragStart} />
            )}
            {activeTab === 'Client' && (
              <ServiceTab collapsed={collapsed} onDragStart={handleDragStart} clients={clients} />
            )}
            {activeTab === 'Server' && (
              <ServerTab collapsed={collapsed} onDragStart={handleDragStart} servers={servers ?? []} />
            )}
            {/* {activeTab === 'ComputerUse' && (
              <ComputerUseTab collapsed={collapsed} onDragStart={handleDragStart} clients={clients ?? []} />
            )} */}
          </div>
        </div>
      </aside>
    </div>
  );
}
