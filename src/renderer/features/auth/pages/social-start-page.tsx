// import { z } from 'zod';
// import { type LoaderFunctionArgs, type MetaFunction } from 'react-router';
// import { redirect } from 'react-router';
// import { makeSSRClient, supabase } from '../../../supa-client';

// const paramsSchema = z.object({
//   provider: z.enum(['github', 'kakao']),
// });

// export const loader = async ({ params, request }: LoaderFunctionArgs) => {
//   const { success, data } = paramsSchema.safeParse(params);
//   console.log(success, data);
//   if (!success) {
//     return redirect('/auth/login');
//   }
//   const { provider } = data;

//   console.log(provider);
//   const redirectTo = `/auth/social/${provider}/complete`;

//   const {
//     data: { url },
//     error,
//   } = await supabase.auth.signInWithOAuth({
//     provider,
//     options: {
//       redirectTo,
//     },
//   });
//   if (url) {
//     return redirect(url);
//   }
//   if (error) {
//     throw error;
//   }
// };

// social-start-page.tsx
import { z } from 'zod';
import { type LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { supabase } from '@/renderer/supa-client';

const paramsSchema = z.object({
  provider: z.enum(['github', 'kakao', 'google']),
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { success, data } = paramsSchema.safeParse(params);
  
  if (!success) {
    return redirect('/auth/login');
  }
  
  const { provider } = data;

  try {
    // 일렉트론 환경에서는 IPC로 처리
    if (window.electron) {
      const result = await window.electron.ipcRenderer.invoke('auth:social-login', provider);
      
      if (result.success) {
        return redirect('/');
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } else {
      // 웹 환경에서는 기존 방식 사용
      const { data: { url }, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `/auth/social/${provider}/complete`,
        },
      });
      
      if (url) {
        return redirect(url);
      }
      
      if (error) {
        throw error;
      }
    }
  } catch (error) {
    console.error('Social login error:', error);
    return redirect('/auth/login');
  }
};