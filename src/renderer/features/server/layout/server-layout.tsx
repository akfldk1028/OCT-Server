import {
  useLoaderData,
  useOutletContext,
  Outlet,
  type LoaderFunctionArgs,
} from 'react-router';
import { makeSSRClient } from '../../../supa-client';
import { getClients } from '../queries';
import { getUserInstalledServers, getMcpConfigsByServerId, getMcpInstallMethodsByServerId } from '../../products/queries';
import { useState, useEffect } from 'react';
import type { InstalledServer, ServerLayoutContext, ClientType } from '../types/server-types';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { client } = makeSSRClient();
  
  try {
    // 🔥 일단 클라이언트만 가져오기 (서버는 useEffect에서 처리)
    const clients = await getClients(client as any, { limit: 100 });
    
    console.log("[server-layout] ✅✅")
    console.log('📊 clients:', clients.length)
    console.log("[server-layout] ✅✅")

    return { clients };
    
  } catch (error) {
    console.error('❌ [server-layout] loader 실패:', error);
    return { clients: [] };
  }
};

export default function ServerLayout() {
  const { clients } = useLoaderData() as { clients: ClientType[] };

  // 🔥 Outlet context에서 사용자 정보 가져오기
  const { isLoggedIn, userId } = useOutletContext<{
    isLoggedIn: boolean;
    userId?: string;
  }>();

  // 🔥 설치된 서버들을 위한 상태 (타입 지정)
  const [servers, setServers] = useState<InstalledServer[]>([]);
  const [isLoadingServers, setIsLoadingServers] = useState(false);

  // 🔥 userId가 있을 때만 서버 목록을 가져오기
  useEffect(() => {
    const fetchServers = async () => {
      console.log('🔍 [useEffect] 서버 로드 시도:', {
        '👤 userId': userId,
        '🔑 isLoggedIn': isLoggedIn,
        '❓ userId 존재': !!userId
      });

      if (!userId) {
        console.log('⚠️ [useEffect] userId가 없어서 서버 목록을 가져오지 않음');
        setServers([]);
        return;
      }

      console.log('🔍 [useEffect] context userId:', userId);

      setIsLoadingServers(true);
      try {
        const { client } = makeSSRClient();
        
        // 🔥 1단계: 설치된 서버 목록 가져오기
        const installedServers = await getUserInstalledServers(client, {
          profile_id: userId,
        });
        
        console.log('🔧 [fetchServers] 설치된 서버 목록:', installedServers?.length || 0, '개');
        
        // 🔥 2단계: 각 서버의 설정들과 설치 방법들 병렬로 가져오기
        const serversWithConfigs = await Promise.all(
          installedServers.map(async (server) => {
            console.log(`🔧 [fetchServers] 서버 ${server.original_server_id} (${server.id}) 설정 로드 시작`);
            
            try {
              console.log(`🔧 [fetchServers] 서버 ${server.id} (original_server_id: ${server.original_server_id}, ${server.mcp_servers?.name}) 조회 시작`);
              
              // mcp_configs 가져오기
              const configs = await getMcpConfigsByServerId(client, {
                original_server_id: server.original_server_id
              });
              console.log(`✅ [fetchServers] mcp_configs 조회 완료: ${configs?.length || 0}개`);
              
              // 🔥 mcp_install_methods 가져오기 (새로운 함수 사용)
              const installMethods = await getMcpInstallMethodsByServerId(client, {
                original_server_id: server.original_server_id
              });
              console.log(`✅ [fetchServers] mcp_install_methods 조회 완료: ${installMethods?.length || 0}개`);
              console.log(`🔍 [fetchServers] installMethods 상세:`, installMethods);
              
              const result = {
                ...server,
                mcp_configs: configs || [], // 🔥 null/undefined 방지
                mcp_install_methods: installMethods || []
              };
              
              console.log(`✅ [fetchServers] 서버 ${server.original_server_id} 최종 데이터:`, {
                id: result.id,
                original_server_id: result.original_server_id,
                mcp_configs_count: result.mcp_configs?.length || 0,
                mcp_install_methods_count: result.mcp_install_methods?.length || 0,
                has_mcp_configs: !!result.mcp_configs,
                has_mcp_install_methods: !!result.mcp_install_methods
              });
              
              return result;
            } catch (configError) {
              console.error(`❌ [fetchServers] 서버 ${server.original_server_id} 설정 로드 실패:`, configError);
              return {
                ...server,
                mcp_configs: [], // 🔥 빈 배열로 초기화
                mcp_install_methods: []
              };
            }
          })
        );
        
        console.log('✅ [fetchServers] 서버+설정 로드 완료:', serversWithConfigs.length, '개');
        
        // 🔥 각 서버의 ID 정보 상세 출력
        console.log('🔍 [fetchServers] 로드된 서버 ID 목록:');
        serversWithConfigs.forEach((server, idx) => {
          console.log(`  서버 ${idx + 1}: ID=${server.id}, original_server_id=${server.original_server_id}, name=${server.mcp_servers?.name}`);
        });
        
        setServers(serversWithConfigs);
        
      } catch (error) {
        console.error('❌ [ServerLayout] 서버 로드 실패:', error);
        setServers([]);
      } finally {
        setIsLoadingServers(false);
      }
    };

    fetchServers();
  }, [userId]);

  console.log('🔍 [ServerLayout] 현재 서버 목록:', servers);

  const context: ServerLayoutContext = {
    isLoggedIn,
    userId,
    servers,
    clients,
    isLoadingServers,
  };

  return <Outlet context={context} />;
}