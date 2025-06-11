// src/main/store/aiActions.ts
import { BetaMessage, BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { BrowserWindow, desktopCapturer, screen } from 'electron';
import { OverlayState, GuideStep } from '../../stores/overlay/overlay-types';
import { anthropic } from '../antropic/anthropic';
import { hideWindowBlock } from '../../window';

// 스크린샷 관련 함수들
function getScreenDimensions(): { width: number; height: number } {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.size;
}

function getAiScaledScreenDimensions(): { width: number; height: number } {
  const { width, height } = getScreenDimensions();
  const aspectRatio = width / height;

  let scaledWidth: number;
  let scaledHeight: number;

  // 🔥 성능 최적화: 이미지 크기를 더 작게 조정 (1280x800 → 960x600)
  if (aspectRatio > 960 / 600) {
    scaledWidth = 960;
    scaledHeight = Math.round(960 / aspectRatio);
  } else {
    scaledHeight = 600;
    scaledWidth = Math.round(600 * aspectRatio);
  }

  console.log('📏 [getAiScaledScreenDimensions] 최적화된 크기:', { 
    original: { width, height }, 
    scaled: { width: scaledWidth, height: scaledHeight },
    reduction: `${Math.round((1 - (scaledWidth * scaledHeight) / (width * height)) * 100)}%`
  });

  return { width: scaledWidth, height: scaledHeight };
}

// 🔥 Window-Specific 스크린샷 캡처 + 창 정보 반환
const getScreenshotWithWindowInfo = async (): Promise<{ 
  screenshot: string; 
  windowInfo?: any 
}> => {
  try {
    const { combinedStore } = require('../../stores/combinedStore');
    const windowState = combinedStore.getState().window;
    const targetWindow = windowState?.targetWindowInfo;
    
    console.log('📸 [getScreenshotWithWindowInfo] 창 정보:', targetWindow?.name);
    
    if (targetWindow && windowState?.captureTargetWindow) {
      // 선택된 창만 캡처
      const screenshot = await windowState.captureTargetWindow();
      return { 
        screenshot, 
        windowInfo: targetWindow 
      };
    }
    
    // 폴백: 전체 화면 캡처
    const screenshot = await fallbackScreenshot();
    return { screenshot };
    
  } catch (error) {
    console.error('❌ [getScreenshotWithWindowInfo] 실패:', error);
    const screenshot = await fallbackScreenshot();
    return { screenshot };
  }
};

// 폴백 전체 화면 캡처
const fallbackScreenshot = async (): Promise<string> => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const aiDimensions = getAiScaledScreenDimensions();

  return hideWindowBlock(async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    });
    const primarySource = sources[0];

    if (primarySource) {
      const screenshot = primarySource.thumbnail;
      const resizedScreenshot = screenshot.resize(aiDimensions);
      const base64Image = resizedScreenshot.toPNG().toString('base64');
      return base64Image;
    }
    throw new Error('No display found for screenshot');
  });
};

