// 임시 디버그 스크립트 - 브라우저 콘솔에서 실행
// F12 > Console 탭에서 복붙해서 실행

console.log('🔍 [Debug] 현재 사용자 정보 확인 중...');

// 1. 현재 사용자 정보 확인
if (window.supabase) {
  window.supabase.auth.getUser().then(({ data: { user }, error }) => {
    if (error) {
      console.error('❌ [Debug] 사용자 정보 가져오기 실패:', error);
      return;
    }
    
    if (!user) {
      console.log('🚫 [Debug] 로그인하지 않음');
      return;
    }
    
    console.log('👤 [Debug] 현재 사용자:', {
      id: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      user_metadata: user.user_metadata
    });
    
    // 2. 프로필 확인
    window.supabase
      .from('profiles')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()
      .then(({ data: profile, error: profileError }) => {
        if (profileError) {
          console.error('❌ [Debug] 프로필 조회 실패:', profileError);
          return;
        }
        
        if (profile) {
          console.log('✅ [Debug] 프로필 존재함:', profile);
        } else {
          console.log('🚫 [Debug] 프로필 없음 - 수동 생성 테스트');
          
          // 3. 수동 프로필 생성 테스트
          const testProfile = {
            profile_id: user.id,
            name: user.user_metadata?.full_name || user.user_metadata?.name || '테스트 사용자',
            username: `test_${user.id.slice(-8)}`,
            avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            bio: null,
            headline: null,
            role: 'user'
          };
          
          console.log('🔧 [Debug] 수동 프로필 생성 시도:', testProfile);
          
          window.supabase
            .from('profiles')
            .insert(testProfile)
            .select()
            .single()
            .then(({ data: newProfile, error: insertError }) => {
              if (insertError) {
                console.error('❌ [Debug] 프로필 생성 실패:', insertError);
                
                // RLS 정책 확인
                if (insertError.message?.includes('RLS') || insertError.message?.includes('policy')) {
                  console.log('🔒 [Debug] RLS 정책 문제로 보임');
                }
                
                // 권한 확인
                if (insertError.message?.includes('permission') || insertError.message?.includes('access')) {
                  console.log('🔐 [Debug] 권한 문제로 보임');
                }
              } else {
                console.log('✅ [Debug] 프로필 생성 성공!', newProfile);
              }
            });
        }
      });
  });
} else {
  console.error('❌ [Debug] window.supabase 없음');
}