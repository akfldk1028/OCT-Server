// 공통 프로필 생성 유틸리티 (main/renderer 모두 사용 가능)
import type { SupabaseClient } from '@supabase/supabase-js';

interface UserData {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

// 🔥 안전한 username 생성 (중복 확인 + 에러 핸들링)
export const generateUniqueUsername = async (
  client: SupabaseClient<any>,
  baseEmail: string,
  maxAttempts: number = 10
): Promise<string> => {
  // 입력값 정규화
  const baseUsername = (baseEmail || 'user')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'user'; // 최대 20자로 제한
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const testUsername = attempt === 0 
        ? baseUsername 
        : `${baseUsername}${Math.floor(Math.random() * 10000)}`;
      
      const { data: existingUser, error } = await client
        .from('profiles')
        .select('username')
        .eq('username', testUsername)
        .maybeSingle();
      
      if (error) {
        console.warn(`⚠️ [generateUniqueUsername] DB 조회 오류 (시도 ${attempt + 1}):`, error);
        continue; // 다음 시도로 넘어감
      }
      
      if (!existingUser) {
        return testUsername;
      }
      
    } catch (error) {
      console.warn(`⚠️ [generateUniqueUsername] 예외 발생 (시도 ${attempt + 1}):`, error);
      // 계속 시도
    }
  }
  
  // 최종 fallback (타임스탬프로 고유성 보장)
  const fallbackUsername = `${baseUsername}_${Date.now()}`;
  console.log(`🔄 [generateUniqueUsername] 최종 fallback 사용: ${fallbackUsername}`);
  return fallbackUsername;
};

// 🔥 OAuth 사용자 프로필 자동 생성 (main/renderer 공통)
export const createUserProfileIfNotExists = async (
  client: SupabaseClient<any>,
  user: UserData,
  debugLog?: (message: string) => void
) => {
  const log = debugLog || console.log;
  
  // 입력 데이터 검증
  if (!user?.id) {
    const error = new Error('유효하지 않은 사용자 데이터: user.id가 없습니다');
    log(`❌ [createUserProfile] ${error.message}`);
    throw error;
  }
  
  try {
    // 1. 이미 존재하는지 확인
    const { data: existingProfile, error: checkError } = await client
      .from('profiles')
      .select('profile_id')
      .eq('profile_id', user.id)
      .maybeSingle();
    
    if (checkError) {
      log(`❌ [createUserProfile] 프로필 확인 중 DB 오류: ${JSON.stringify(checkError)}`);
      throw checkError;
    }
    
    if (existingProfile) {
      log(`ℹ️ [createUserProfile] 프로필이 이미 존재함: ${user.email || user.id}`);
      return existingProfile;
    }
    
    log(`🔧 [createUserProfile] 프로필 없음 - 자동 생성 시도: ${user.email || user.id}`);
    
    // 2. 고유한 username 생성 (재시도 포함)
    let username: string;
    try {
      username = await generateUniqueUsername(client, user.email || `user_${user.id.slice(-8)}`);
    } catch (usernameError) {
      log(`⚠️ [createUserProfile] username 생성 실패, fallback 사용: ${JSON.stringify(usernameError)}`);
      username = `user_${user.id.slice(-8)}_${Date.now()}`;
    }
    
    // 3. 프로필 생성 (user_id 필수)
    const profileData = {
      profile_id: user.id,
      user_id: user.id,  // 🔥 복원: DB 트리거 없음, 수동 설정 필요
      name: user.user_metadata?.full_name || user.user_metadata?.name || '사용자',
      username,
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      bio: null,
      headline: null,
      role: 'developer' as const
    };
    
    const { data: newProfile, error: profileError } = await client
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      // 구체적인 에러 메시지 제공
      if (profileError.code === '23505') {
        log(`❌ [createUserProfile] 중복 키 에러 (username: ${username}): ${profileError.message}`);
      } else {
        log(`❌ [createUserProfile] 프로필 생성 실패: ${JSON.stringify(profileError)}`);
      }
      throw profileError;
    }

    log(`✅ [createUserProfile] 프로필 자동 생성 완료: ${newProfile.name} (${username})`);
    return newProfile;
    
  } catch (error: any) {
    // 타입별 에러 처리
    if (error.message?.includes('duplicate key')) {
      log(`❌ [createUserProfile] 중복 키 에러 - 다시 시도가 필요할 수 있습니다`);
    } else if (error.message?.includes('network')) {
      log(`❌ [createUserProfile] 네트워크 오류 - 연결을 확인하세요`);
    } else {
      log(`❌ [createUserProfile] 알 수 없는 오류: ${JSON.stringify(error)}`);
    }
    
    throw error;
  }
};