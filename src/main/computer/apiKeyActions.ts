// src/main/store/apiKeyActions.ts
export function addApiKeyActions(set: (state: any) => void, get: () => any) {
    return {

      // API 키 관련 액션
      INIT_API_KEY: () => {
        // 환경 변수에서 API 키 로드
        if (process.env.ANTHROPIC_API_KEY) {
          get().SET_API_KEY(process.env.ANTHROPIC_API_KEY, '환경 변수');
          console.log('✅ Anthropic API 키가 환경 변수에서 로드되었습니다');
        } else {
          console.log('⚠️ Anthropic API 키가 설정되지 않았습니다');
          set({ apiKeySource: '없음' });
        }
      },
      
      SET_API_KEY: (key: string, source?: string) => {
        if (!key || key.trim() === '') {
          console.warn('빈 API 키가 설정되려고 했습니다');
          return;
        }
        const trimmedKey = key.trim();
        const sourceValue = source || '사용자 설정';
        console.log(`API 키가 설정되었습니다: ${trimmedKey.substring(0, 4)}...`);
        set({ apiKey: trimmedKey, apiKeySource: sourceValue });
      },
      
      GET_API_KEY_STATUS: () => {
        const state = get();
        return {
          isSet: !!state.apiKey && state.apiKey.trim() !== '',
          source: state.apiKeySource,
        };
      },
      
      IS_API_KEY_SET: () => {
        const state = get();
        return !!state.apiKey && state.apiKey.trim() !== '';
      },
    };
  }