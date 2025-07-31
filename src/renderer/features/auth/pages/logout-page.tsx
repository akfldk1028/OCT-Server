import { makeSSRClient, supabase } from "../../../supa-client";
import { type LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { IS_ELECTRON } from "../../../utils/environment";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    console.log('🔥 [logout] 로그아웃 시작');

    if (IS_ELECTRON && typeof window !== 'undefined' && window.electron) {
      // 일렉트론 환경: IPC로 로그아웃 처리
      console.log('🔥 [logout] 일렉트론 환경 - IPC로 로그아웃 요청');
      
      const result = await window.electron.ipcRenderer.invoke('auth:logout');
      console.log('🔥 [logout] IPC 로그아웃 결과:', result);
    } else {
      // 웹 환경: 직접 로그아웃
      console.log('🔥 [logout] 웹 환경 - 직접 로그아웃');
      await supabase.auth.signOut();
    }
    
    console.log('🔥 [logout] 로그아웃 완료 - 홈으로 리다이렉트');
    return redirect("/");
  } catch (error) {
    console.error('🔥 [logout] 로그아웃 실패:', error);
    // 에러가 발생해도 홈으로 리다이렉트
    return redirect("/");
  }
};
