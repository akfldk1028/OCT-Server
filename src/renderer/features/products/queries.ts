import { DateTime } from 'luxon';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PAGE_SIZE } from './contants';
import type { Database } from '../../supa-client';

export const productListSelect = `*`;

export const getProductsBypopularity = async (
  client: SupabaseClient<Database>,
  {
    limit,
    page = 1,
  }: {
    limit: number;
    page?: number;
  },
) => {
  const { data, error } = await client
    .from('github_popularity_view')
    .select(productListSelect)
    .order('stars', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * limit - 1);
  if (error) throw error;
  return data;
};

export const getProductsByDateRange = async (
  client: SupabaseClient<Database>,
  {
    startDate,
    endDate,
    limit,
    page = 1,
  }: {
    startDate: DateTime;
    endDate: DateTime;
    limit: number;
    page?: number;
  },
) => {
  const { data, error } = await client
    .from('github_popularity_view')
    .select(productListSelect)
    .order('stars', { ascending: false })
    .gte('updated_at', startDate.toISO())
    .lte('updated_at', endDate.toISO())
    .range((page - 1) * PAGE_SIZE, page * limit - 1);
  if (error) throw error;
  return data;
};

export const getProductPagesByDateRange = async (
  client: SupabaseClient<Database>,
  {
    startDate,
    endDate,
  }: {
    startDate: DateTime;
    endDate: DateTime;
  },
) => {
  const { count, error } = await client
    .from('github_popularity_view')
    .select(`product_id`, { count: 'exact', head: true })
    .gte('created_at', startDate.toISO())
    .lte('created_at', endDate.toISO());
  if (error) throw error;
  if (!count) return 1;
  return Math.ceil(count / PAGE_SIZE);
};

// 모든 고유 카테고리 목록 가져오기
export const getCategories = async (client: SupabaseClient<Database>) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('categories')
    .not('categories', 'is', null);

  if (error) throw error;

  // 모든 카테고리 추출 및 중복 제거
  const categorySet = new Set<string>();
  data.forEach((item) => {
    if (item.categories) {
      item.categories.split(', ').forEach((cat) => {
        if (cat.trim()) categorySet.add(cat.trim());
      });
    }
  });

  // 카테고리 목록 형식화
  const categoryList = Array.from(categorySet).map((name, index) => ({
    id: index + 1,
    name,
    description: `${name} 관련 MCP 서버 모음`,
  }));

  return categoryList;
};

// 특정 ID의 카테고리 정보 가져오기
export const getCategory = async (
  client: SupabaseClient<Database>,
  { Id }: { Id: number },
) => {
  const categories = await getCategories(client);
  const category = categories.find((cat) => cat.id === Id);

  if (!category) {
    throw new Error(`카테고리 ID ${Id}를 찾을 수 없습니다`);
  }

  return category;
};

// export const getProductsByCategory = async (
//   client: SupabaseClient<Database>,
//   {
//     categoryId,
//     page,
//   }: {
//     categoryId: number;
//     page: number;
//   }
// ) => {
//   const { data, error } = await client
//     .from("product_list_view")
//     .select(productListSelect)
//     .eq("category_id", categoryId)
//     .order("promoted_from", { ascending: true })
//     .order("upvotes", { ascending: false })
//     .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
//   if (error) throw error;
//   return data;
// };

// export const getCategoryPages = async (
//   client: SupabaseClient<Database>,
//   { categoryId }: { categoryId: number }
// ) => {
//   const { count, error } = await client
//     .from("products")
//     .select(`product_id`, { count: "exact", head: true })
//     .eq("category_id", categoryId);
//   if (error) throw error;
//   if (!count) return 1;
//   return Math.ceil(count / PAGE_SIZE);
// };

