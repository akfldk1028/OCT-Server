import { z } from 'zod';
import { redirect } from 'react-router';
import { type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { makeSSRClient, supabase } from '../../../supa-client';

const paramsSchema = z.object({
  provider: z.enum(['github', 'kakao']),
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw error;
  }
  return redirect('/');
};

export default function SocialCompletePage() {
  return <div>소셜 로그인 처리 완료</div>;
}
