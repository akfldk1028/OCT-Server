import { useCallback, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const useTheme = (): [Theme, (theme: Theme) => void] => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'dark'; // 기본값을 'dark'로 설정
  });

  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)',
    );
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        updateDocumentTheme(e.matches ? 'dark' : 'light');
      }
    };

    const updateDocumentTheme = (newTheme: 'light' | 'dark') => {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    // Set initial theme based on current mode
    if (theme === 'system') {
      updateDocumentTheme(darkModeMediaQuery.matches ? 'dark' : 'light');
    } else {
      updateDocumentTheme(theme);
    }

    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);

    return () => {
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, [theme]);

  const setThemeWithSideEffect = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme !== 'system') {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  }, []);
  return useMemo(
    () => [theme, setThemeWithSideEffect],
    [theme, setThemeWithSideEffect],
  );
};

export default useTheme;
