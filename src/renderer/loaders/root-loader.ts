import { LoaderFunctionArgs } from 'react-router';
import { makeSSRClient, supabase } from '../supa-client';
import { getUserById } from '../features/users/queries';
import { IS_ELECTRON } from '../utils/environment';
import { getClients } from '../features/server/queries';
import { getUserInstalledServers } from '../features/products/queries';
import { getUserWorkflows } from '../features/server/workflow-queries';
import { analyzeWorkflowClientType } from '../utils/workflow-analysis';

export type LoaderData = {
  user: { id: string; email: string } | null;
  profile: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
  servers: any[];
  clients: any[];
  workflows: any[];
};

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  try {
    console.log('🔥 [Root Loader] 시작');

    let user: { id: string; email: string } | null = null;

    // 1. 일렉트론 환경에서는 IPC를 통해 세션 정보 가져오기
    if (IS_ELECTRON && typeof window !== 'undefined' && window.electronAPI) {
      console.log('🔥 [Root Loader] 일렉트론 환경 - IPC로 세션 가져오기');
      try {
        const sessionResult = await (window.electronAPI as any).invoke('auth:get-session');
        console.log('🔥 [Root Loader] IPC 세션 결과:', sessionResult);
        
        if (sessionResult.success && sessionResult.user) {
          user = sessionResult.user;
          console.log('🔥 [Root Loader] IPC로 유저 정보 가져옴:', user?.email);
        }
      } catch (ipcError) {
        console.warn('🔥 [Root Loader] IPC 세션 가져오기 실패:', ipcError);
      }
    }

    // 2. IPC로 세션을 가져오지 못한 경우, Supabase로 시도
    if (!user) {
      console.log('🔥 [Root Loader] Supabase로 세션 확인');
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        user = {
          id: authData.user.id,
          email: authData.user.email || ''
        };
        console.log('🔥 [Root Loader] Supabase로 유저 정보 가져옴:', user?.email);
      }
    }

    // 3. 로그인되지 않은 경우 빈 데이터 반환
    if (!user) {
      console.log('🔥 [Root Loader] 로그인되지 않음 - 빈 데이터 반환');
      return {
        user: null,
        profile: null,
        servers: [],
        clients: [],
        workflows: [],
      };
    }

    console.log('🔥 [Root Loader] 사용자 로그인됨 - 데이터 로딩 시작:', user.email);

    // 4. 프로필 정보 가져오기
    let profile = null;
    try {
      const profileData = await getUserById(supabase as any, { id: user.id });
      if (profileData) {
        profile = {
          id: profileData.profile_id || user.id,
          name: profileData.name || '사용자',
          username: profileData.username || 'user',
          avatar: profileData.avatar || null,
        };
        console.log('🔥 [Root Loader] 프로필 정보 로드 성공:', profile.name);
      }
    } catch (profileError) {
      console.warn('🔥 [Root Loader] 프로필 로드 실패:', profileError);
    }

    // 5. 병렬로 데이터 로딩 (모든 호출을 supabase client로 통일)
    console.log('🔥 [Root Loader] 병렬 데이터 로딩 시작');
    const [clients, installedServers, rawWorkflows] = await Promise.all([
      getClients(supabase as any, { limit: 100 }),
      getUserInstalledServers(supabase as any, { profile_id: user.id }),
      getUserWorkflows(supabase as any, { profile_id: user.id, limit: 100 }) // 🔥 변경됨
    ]);

    console.log('🔥 [Root Loader] 데이터 로딩 완료:', {
      clients: clients?.length || 0,
      servers: installedServers?.length || 0,
      workflows: rawWorkflows?.length || 0
    });

    // 6. 워크플로우 분석 및 client_type 설정
    let workflows = rawWorkflows || [];
    if (workflows.length > 0) {
      console.log('🔥 [Root Loader] 워크플로우 분석 시작');
      
      workflows = await Promise.all(
        workflows.map(async (workflow: any) => {
          try {
            const analysis = await analyzeWorkflowClientType(workflow, supabase, user.id);
            return {
              ...workflow,
              client_type: analysis.client_type,
              target_clients: analysis.target_clients
            };
          } catch (error) {
            console.warn(`워크플로우 ${workflow.id} 분석 실패:`, error);
            return {
              ...workflow,
              client_type: 'unknown',
              target_clients: []
            };
          }
        })
      );
      
      console.log('🔥 [Root Loader] 워크플로우 분석 완료');
    }

    const result = {
      user,
      profile,
      servers: installedServers || [],
      clients: clients || [],
      workflows: workflows || [],
    };

    console.log('🔥 [Root Loader] 최종 결과:', {
      user: !!result.user,
      profile: !!result.profile,
      serversCount: result.servers.length,
      clientsCount: result.clients.length,
      workflowsCount: result.workflows.length
    });

    return result;

  } catch (error) {
    console.error('🔥 [Root Loader] 전체 로딩 실패:', error);
    return {
      user: null,
      profile: null,
      servers: [],
      clients: [],
      workflows: [],
    };
  }
}; 