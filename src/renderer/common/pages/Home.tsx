import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">홈 페이지</h1>
      <p className="mb-4">앱에 오신 것을 환영합니다! 아래의 링크를 통해 이동해보세요.</p>
      <nav>
        <ul className="space-y-2">
          <li>
            <Link to="/auth/login" className="text-blue-600 hover:underline">
              로그인 페이지로 이동
            </Link>
          </li>
          <li>
            <Link to="/dashboard" className="text-blue-600 hover:underline">
              대시보드로 이동
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