// 🔥 창 정보를 포함한 프롬프트 생성
const promptForGuideWithWindow = async (
  runHistory: BetaMessageParam[],
  screenshotData: string,
  targetWindow?: any
): Promise<BetaMessageParam> => {
  
  const windowContext = targetWindow && targetWindow.width && targetWindow.height ? `
🎯 현재 분석 중인 창 정보:
- 창 이름: ${targetWindow.name || '알 수 없음'}
- 창 크기: ${targetWindow.width} x ${targetWindow.height} 픽셀

⚠️ 매우 중요한 좌표 규칙:
1. 스크린샷은 이 창만 캡처된 것입니다 (전체 화면이 아님!)
2. 스크린샷에서 보이는 UI 요소의 위치를 정확히 파악하세요
3. x, y 좌표는 스크린샷의 왼쪽 상단을 (0, 0)으로 하는 픽셀 좌표입니다
4. 가이드는 사용자가 클릭해야 하는 버튼이나 UI 요소 바로 옆에 배치하세요
5. 가이드 크기는 340x200 픽셀이므로 창 밖으로 나가지 않게 주의하세요

📏 좌표 예시:
- 창 크기: ${targetWindow.width} x ${targetWindow.height}
- 왼쪽 상단 영역: x: 20-150, y: 20-100
- 오른쪽 상단 영역: x: ${Math.max(150, targetWindow.width-400)}-${targetWindow.width-50}, y: 20-100
- 중앙 영역: x: ${Math.floor(targetWindow.width/2)-170}-${Math.floor(targetWindow.width/2)+170}, y: ${Math.floor(targetWindow.height/2)-100}-${Math.floor(targetWindow.height/2)+100}

🔍 분석 방법:
1. 스크린샷에서 사용자가 상호작용해야 할 UI 요소를 찾으세요
2. 그 요소의 정확한 픽셀 위치를 측정하세요
3. 가이드를 그 요소 근처(위, 아래, 옆)에 배치하세요
4. 여러 단계가 있으면 순서대로 배치하되 겹치지 않게 하세요
` : '스크린샷 전체를 기준으로 절대 좌표를 사용하세요.';

  // 히스토리에서 이미지 제외
  const historyWithoutImages = runHistory.map((msg, index) => {
    if (index === runHistory.length - 1) return msg;
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content.map((item) => {
          if (item.type === 'tool_result' && typeof item.content !== 'string') {
            return {
              ...item,
              content: item.content?.filter((c) => c.type !== 'image'),
            };
          }
          return item;
        }),
      };
    }
    return msg;
  });

  // 마지막 메시지에 스크린샷 추가
  const lastUserMessageIndex = historyWithoutImages.length - 1;
  if (lastUserMessageIndex >= 0 && historyWithoutImages[lastUserMessageIndex].role === 'user') {
    const userQuestion = historyWithoutImages[lastUserMessageIndex].content;
    historyWithoutImages[lastUserMessageIndex] = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: typeof userQuestion === 'string' ? userQuestion : '화면을 분석하고 안내해주세요.',
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: screenshotData,
          },
        },
      ],
    };
  }

  const message = await anthropic.beta.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: `당신은 소프트웨어 인터페이스 가이드 생성 전문가입니다.

${windowContext}

다음 JSON 형식으로 단계별 가이드를 제공하세요:
\`\`\`json
{
  "steps": [
    {
      "stepNumber": "1",
      "title": "단계 제목",
      "description": "자세한 설명 (마크다운 지원)",
      "x": 100,     // 상대 좌표 (창 기준) 또는 절대 좌표
      "y": 100,     // 상대 좌표 (창 기준) 또는 절대 좌표
      "width": 300,
      "height": 200,
      "arrowPosition": "top"  // top, bottom, left, right
    }
  ]
}
\`\`\`

가이드 작성 규칙:
1. 사용자가 클릭하거나 상호작용해야 하는 UI 요소 근처에 가이드를 배치하세요.
2. 여러 단계가 있다면 순서대로 진행하기 쉽게 배치하세요.
3. 가이드가 서로 겹치지 않도록 적절히 간격을 두세요.
4. 설명은 명확하고 간결하게 작성하세요.`,
    messages: historyWithoutImages,
  });

  return { content: message.content, role: message.role };
};

// 🔥 AI 좌표 검증 및 디버깅 강화
function adjustStepsForWindow(steps: GuideStep[], targetWindow?: any): GuideStep[] {
  if (!targetWindow) {
    console.log('⚠️ [adjustStepsForWindow] 창 정보 없음, 원본 좌표 사용');
    return steps;
  }
  
  console.log('🎯 [adjustStepsForWindow] AI 좌표 검증 시작:', {
    windowName: targetWindow.name,
    windowSize: { width: targetWindow.width, height: targetWindow.height },
    steps: steps.length,
    aiSteps: steps.map(s => ({ id: s.id, x: s.x, y: s.y, title: s.title }))
  });
  
  return steps.map((step, index) => {
    const originalX = step.x;
    const originalY = step.y;
    
    // 🔥 AI가 제공한 좌표 검증
    let x = typeof step.x === 'number' ? step.x : 50;
    let y = typeof step.y === 'number' ? step.y : 50;
    
    const overlayWidth = step.width || 340;
    const overlayHeight = step.height || 200;
    
    // 🔥 좌표 유효성 검사
    const isValidX = x >= 0 && x <= targetWindow.width - 50;
    const isValidY = y >= 0 && y <= targetWindow.height - 50;
    
    if (!isValidX || !isValidY) {
      console.warn(`⚠️ [Step ${step.id}] 좌표가 창 범위를 벗어남:`, {
        original: { x: originalX, y: originalY },
        windowSize: { width: targetWindow.width, height: targetWindow.height },
        isValidX,
        isValidY
      });
      
      // 안전한 위치로 이동
      if (!isValidX) x = Math.max(20, Math.min(x, targetWindow.width - overlayWidth - 20));
      if (!isValidY) y = Math.max(20, Math.min(y, targetWindow.height - overlayHeight - 20));
    }
    
    // 음수 방지
    x = Math.max(0, x);
    y = Math.max(0, y);
    
    console.log(`📍 [Step ${step.id}] 좌표 검증 완료:`, {
      title: step.title,
      original: { x: originalX, y: originalY },
      final: { x, y },
      adjusted: originalX !== x || originalY !== y
    });
    
    return {
      ...step,
      x,
      y,
      width: overlayWidth,
      height: overlayHeight
    };
  });
}

