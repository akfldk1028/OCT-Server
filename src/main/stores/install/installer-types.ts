// / main/stores/installer/installer-types.ts
import { Database } from '../../../renderer/database.types';

// DB 타입에서 가져온 install method 타입
type MCPInstallMethod = Database['public']['Tables']['mcp_install_methods']['Row'];

export interface InstallProgress {
    serverName: string;
    status: string;
    percent: number;
    currentStep?: string;
    error?: string;
  }
  
  export interface InstallResult {
    success: boolean;
    method?: string;
    installedPath?: string;
    error?: string;
  }
  
  export interface InstalledServer {
    installMethod: string;
    installedPath: string;
    installedAt: string;
    config: any;
  }
  
  export interface InstallQueueItem {
    serverName: string;
    config: any;
    priority: number;
  }
  
  export interface InstallerState {
    // 설치 진행 상태
    installProgress: Record<string, InstallProgress>;
    
    // 설치된 서버 정보
    installedServers: Record<string, InstalledServer>;
    
    // 사용 가능한 설치 방법
    availableMethods: Record<string, boolean>;
    
    // 설치 큐
    installQueue: InstallQueueItem[];
    
    // 현재 설치 중인 서버
    currentInstalling: string | null;

    // 🔥 상태 변화 알림용 타임스탬프
    lastStateChange: number;
    lastStateChangeType: 'installed' | 'uninstalled' | 'error' | null;
    lastStateChangeServerId: string | null;
  }
  
  // Action Types
  export type InstallerAction =
    | { type: 'SET_AVAILABLE_METHODS'; payload: Record<string, boolean> }
    | { type: 'UPDATE_PROGRESS'; payload: InstallProgress }
    | { type: 'ADD_INSTALLED_SERVER'; payload: { serverName: string; server: InstalledServer } }
    | { type: 'REMOVE_PROGRESS'; payload: string }
    | { type: 'ADD_TO_QUEUE'; payload: InstallQueueItem }
    | { type: 'REMOVE_FROM_QUEUE'; payload: string }
    | { type: 'SET_CURRENT_INSTALLING'; payload: string | null }
    | { type: 'CLEAR_QUEUE' };