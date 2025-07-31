import {
  useLoaderData,
  useOutletContext,
  Outlet,
  type LoaderFunctionArgs,
} from 'react-router';
import { makeSSRClient } from '../../../supa-client';
import { getClients } from '../../server/queries';
import { getUserInstalledServers, getMcpConfigsByServerId } from '../../products/queries';
import { useState, useEffect } from 'react';
import type { InstalledServer, ServerLayoutContext, ClientType } from '../../server/types/server-types';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { client } = makeSSRClient();
  
  try {
    const clients = await getClients(client as any, { limit: 100 });
    return { clients };
    
  } catch (error) {
    console.error('❌ [server-layout] loader 실패:', error);
    return { clients: [] };
  }
};

export default function EnvLayout() {
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


      setIsLoadingServers(true);
      try {
        const { client } = makeSSRClient();
        
        // 🔥 1단계: 설치된 서버 목록 가져오기
        const installedServers = await getUserInstalledServers(client, {
          profile_id: userId,
        });
        
        // 🔥 2단계: 각 서버의 설정들 병렬로 가져오기
        const serversWithConfigs = await Promise.all(
          installedServers.map(async (server) => {
            try {
              const configs = await getMcpConfigsByServerId(client, {
                original_server_id: server.original_server_id
              });
              
              return {
                ...server,
                mcp_configs: configs
              };
            } catch (configError) {
              return {
                ...server,
                mcp_configs: []
              };
            }
          })
        );
        
        console.log('✅ [fetchServers] 서버+설정 로드 완료:', serversWithConfigs.length, '개');
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