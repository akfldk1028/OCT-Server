import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../renderer/database.types';
import { 
  createUserMcpUsage, 
  updateUserMcpInstallStatus, 
  getCurrentUserProfileId,
  findInstallMethodId,
  deleteUserMcpUsage
} from '../../../renderer/features/products/queries';

// 🔥 Supabase 클라이언트 생성 (일렉트론 메인 프로세스용)
export const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mcrzlwriffyulnswfckt.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcnpsd3JpZmZ5dWxuc3dmY2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMDkwMjIsImV4cCI6MjA2Mjg4NTAyMn0.zHbjwPZnJUBx-u6YWsBVKS36gtO2WnUQT3ieZRLzKRQ';

  const keyToUse = serviceRoleKey || supabaseAnonKey;

  if (!supabaseUrl || !keyToUse) {
    console.warn('⚠️ [getSupabaseClient] Supabase 환경 변수가 부족합니다:', {
      hasUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasAnonKey: !!supabaseAnonKey
    });
    return null;
  }

  if (serviceRoleKey) {
    console.log('🔐 [getSupabaseClient] Service Role Key 사용하여 서버 사이드 클라이언트 생성');
  } else {
    console.log('🔑 [getSupabaseClient] Anon Key로 클라이언트 생성 (세션 필요, RLS 주의)');
  }

  return createClient<Database>(supabaseUrl, keyToUse);
};

// 🔥 사용자 MCP 사용 기록 생성 (설치 시작)
export const recordInstallStart = async (
  serverId: string, 
  serverName: string, 
  userProfileId?: string, 
  selectedMethod?: any,
  userEnvVariables?: Record<string, string> | null
) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      console.log('🚫 [recordInstallStart] Supabase 클라이언트 없음, 기록 생략');
      return null;
    }

    console.log('📝 [recordInstallStart] 설치 시작 기록 생성 중...', { serverId, serverName, userProfileId, selectedMethod });
    
    // 현재 사용자 profile_id 가져오기 (userProfileId가 있으면 사용, 없으면 클라이언트에서 가져오기)
    let profileId = userProfileId;
    if (!profileId) {
      console.log('⚠️ [recordInstallStart] userProfileId가 없어서 사용자 기록을 건너뜁니다. 일렉트론 메인 프로세스에서는 렌더러의 인증 세션에 접근할 수 없습니다.');
      return null;
    }
    
    // original_server_id는 숫자형이어야 하므로 변환 시도
    const originalServerId = parseInt(serverId);
    if (isNaN(originalServerId)) {
      console.log('⚠️ [recordInstallStart] serverId가 숫자가 아님:', serverId);
      return null;
    }

    // 🔥 설치 방법 ID 찾기 (안전 검증 추가)
    let installMethodId = null;
    try {
      // 🚀 Zero-install인 경우 config_id 검증 후 사용
      if (selectedMethod?.is_zero_install) {
        const candidateId = selectedMethod?.config_id || selectedMethod?.id;
        
        if (candidateId) {
          // config_id가 실제로 mcp_configs 테이블에 존재하는지 확인
          const { data: configExists } = await client
            .from('mcp_configs')
            .select('id')
            .eq('id', candidateId)
            .maybeSingle();
          
          if (configExists) {
            installMethodId = candidateId;
            console.log('⚡ [recordInstallStart] Zero-install config_id 검증 완료:', installMethodId);
          } else {
            console.log('⚠️ [recordInstallStart] config_id가 mcp_configs에 없음 (크롤링으로 업데이트됨):', candidateId);
            
            // 🔄 크롤링으로 인해 config_id가 변경된 경우, 최신 config를 찾아서 사용
            if (selectedMethod?.config_name) {
              console.log('🔍 [recordInstallStart] config_name으로 최신 config 검색:', selectedMethod.config_name);
              
              const { data: latestConfig } = await client
                .from('mcp_configs')
                .select('id')
                .eq('original_server_id', originalServerId)
                .eq('config_name', selectedMethod.config_name)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (latestConfig) {
                installMethodId = latestConfig.id;
                console.log('✅ [recordInstallStart] 최신 config_id 찾음:', installMethodId);
              } else {
                console.log('⚠️ [recordInstallStart] 최신 config도 찾을 수 없음 - null로 설정');
                installMethodId = null;
              }
            } else {
              installMethodId = null; // config_name이 없으면 null로 설정
            }
          }
        }
      } else {
        // 🔧 일반 설치 방법의 경우 DB에서 찾기
        installMethodId = await findInstallMethodId(client, {
          original_server_id: originalServerId,
          selectedMethod: selectedMethod
        });
        console.log('🔍 [recordInstallStart] DB에서 찾은 설치 방법 ID:', installMethodId);
      }
    } catch (error) {
      console.log('⚠️ [recordInstallStart] 설치 방법 ID 찾기 실패:', error);
      installMethodId = null; // 에러 시 null로 설정
    }

    // 🔥 Zero-install인 경우 config_id 사용, 일반 설치는 install_method_id 사용
    const isZeroInstall = selectedMethod?.is_zero_install;
    
    const usageRecord = await createUserMcpUsage(client, {
      profile_id: profileId,
      original_server_id: originalServerId,
      install_method_id: isZeroInstall ? null : installMethodId,
      config_id: isZeroInstall ? installMethodId : null, // 🚀 Zero-install면 config_id에 넣기
      user_platform: 'electron',
      user_client: 'oct-client',
      user_env_variables: userEnvVariables,
    });

    console.log('✅ [recordInstallStart] 설치 시작 기록 생성 완료:', usageRecord);
    
    // 🔥 usageRecord에 설치 방법 ID 추가 (나중에 config 저장할 때 사용)
    if (usageRecord && installMethodId !== null) {
      (usageRecord as any).install_method_id = installMethodId;
    }
    
    return usageRecord;
    
  } catch (error) {
    console.error('❌ [recordInstallStart] 설치 시작 기록 실패:', error);
    return null;
  }
};

