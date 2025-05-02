export const loader = async () => {
  try {
    // 일렉트론 환경에서는 IPC로 데이터를 가져오거나 localStorage 등을 활용
    // const userData = await window.electron.ipcRenderer.invoke('get-user-data');

    // 임시 예시 데이터
    const user = { id: '123', email: 'user@example.com' };
    const profile = {
      id: '123',
      name: '사용자',
      username: 'user123',
      avatar: null,
    };
    const notificationsCount = 0;

    return { user, profile, notificationsCount };
  } catch (error) {
    console.error('Error loading user data:', error);
    return { user: null, profile: null, notificationsCount: 0 };
  }
};

export const shouldRevalidate = ({
  nextUrl,
}: {
  nextUrl: { pathname: string };
}) => {
  return !nextUrl.pathname.includes('messages');
};
