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

  console.log("[server-layout] ✅✅")
  console.log(servers)
  console.log("[server-layout] ✅✅")

  return { servers: filteredServers };
};

export default function ServerLayout() {
  const { isLoggedIn } = useOutletContext<{ isLoggedIn: boolean }>();
  // loader에서 받아온 servers를 useLoaderData로 가져옴
  const { servers } = useLoaderData() as { servers: AllServersResponse };

  return <Outlet context={{ isLoggedIn, servers }} />;
}