// 🔥 사용자 MCP 설치 상태 업데이트 (설치 완료/실패)
export const recordInstallResult = async (
  usageId: number | null, 
  success: boolean, 
  error?: string
) => {
  try {
    if (!usageId) {
      console.log('🚫 [recordInstallResult] usageId 없음, 기록 생략');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      console.log('🚫 [recordInstallResult] Supabase 클라이언트 없음, 기록 생략');
      return;
    }

    console.log('📝 [recordInstallResult] 설치 결과 업데이트 중...', { usageId, success, error });

    await updateUserMcpInstallStatus(client, {
      usage_id: usageId,
      install_status: success ? 'success' : 'failed',
      install_error: error || null,
    });

    console.log('✅ [recordInstallResult] 설치 결과 업데이트 완료');
    
  } catch (updateError) {
    console.error('❌ [recordInstallResult] 설치 결과 업데이트 실패:', updateError);
  }
};

// 🔥 사용자 MCP 설치 기록 삭제
export const recordUninstall = async (
  serverId: string,
  userProfileId: string
) => {
  try {
    const client = getSupabaseClient();
    if (!client) {
      console.log('🚫 [recordUninstall] Supabase 클라이언트 없음, 기록 생략');
      return;
    }

    const serverIdNum = parseInt(serverId);
    if (isNaN(serverIdNum)) {
      console.log('⚠️ [recordUninstall] serverId가 숫자가 아님:', serverId);
      return;
    }

    console.log('📝 [recordUninstall] DB에서 해당 서버의 모든 설치 기록 삭제 중...', {
      serverId: serverIdNum,
      userProfileId
    });
    
    // 🚀 해당 서버와 사용자의 모든 설치 기록을 삭제 (install_method_id 무관)
    const deleteResult = await deleteUserMcpUsage(client, {
      profile_id: userProfileId,
      original_server_id: serverIdNum,
      // install_method_id는 전달하지 않음 - 모든 기록 삭제
    });
    
    console.log('✅ [recordUninstall] 사용자 설치 기록 삭제 완료:', deleteResult);
    return deleteResult;
    
  } catch (recordError) {
    console.log('⚠️ [recordUninstall] 사용자 제거 기록 업데이트 실패:', recordError);
    throw recordError;
  }
}; 