// export const getProductsBySearch = async (
//   client: SupabaseClient<Database>,
//   { query, page }: { query: string; page: number }
// ) => {
//   const { data, error } = await client
//     .from("product_list_view")
//     .select(productListSelect)
//     .or(`name.ilike.%${query}%, tagline.ilike.%${query}%`)
//     .order("promoted_from", { ascending: true })
//     .order("upvotes", { ascending: false })
//     .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
//   if (error) throw error;
//   return data;
// };

// export const getPagesBySearch = async (
//   client: SupabaseClient<Database>,
//   { query }: { query: string }
// ) => {
//   const { count, error } = await client
//     .from("products")
//     .select(`product_id`, { count: "exact", head: true })
//     .or(`name.ilike.%${query}%, tagline.ilike.%${query}%`);
//   if (error) throw error;
//   if (!count) return 1;
//   return Math.ceil(count / PAGE_SIZE);
// };

export const getProductById = async (
  client: SupabaseClient<Database>,
  { id }: { id: number }, // uniqueId 대신 id 사용
) => {
  const { data, error } = await client
    .from('mcp_servers_full_view')
    .select('*')
    .eq('id', id) // 데이터베이스 필드명은 그대로 유지 (테이블 컬럼명은 변경 불가)
    .single();
  if (error) {
    console.error('[getProductById] Error:', error);
    throw error;
  }
  console.log('[getProductById] Result:', data);
  return data;
};

export const getProductDetailById = async (client: SupabaseClient<Database>,
   { id }: { id: number }) => {
  const { data, error } = await client
    .from('mcp_server_detail_view')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching product detail:', error);
    return null;
  }

  return data;
};






// export const getReviews = async (
//   client: SupabaseClient<Database>,
//   { productId }: { productId: string }
// ) => {
//   const { data, error } = await client
//     .from("reviews")
//     .select(
//       `
//         review_id,
//         rating,
//         review,
//         created_at,
//         user:profiles!inner (
//           name,username,avatar
//         )
//       `
//     )
//     .eq("product_id", productId)
//     .order("created_at", { ascending: false });
//   if (error) throw error;
//   return data;
// };

export const getServersByCategory = async (
  client: SupabaseClient<Database>,
  { categoryName }: { categoryName: string },
) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .ilike('categories', `%${categoryName}%`);

  if (error) throw error;
  return data;
};

// 인기도 카테고리별 서버 목록 가져오기
export const getServersByPopularityCategory = async (
  client: SupabaseClient<Database>,
  { popularityCategory }: { popularityCategory: string },
) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .eq('popularity_category', popularityCategory);

  if (error) throw error;
  return data;
};

// 활동 상태별 서버 목록 가져오기
export const getServersByActivityStatus = async (
  client: SupabaseClient<Database>,
  { activityStatus }: { activityStatus: string },
) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .eq('activity_status', activityStatus);

  if (error) throw error;
  return data;
};

// 태그별 서버 목록 가져오기
export const getServersByTag = async (
  client: SupabaseClient<Database>,
  { tag }: { tag: string },
) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .ilike('tags', `%${tag}%`);

  if (error) throw error;
  return data;
};

