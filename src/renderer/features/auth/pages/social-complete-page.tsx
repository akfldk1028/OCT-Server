import { z } from 'zod';
import { redirect } from 'react-router';
import { type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { makeSSRClient, supabase } from '../../../supa-client';
import { createUserProfileIfNotExists } from '../../../../common/utils/profile-utils';

const paramsSchema = z.object({
  provider: z.enum(['github', 'kakao', 'google']),
});

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { success } = paramsSchema.safeParse(params);
  console.log(success, params);
  if (!success) {
    return redirect('/auth/login');
  }
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return redirect('/auth/login');
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw error;
  }

  // 🔥 OAuth 완료 후 프로필이 없으면 자동 생성
  if (data.user) {
    try {
      await createUserProfileIfNotExists(supabase as any, data.user, console.log);
    } catch (profileError) {
      console.error('❌ [Social Complete] 프로필 처리 실패:', profileError);
      // 프로필 생성 실패해도 로그인은 진행
    }
  }

  return redirect('/');
};

export default function SocialCompletePage() {
  return <div>소셜 로그인 처리 완료</div>;
}
