import {
  Outlet,
  useOutletContext,
  type LoaderFunctionArgs,
} from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 채팅 관련 초기 데이터 로딩 로직 (필요시)
  return {};
};

export default function ChatLayout() {
  const context = useOutletContext<{
    isLoggedIn: boolean;
    name?: string;
    userId?: string;
    username?: string;
    avatar?: string | null;
    email?: string;
    servers?: any[];
    clients?: any[];
  }>();
  
  return (
    <div className="flex flex-col h-full">
      {/* 채팅 헤더 (필요시) */}
      <div className="flex-1 overflow-hidden">
        <Outlet context={context} />
      </div>
    </div>
  );
} 