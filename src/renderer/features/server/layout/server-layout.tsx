import useLocalStorage from '@/renderer/lib/hooks/useLocalStorage';
import {
  Outlet,
  data,
  useLoaderData,
  useOutletContext,
  type LoaderFunctionArgs,
} from 'react-router';
import { z } from 'zod';
import { CONFIG_LOCAL_STORAGE_KEY, DEFAULT_INSPECTOR_CONFIG, } from "../../../lib/constants";
import { getMCPProxyAddress } from "../../../utils/configUtils";
import type { AllServersResponse } from '../../../types';
import { ClientRow, makeSSRClient  } from '../../../supa-client';
import { getClients } from '../queries';
import {  IS_ELECTRON, IS_WEB } from '../../../utils/environment';

// OutletContext 타입 정의
type ServerLayoutContext = {
  isLoggedIn: boolean;
  servers: AllServersResponse;
  clients: ClientRow[];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 서버 전체 설정 fetch
  const config = DEFAULT_INSPECTOR_CONFIG;

  const res = await fetch(`${getMCPProxyAddress(config)}/servers/full-config`);
  const servers: AllServersResponse = await res.json();

  // local-express-server 제외
  const filteredServers: AllServersResponse = {
    ...servers,
    allServers: servers.allServers.filter(s => s.id !== 'local-express-server'),
  };
  const { client } = makeSSRClient(); // headers might be unused now
  const [clients] = await Promise.all([
    getClients(client as any, { // 'as any' cast might still be needed depending on exact types
      limit: 100,
    }),
  ]);

  console.log("[server-layout] ✅✅")
  console.log(servers)
  console.log(clients)
  console.log("[server-layout] ✅✅")

  return { servers: filteredServers, clients };
};

export default function ServerLayout() {
  const { isLoggedIn } = useOutletContext<{ isLoggedIn: boolean }>();
  // loader에서 받아온 servers와 clients를 useLoaderData로 가져옴
  const { servers, clients } = useLoaderData() as { 
    servers: AllServersResponse, 
    clients: ClientRow[]
  };

  return <Outlet context={{ isLoggedIn, servers, clients }} />;
}