// 응답에서 단계 추출 (기존 함수 유지)
export function extractStepsFromResponse(message: BetaMessage): GuideStep[] {
  const content = message.content;
  const contentText = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.filter(item => item.type === 'text').map(item => item.text).join('\n')
      : '';

  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/i;
  const jsonMatch = contentText.match(jsonBlockRegex);

  let parsed: any = null;

  try {
    if (jsonMatch && jsonMatch[1]) {
      parsed = JSON.parse(jsonMatch[1].trim());
    } else {
      const inlineJsonMatch = contentText.match(/\{\s*"steps"[\s\S]*\}$/m);
      if (inlineJsonMatch) {
        parsed = JSON.parse(inlineJsonMatch[0]);
      }
    }
  } catch (e) {
    console.warn('⚠️ JSON 파싱 실패:', e);
  }

  if (!parsed || !Array.isArray(parsed.steps)) {
    console.warn('⚠️ steps 배열을 찾지 못해 기본 단계로 대체합니다.');
    return [
      {
        id: '1',
        stepNumber: '1',
        title: '가이드 준비 중',
        description: contentText.substring(0, 500),
        x: 100,
        y: 100,
        width: 300,
        height: 200,
        type: 'tooltip',
        arrowPosition: 'top',
      },
    ];
  }

  let steps: any[] = parsed.steps;

  // 중첩 JSON 해제
  if (
    steps.length === 1 &&
    typeof steps[0].description === 'string' &&
    steps[0].description.trim().startsWith('{')
  ) {
    try {
      const innerParsed = JSON.parse(steps[0].description);
      if (Array.isArray(innerParsed.steps)) {
        steps = innerParsed.steps;
      }
    } catch {
      // 무시
    }
  }

  return steps.map((step, idx) => ({
    id: step.id?.toString() ?? (idx + 1).toString(),
    stepNumber: step.stepNumber?.toString() ?? (idx + 1).toString(),
    title: step.title ?? `단계 ${idx + 1}`,
    description: (step.description as string) ?? '',
    x: typeof step.x === 'number' ? step.x : 100,
    y: typeof step.y === 'number' ? step.y : 100 + idx * 50,
    width: typeof step.width === 'number' ? step.width : 300,
    height: typeof step.height === 'number' ? step.height : 200,
    type: step.type ?? 'tooltip',
    arrowPosition: step.arrowPosition ?? 'top',
    shortcut: step.shortcut,
  }));
}

