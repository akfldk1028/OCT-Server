// config.ts 파일 생성
export interface AgentConfig {
  browserType: 'chrome' | 'firefox' | 'edge';
  browserPosition: string;
  customInstructions: string;
}

export const defaultConfig: AgentConfig = {
  browserType: 'chrome',
  browserPosition: '작업표시줄 왼쪽에서 세 번째',
  customInstructions: '항상 Chrome을 사용하고 Firefox를 찾지 마세요.',
};

// 설정 로드 함수
export function loadConfig(): AgentConfig {
  // 환경 변수에서 설정을 로드하거나 기본 설정 사용
  return {
    browserType: process.env.AGENT_BROWSER_TYPE as 'chrome' | 'firefox' | 'edge' || defaultConfig.browserType,
    browserPosition: process.env.AGENT_BROWSER_POSITION || defaultConfig.browserPosition,
    customInstructions: process.env.AGENT_CUSTOM_INSTRUCTIONS || defaultConfig.customInstructions,
  };
}

// system 프롬프트 생성 함수
export function generateSystemPrompt(config: AgentConfig): string {
  return `The user will ask you to perform a task and you should use their computer to do so. After each step, take a screenshot and carefully evaluate if you have achieved the right outcome. Explicitly show your thinking: "I have evaluated step X..." If not correct, try again. Only when you confirm a step was executed correctly should you move on to the next one. Note that you have to click into the browser address bar before typing a URL. You should always call a tool! Always return a tool call. Remember call the finish_run tool when you have achieved the goal of the task. Do not explain you have finished the task, just call the tool. Use keyboard shortcuts to navigate whenever possible.

브라우저로는 ${config.browserType === 'chrome' ? 'Chrome' : config.browserType === 'firefox' ? 'Firefox' : 'Edge'}을 사용합니다. ${config.browserType === 'chrome' ? 'Chrome' : config.browserType === 'firefox' ? 'Firefox' : 'Edge'} 아이콘은 ${config.browserPosition}에 위치해 있습니다. ${config.customInstructions}`;
}