// 🔥 설치 방법 ID 찾기 (mcp_install_methods 테이블에서)
export const findInstallMethodId = async (
  client: SupabaseClient<Database>,
  {
    original_server_id,
    selectedMethod
  }: {
    original_server_id: number;
    selectedMethod: any; // 선택된 설치 방법 객체
  },
) => {
  if (!selectedMethod) {
    console.log('⚠️ [findInstallMethodId] selectedMethod가 없음');
    return null;
  }

  console.log('🔍 [findInstallMethodId] 설치 방법 ID 찾기:', {
    original_server_id,
    'selectedMethod.command': selectedMethod.command,
    'selectedMethod.args': selectedMethod.args,
    'selectedMethod.is_zero_install': selectedMethod.is_zero_install
  });

  try {
    // 서버 ID와 설치 방법 정보로 매칭
    let query = client
      .from('mcp_install_methods')
      .select('id, command, args, is_zero_install')
      .eq('original_server_id', original_server_id);

    // command로 필터링 (null일 수도 있음)
    if (selectedMethod.command) {
      query = query.eq('command', selectedMethod.command);
    } else {
      query = query.is('command', null);
    }

    // zero-install 여부로 필터링
    if (selectedMethod.is_zero_install) {
      query = query.eq('is_zero_install', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [findInstallMethodId] 쿼리 실패:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ [findInstallMethodId] 매칭되는 설치 방법을 찾을 수 없음');
      return null;
    }

    // 여러 개 있으면 첫 번째 선택
    const method = data[0];
    console.log('✅ [findInstallMethodId] 설치 방법 ID 찾음:', {
      id: method.id,
      command: method.command,
      args: method.args,
      is_zero_install: method.is_zero_install
    });

    return method.id;
  } catch (error) {
    console.error('❌ [findInstallMethodId] 예외 발생:', error);
    return null;
  }
};

// 🔥 사용자 MCP 사용 기록 생성 (설치 시작)
export const createUserMcpUsage = async (
  client: SupabaseClient<Database>,
  {
    profile_id,
    original_server_id,
    install_method_id,
    config_id,
    user_platform = 'electron',
    user_client = 'oct-client',
    user_env_variables,
  }: {
    profile_id: string;
    original_server_id: number;
    install_method_id?: number | null;
    config_id?: number | null; // 🔥 config_id 추가
    user_platform?: string;
    user_client?: string;
    user_env_variables?: Record<string, string> | null;
  },
) => {
  console.log('🚀 [createUserMcpUsage] 설치 기록 생성:', {
    profile_id,
    original_server_id,
    install_method_id,
    config_id, // 🔥 config_id 로그 추가
    user_platform,
    user_client,
    user_env_variables
  });

  const { data, error } = await client
    .from('user_mcp_usage')
    .insert({
      profile_id,
      original_server_id,
      install_method_id,
      config_id, // 🔥 config_id 추가
      install_status: 'attempted',
      install_attempted_at: new Date().toISOString(),
      execution_status: 'never_run',
      user_platform,
      user_client,
      user_env_variables: user_env_variables || null,
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ [createUserMcpUsage] 설치 기록 생성 실패:', error);
    throw error;
  }
  
  console.log('✅ [createUserMcpUsage] 설치 기록 생성 완료:', data);
  return data;
};

// 🔥 사용자 MCP 설치 상태 업데이트 (설치 완료/실패)
export const updateUserMcpInstallStatus = async (
  client: SupabaseClient<Database>,
  {
    usage_id,
    install_status,
    install_error,
  }: {
    usage_id: number;
    install_status: 'success' | 'failed';
    install_error?: string | null;
  },
) => {
  console.log('📝 [updateUserMcpInstallStatus] 설치 상태 업데이트:', {
    usage_id,
    install_status,
    install_error
  });

  const updateData: any = {
    install_status,
    updated_at: new Date().toISOString(),
  };

  if (install_status === 'success') {
    updateData.install_completed_at = new Date().toISOString();
    updateData.install_error = null;
  } else if (install_status === 'failed') {
    updateData.install_error = install_error;
  }

  const { data, error } = await client
    .from('user_mcp_usage')
    .update(updateData)
    .eq('id', usage_id)
    .select()
    .single();
    
  if (error) {
    console.error('❌ [updateUserMcpInstallStatus] 설치 상태 업데이트 실패:', error);
    throw error;
  }
  
  console.log('✅ [updateUserMcpInstallStatus] 설치 상태 업데이트 완료:', data);
  return data;
};

// 🔥 사용자 MCP 실행 상태 업데이트 (서버 시작 시)
export const updateUserMcpExecutionStatus = async (
  client: SupabaseClient<Database>,
  {
    profile_id,
    original_server_id,
    execution_status,
    last_error,
  }: {
    profile_id: string;
    original_server_id: number;
    execution_status: 'running' | 'success' | 'failed';
    last_error?: string | null;
  },
) => {
  console.log('🚀 [updateUserMcpExecutionStatus] 실행 상태 업데이트:', {
    profile_id,
    original_server_id,
    execution_status,
    last_error
  });

  const updateData: any = {
    execution_status,
    last_run_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (execution_status === 'success') {
    updateData.last_error = null;
    // TODO: total_runs 증가 로직 구현 필요
  } else if (execution_status === 'failed') {
    updateData.last_error = last_error;
  }

  const { data, error } = await client
    .from('user_mcp_usage')
    .update(updateData)
    .eq('profile_id', profile_id)
    .eq('original_server_id', original_server_id)
    .select()
    .single();
    
  if (error) {
    console.error('❌ [updateUserMcpExecutionStatus] 실행 상태 업데이트 실패:', error);
    throw error;
  }
  
  console.log('✅ [updateUserMcpExecutionStatus] 실행 상태 업데이트 완료:', data);
  return data;
};

// 🔥 사용자의 MCP 서버 사용 기록 조회
export const getUserMcpUsageByServer = async (
  client: SupabaseClient<Database>,
  {
    profile_id,
    original_server_id,
  }: {
    profile_id: string;
    original_server_id: number;
  },
) => {
  console.log('🔍 [getUserMcpUsageByServer] 사용 기록 조회:', {
    profile_id,
    original_server_id
  });

  const { data, error } = await client
    .from('user_mcp_usage')
    .select('*')
    .eq('profile_id', profile_id)
    .eq('original_server_id', original_server_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) {
    console.error('❌ [getUserMcpUsageByServer] 사용 기록 조회 실패:', error);
    throw error;
  }
  
  console.log('📋 [getUserMcpUsageByServer] 사용 기록 조회 결과:', data);
  return data;
};

// 🔥 현재 로그인한 사용자의 profile_id 가져오기
export const getCurrentUserProfileId = async (client: SupabaseClient<Database>) => {
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ [getCurrentUserProfileId] 인증되지 않은 사용자:', authError);
    throw new Error('로그인이 필요합니다');
  }

  // user.id는 실제로는 profile_id와 동일함 (트리거에 의해 생성됨)
  console.log('👤 [getCurrentUserProfileId] 현재 사용자:', {
    user_id: user.id,
    profile_id: user.id // profile_id는 user_id와 동일
  });
  
  return user.id; // profile_id
};

// 🔥 사용자 MCP 설치 기록 삭제 (유연한 방식)
export const deleteUserMcpUsage = async (
  client: SupabaseClient<Database>,
  {
    profile_id,
    original_server_id,
    install_method_id,
  }: {
    profile_id: string;
    original_server_id: number;
    install_method_id?: number | null;
  },
) => {
  console.log('🗑️ [deleteUserMcpUsage] 설치 기록 삭제 시작:', {
    profile_id,
    original_server_id,
    install_method_id
  });

  // 🔍 먼저 해당 서버의 모든 기록 확인 (사용자별)
  const { data: allRecords, error: selectError } = await client
    .from('user_mcp_usage')
    .select(`
      id,
      install_method_id,
      install_status,
      install_attempted_at,
      install_completed_at,
      mcp_install_methods!install_method_id (
        id,
        command,
        is_zero_install
      )
    `)
    .eq('profile_id', profile_id)
    .eq('original_server_id', original_server_id);

  console.log('🔍 [deleteUserMcpUsage] 해당 서버의 모든 기록:', {
    '🔢 전체 기록 수': allRecords?.length || 0,
    '📊 기록 상세': allRecords
  });

  if (selectError) {
    console.error('❌ [deleteUserMcpUsage] 기록 조회 실패:', selectError);
    throw selectError;
  }

  if (!allRecords || allRecords.length === 0) {
    console.log('⚠️ [deleteUserMcpUsage] 해당 서버의 설치 기록이 없음');
    return [];
  }

  // 🔥 모든 기록 삭제 (성공/실패 관계없이)
  console.log('🎯 [deleteUserMcpUsage] 모든 기록 삭제 진행:', {
    '🔢 삭제 대상 수': allRecords.length,
    '📊 삭제 대상 상세': allRecords
  });

  // 🗑️ 실제 삭제 실행
  const targetIds = allRecords.map(record => record.id);
  const { data, error } = await client
    .from('user_mcp_usage')
    .delete()
    .in('id', targetIds)
    .select();
    
  if (error) {
    console.error('❌ [deleteUserMcpUsage] 설치 기록 삭제 실패:', error);
    throw error;
  }
  
  console.log('✅ [deleteUserMcpUsage] 설치 기록 삭제 완료:', {
    '🔢 삭제된 레코드 수': data?.length || 0,
    '📄 삭제된 데이터': data
  });
  
  // 🔥 삭제 후 검증 - 정말로 삭제되었는지 확인
  setTimeout(async () => {
    try {
      const { data: remainingRecords } = await client
        .from('user_mcp_usage')
        .select('id')
        .eq('profile_id', profile_id)
        .eq('original_server_id', original_server_id);
      
      if (remainingRecords && remainingRecords.length > 0) {
        console.warn('⚠️ [deleteUserMcpUsage] 삭제 후에도 남은 기록:', remainingRecords.length, '개');
      } else {
        console.log('✅ [deleteUserMcpUsage] 삭제 검증 완료 - 모든 기록 제거됨');
      }
    } catch (verifyError) {
      console.error('❌ [deleteUserMcpUsage] 삭제 검증 실패:', verifyError);
    }
  }, 1000);
  
  return data;
};

// 🔥 사용자의 특정 서버 설치 상태 확인 (성공한 설치만)
export const checkUserServerInstallStatus = async (
  client: SupabaseClient<Database>,
  {
    profile_id,
    original_server_id,
  }: {
    profile_id: string;
    original_server_id: number;
  },
) => {
  console.log('🔍 [checkUserServerInstallStatus] 설치 상태 확인:', {
    profile_id,
    original_server_id
  });

  const { data, error } = await client
    .from('user_mcp_usage')
    .select(`
      id,
      install_method_id,
      install_status,
      install_completed_at,
      execution_status,
      mcp_install_methods!install_method_id (
        id,
        command,
        is_zero_install
      )
    `)
    .eq('profile_id', profile_id)
    .eq('original_server_id', original_server_id)
    .eq('install_status', 'success') // 성공한 설치만
    .order('install_completed_at', { ascending: false });
    
  if (error) {
    console.error('❌ [checkUserServerInstallStatus] 설치 상태 확인 실패:', error);
    throw error;
  }
  
  console.log('📋 [checkUserServerInstallStatus] 설치 상태 확인 결과:', data);
  return data || [];
};

// 🔥 사용자의 모든 설치된 서버 목록 가져오기
export const getUserInstalledServers = async (
  client: SupabaseClient<Database>,
  {
    profile_id,
  }: {
    profile_id: string;
  },
) => {
  console.log('🔍 [getUserInstalledServers] 설치된 서버 목록 조회:', { profile_id });

  const { data, error } = await client
    .from('user_mcp_usage')
    .select(`
      *,
      mcp_install_methods!install_method_id (*),
      mcp_servers!original_server_id (*)
    `)
    .eq('profile_id', profile_id)
    .eq('install_status', 'success') // 성공한 설치만
    .order('install_completed_at', { ascending: false });
    
  if (error) {
    console.error('❌ [getUserInstalledServers] 설치된 서버 목록 조회 실패:', error);
    throw error;
  }
  
  console.log('📋 [getUserInstalledServers] 설치된 서버 목록:', data?.length || 0, '개');
  return data || [];
};

// 🔥 특정 서버 ID의 MCP 설정들 가져오기
export const getMcpConfigsByServerId = async (
  client: SupabaseClient<Database>,
  {
    original_server_id,
  }: {
    original_server_id: number;
  },
) => {
  console.log('🔧 [getMcpConfigsByServerId] 서버 설정 조회:', { original_server_id });

  const { data, error } = await client
    .from('mcp_configs')
    .select('*')
    .eq('original_server_id', original_server_id)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('❌ [getMcpConfigsByServerId] 서버 설정 조회 실패:', error);
    throw error;
  }
  
  console.log('🔧 [getMcpConfigsByServerId] 서버 설정 목록:', data?.length || 0, '개');
  return data || [];
};

// 🔥 사용자의 특정 서버 모든 설치 기록 확인 (uninstalled 포함)
export const getUserServerAllInstallRecords = async (
  client: SupabaseClient<Database>,
  {
    profile_id,
    original_server_id,
  }: {
    profile_id: string;
    original_server_id: number;
  },
) => {
  console.log('🔍 [getUserServerAllInstallRecords] 모든 설치 기록 확인:', {
    profile_id,
    original_server_id
  });

  const { data, error } = await client
    .from('user_mcp_usage')
    .select(`
      id,
      install_method_id,
      install_status,
      install_attempted_at,
      install_completed_at,
      execution_status,
      updated_at,
      mcp_install_methods!install_method_id (
        id,
        command,
        is_zero_install
      )
    `)
    .eq('profile_id', profile_id)
    .eq('original_server_id', original_server_id)
    .order('updated_at', { ascending: false });
    
  if (error) {
    console.error('❌ [getUserServerAllInstallRecords] 모든 설치 기록 확인 실패:', error);
    throw error;
  }
  
  console.log('📋 [getUserServerAllInstallRecords] 모든 설치 기록 결과:', {
    '🔢 총 기록 수': data?.length || 0,
    '📊 상태별 분류': data?.reduce((acc: any, record: any) => {
      acc[record.install_status] = (acc[record.install_status] || 0) + 1;
      return acc;
    }, {}),
    '📄 상세': data
  });
  
  return data || [];
};

// 🔥 사용자의 최근 성공한 환경변수 가져오기
export const getUserLatestEnvVariables = async (
  client: SupabaseClient<Database>,
  {
    profile_id,
    original_server_id,
    install_method_id,
  }: {
    profile_id: string;
    original_server_id: number;
    install_method_id?: number | null;
  },
) => {
  console.log('🔍 [getUserLatestEnvVariables] 최근 환경변수 조회:', {
    profile_id,
    original_server_id,
    install_method_id
  });

  let query = client
    .from('user_mcp_usage')
    .select('user_env_variables, install_completed_at, install_method_id')
    .eq('profile_id', profile_id)
    .eq('original_server_id', original_server_id)
    .eq('install_status', 'success')
    .not('user_env_variables', 'is', null)
    .order('install_completed_at', { ascending: false });

  // install_method_id가 지정된 경우 필터링
  if (install_method_id !== undefined) {
    if (install_method_id === null) {
      query = query.is('install_method_id', null);
    } else {
      query = query.eq('install_method_id', install_method_id);
    }
  }

  const { data, error } = await query.limit(1).single();
    
  if (error) {
    // 데이터가 없는 경우는 정상 (처음 설치)
    if (error.code === 'PGRST116') {
      console.log('📝 [getUserLatestEnvVariables] 이전 환경변수 없음 (처음 설치)');
      return null;
    }
    console.error('❌ [getUserLatestEnvVariables] 환경변수 조회 실패:', error);
    throw error;
  }
  
  console.log('✅ [getUserLatestEnvVariables] 이전 환경변수 조회 완료:', data?.user_env_variables);
  return data?.user_env_variables || null;
};
