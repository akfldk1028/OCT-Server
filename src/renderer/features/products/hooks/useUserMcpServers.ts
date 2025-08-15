import { useState, useEffect } from 'react';
import { supabase } from '../../../supa-client';

interface InstalledMcpServer {
  id: number;
  name: string;
  description?: string;
  install_status: string;
  install_method: string;
  updated_at: string;
  original_server_id: number;
}

export function useUserMcpServers(userId?: string) {
  const [installedServers, setInstalledServers] = useState<InstalledMcpServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstalledServers = async () => {
    if (!userId) {
      setInstalledServers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 설치된 서버들을 가져오기 (success 상태만)
      const { data, error } = await supabase
        .from('user_mcp_usage')
        .select(`
          id,
          original_server_id,
          install_status,
          config_id,
          install_method_id,
          updated_at,
          mcp_servers!user_mcp_usage_original_server_id_fkey (
            id,
            name,
            description
          )
        `)
        .eq('profile_id', userId)
        .eq('install_status', 'success')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ [useUserMcpServers] 설치된 서버 조회 실패:', error);
        setError(error.message);
        return;
      }

      // 중복 서버 제거 (같은 original_server_id를 가진 것 중 최신만)
      const uniqueServers = data?.reduce((acc: InstalledMcpServer[], current: any) => {
        const existing = acc.find(server => server.original_server_id === current.original_server_id);
        
        if (!existing) {
          acc.push({
            id: current.id,
            name: current.mcp_servers?.name || `Server ${current.original_server_id}`,
            description: current.mcp_servers?.description || '',
            install_status: current.install_status,
            install_method: current.config_id ? 'Zero-Install' : 'Standard',
            updated_at: current.updated_at,
            original_server_id: current.original_server_id
          });
        }
        
        return acc;
      }, []) || [];

      console.log('✅ [useUserMcpServers] 설치된 서버 목록:', uniqueServers);
      console.log('🔍 [useUserMcpServers] Debug - userId:', userId, 'serverCount:', uniqueServers.length);
      setInstalledServers(uniqueServers);

    } catch (err: any) {
      console.error('❌ [useUserMcpServers] 예외 발생:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstalledServers();
  }, [userId]);

  // 실시간 업데이트를 위한 이벤트 리스너
  useEffect(() => {
    const handleMcpServerChange = () => {
      console.log('🔄 [useUserMcpServers] MCP 서버 변경 감지, 새로고침');
      fetchInstalledServers();
    };

    window.addEventListener('mcp-server-installed', handleMcpServerChange);
    window.addEventListener('mcp-server-uninstalled', handleMcpServerChange);

    return () => {
      window.removeEventListener('mcp-server-installed', handleMcpServerChange);
      window.removeEventListener('mcp-server-uninstalled', handleMcpServerChange);
    };
  }, [userId]);

  return {
    installedServers,
    isLoading,
    error,
    refresh: fetchInstalledServers
  };
}