// 🔥 메인 실행 함수 - 성능 최적화 및 메모리 모니터링 추가
export const runAgent = async (
  setState: (state: OverlayState) => void,
  getState: () => OverlayState,
) => {
  // 🔥 성능 모니터링 시작
  const startTime = Date.now();
  const initialMemory = process.memoryUsage();
  
  console.log('🚀 [runAgent] 시작 - 성능 모니터링:', {
    software: getState().activeSoftware,
    question: getState().instructions,
    initialMemory: {
      rss: `${Math.round(initialMemory.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`
    }
  });

  setState({
    ...getState(),
    running: true,
    runHistory: [{ role: 'user', content: getState().instructions ?? '' }],
    error: null,
  });

  let screenshot: string | null = null;
  let windowInfo: any = null;

  try {
    // 🔥 1단계: 스크린샷 캡처 (메모리 효율적으로)
    console.log('📸 [runAgent] 스크린샷 캡처 시작...');
    const captureStartTime = Date.now();
    
    try {
      // 기존 TAKE_SCREENSHOT 액션 사용
      const screenshotPath = await getState().TAKE_SCREENSHOT(() => {}, () => {});
      
      if (screenshotPath && typeof screenshotPath === 'string') {
        // 🔥 비동기 파일 읽기로 안전하게 처리
        const fs = require('fs').promises;
        const screenshotBuffer = await fs.readFile(screenshotPath);
        screenshot = screenshotBuffer.toString('base64');
        
        // 🔥 임시 파일 정리 (메모리 절약)
        try {
          await fs.unlink(screenshotPath);
        } catch (unlinkError) {
          console.warn('⚠️ 임시 파일 삭제 실패:', unlinkError);
        }
      } else {
        throw new Error('스크린샷 경로가 유효하지 않음');
      }
    } catch (screenshotError) {
      console.warn('⚠️ [runAgent] TAKE_SCREENSHOT 실패, 폴백 사용:', screenshotError);
      // 폴백: 기존 방식 사용
      const fallbackResult = await getScreenshotWithWindowInfo();
      screenshot = fallbackResult.screenshot;
      windowInfo = fallbackResult.windowInfo;
    }
    
    const captureTime = Date.now() - captureStartTime;
    const captureMemory = process.memoryUsage();
    
    console.log('📸 [runAgent] 캡처 완료:', {
      captureTime: `${captureTime}ms`,
      screenshotSize: screenshot ? `${Math.round(screenshot.length / 1024)}KB` : '0KB',
      memoryAfterCapture: `${Math.round(captureMemory.heapUsed / 1024 / 1024)}MB`
    });

    // 🔥 2단계: 창 정보 가져오기
    if (!windowInfo) {
      try {
        const { combinedStore } = require('../../stores/combinedStore');
        const windowState = combinedStore.getState().window;
        windowInfo = windowState?.targetWindowInfo;
      } catch (windowError) {
        console.warn('⚠️ [runAgent] 창 정보 가져오기 실패:', windowError);
      }
    }

    // 🔥 3단계: AI 분석 (메모리 사용량 모니터링)
    console.log('🤖 [runAgent] AI 분석 시작...');
    const aiStartTime = Date.now();
    
    const message = await promptForGuideWithWindow(
      getState().runHistory,
      screenshot!,
      windowInfo
    );

    const aiTime = Date.now() - aiStartTime;
    const aiMemory = process.memoryUsage();
    
    console.log('🤖 [runAgent] AI 분석 완료:', {
      aiTime: `${aiTime}ms`,
      memoryAfterAI: `${Math.round(aiMemory.heapUsed / 1024 / 1024)}MB`
    });

    // 🔥 스크린샷 메모리 해제 (더 이상 필요 없음)
    screenshot = null;

    setState({
      ...getState(),
      runHistory: [...getState().runHistory, message],
    });

    // 🔥 4단계: 응답 파싱 및 좌표 조정
    const steps = extractStepsFromResponse(message as BetaMessage);
    const adjustedSteps = windowInfo ? 
      adjustStepsForWindow(steps, windowInfo) : 
      steps;

    setState({
      ...getState(),
      guideSteps: adjustedSteps,
      running: false,
    });

    // 🔥 5단계: 가이드 표시
    await getState().SHOW_GUIDE({
      software: getState().activeSoftware,
      steps: adjustedSteps,
    });

    // 🔥 성능 모니터링 완료
    const totalTime = Date.now() - startTime;
    const finalMemory = process.memoryUsage();
    
    console.log('✅ [runAgent] 완료 - 성능 리포트:', {
      totalTime: `${totalTime}ms`,
      stepCount: adjustedSteps.length,
      windowAdjusted: !!windowInfo,
      memoryUsage: {
        initial: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
        final: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
        peak: `${Math.round(Math.max(captureMemory.heapUsed, aiMemory.heapUsed, finalMemory.heapUsed) / 1024 / 1024)}MB`
      }
    });

    // 🔥 가비지 컬렉션 강제 실행 (메모리 정리)
    if (global.gc) {
      global.gc();
      console.log('🧹 [runAgent] 가비지 컬렉션 실행됨');
    }

  } catch (error: unknown) {
    console.error('❌ [runAgent] 실행 실패:', error);
    
    // 🔥 에러 시에도 메모리 정리
    screenshot = null;
    if (global.gc) {
      global.gc();
    }
    
    setState({
      ...getState(),
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      running: false,
    });
  }
};

// 🔥 processGuide 함수도 수정
export async function processGuide(
  set: (state: Partial<any>) => void,
  get: () => any,
  payload: { software: string, question: string }
) {
  let { software, question } = payload;
  console.log('🤖 [processGuide] 호출됨:', { software, question });
  
  try {
    set({
      instructions: question,
      fullyAuto: !get().isGuideMode
    });
    
    if (get().fullyAuto) {
      console.log('🤖 [processGuide] 자동 모드에서 RUN_AGENT_OVERLAY 호출');
      const runAgentResult = await get().RUN_AGENT_OVERLAY();
      return { success: true, result: runAgentResult };
    } else {
      if (!get().isGuideMode) {
        return { success: false, error: 'Guide mode is disabled' };
      }
      
      // 소프트웨어 자동 감지
      if (!software || software === 'unknown') {
        const activeWindow = await get().DETECT_ACTIVE_SOFTWARE();
        software = activeWindow.software;
      }
      
      // 🔥 가이드 생성은 runAgent에서 처리하므로 여기서는 기본 가이드만 표시
      await get().SHOW_GUIDE({
        software,
        question,
        steps: [], // runAgent에서 채워짐
      });
      
      // runAgent 호출
      await runAgent(set, get);
      
      return { success: true };
    }
  } catch (error: any) {
    console.error('❌ [processGuide] 오류:', error);
    set({ error: `가이드 처리 오류: ${error.message}` });
    return { success: false, error: error.message };
  }
}