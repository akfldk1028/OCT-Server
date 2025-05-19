// src/main/store/aiActions.ts
import { BetaMessage, BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { BrowserWindow, desktopCapturer, screen } from 'electron';
import { AppState, GuideStep } from '../../../common/types/overlay-types';
import { anthropic } from '../antropic/anthropic';
import { hideWindowBlock } from '../../window';
import { RootState } from '@/common/types/root-types';

// 스크린샷 관련 함수들 - runAgent.ts와 동일
function getScreenDimensions(): { width: number; height: number } {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.size;
}

function getAiScaledScreenDimensions(): { width: number; height: number } {
  const { width, height } = getScreenDimensions();
  const aspectRatio = width / height;

  let scaledWidth: number;
  let scaledHeight: number;

  if (aspectRatio > 1280 / 800) {
    // Width is the limiting factor
    scaledWidth = 1280;
    scaledHeight = Math.round(1280 / aspectRatio);
  } else {
    // Height is the limiting factor
    scaledHeight = 800;
    scaledWidth = Math.round(800 * aspectRatio);
  }

  return { width: scaledWidth, height: scaledHeight };
}

const getScreenshot = async (): Promise<string> => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const aiDimensions = getAiScaledScreenDimensions();

  return hideWindowBlock(async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    });
    const primarySource = sources[0]; // Assuming the first source is the primary display

    if (primarySource) {
      const screenshot = primarySource.thumbnail;
      // Resize the screenshot to AI dimensions
      const resizedScreenshot = screenshot.resize(aiDimensions);
      // Convert the resized screenshot to a base64-encoded PNG
      const base64Image = resizedScreenshot.toPNG().toString('base64');
      return base64Image;
    }
    throw new Error('No display found for screenshot');
  });
};

// Claude API를 사용하여 가이드 생성
const promptForGuide = async (
  runHistory: BetaMessageParam[],
  screenshotData: string,
): Promise<BetaMessageParam> => {
  // 이미지 포함 없이 모든 히스토리 메시지 보존
  const historyWithoutImages = runHistory.map((msg, index) => {
    if (index === runHistory.length - 1) return msg; // Keep the last message intact
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

  // 마지막 사용자 메시지에 스크린샷 추가
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

  // Claude API 호출
  const message = await anthropic.beta.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: `당신은 소프트웨어 인터페이스 가이드 생성 전문가입니다. 사용자가 제공한 스크린샷을 분석하고 인터페이스 사용 방법에 대한 단계별 가이드를 제공하세요.

다음 JSON 형식으로 응답해 주세요:
\`\`\`json
{
  "steps": [
    {
      "stepNumber": "1",
      "title": "단계 제목",
      "description": "자세한 설명",
      "x": 100,
      "y": 100,
      "arrowPosition": "top"
    },
    // 추가 단계...
  ]
}
\`\`\`

각 단계에 대해:
1. stepNumber: 단계 번호를 명확하게 표시해 주세요 (1, 2, 3 등).
2. title: 간결한 제목을 제공하세요.
3. description: 자세한 설명을 제공하세요. 코드나 명령어가 포함된 경우 \`코드\` 형식으로 표시할 수 있습니다.
4. x, y: 말풍선의 화면 좌표를 지정하세요. 관련 UI 요소 근처에 배치하세요.
5. arrowPosition: "top", "bottom", "left", "right" 중 하나로 지정하세요. 이는 말풍선의 화살표가 가리키는 방향입니다.

항상 JSON 응답을 제공하고, 불필요한 설명은 생략하세요.`,
    messages: historyWithoutImages,
  });

  return { content: message.content, role: message.role };
};

// 응답에서 단계 추출

export function extractStepsFromResponse(message: BetaMessage): GuideStep[] {
  // 1. 메시지에서 텍스트로 변환
  const content = message.content;
  const contentText = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.filter(item => item.type === 'text').map(item => item.text).join('\n')
      : '';

  // 2. ```json``` 블록 우선 추출
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/i;
  const jsonMatch = contentText.match(jsonBlockRegex);

  let parsed: any = null;

  try {
    if (jsonMatch && jsonMatch[1]) {
      // JSON 블록 파싱
      parsed = JSON.parse(jsonMatch[1].trim());
    } else {
      // 블록이 없으면 순수 JSON 전체 찾기 시도
      const inlineJsonMatch = contentText.match(/\{\s*"steps"[\s\S]*\}$/m);
      if (inlineJsonMatch) {
        parsed = JSON.parse(inlineJsonMatch[0]);
      }
    }
  } catch (e) {
    console.warn('⚠️ JSON 파싱 실패, fallback으로 기본 구조 사용:', e);
  }

  // 3. parsed가 없거나 steps가 배열이 아니면 기본 steps 생성
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
        shortcut: undefined,
      },
    ];
  }

  let steps: any[] = parsed.steps;

  // 4. 중첩 JSON 해제: steps가 한 개이고, description이 JSON 문자열이면 inner.steps 사용
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
      // inner 파싱 실패 시 무시
    }
  }

  // 5. GuideStep 타입에 맞춰 매핑 & 디폴트 값 채우기
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

export const runAgent = async (
  setState: (state: AppState) => void,
  getState: () => AppState,
) => {
  // 1) 실행 시작
  setState({
    ...getState(),
    running: true,
    runHistory: [{ role: 'user', content: getState().instructions ?? '' }],
    error: null,
  });

  console.log(
    '🤖 [메인 Overlay Store] RUN_AGENT 호출됨!',
    {
      software: getState().activeSoftware,
      question: getState().instructions,
      pid: process.pid,
      time: new Date().toISOString(),
    }
  );

  try {
    // 2) AI에게 가이드 요청
    const message = await promptForGuide(
      getState().runHistory,
      await getScreenshot()
    );

    // 3) 히스토리 업데이트
    setState({
      ...getState(),
      runHistory: [...getState().runHistory, message],
    });

    // 4) 응답에서 steps 파싱
    const steps = extractStepsFromResponse(message as BetaMessage);

    // 5) 상태에 guideSteps 저장 & running 끄기
    setState({
      ...getState(),
      guideSteps: steps,
      running: false,
    });

    console.log('🤖 [메인 Overlay Store] RUN_AGENT 결과:', steps);
    console.log('🔍 [디버깅] SHOW_GUIDE 함수:', getState().SHOW_GUIDE);
    console.log('🔍 [디버깅] isGuideMode 상태:', getState().isGuideMode);

    // 6) 전체 오버레이 한 번에 띄우기
    await getState().SHOW_GUIDE({
      software: getState().activeSoftware,
      steps,
    });
    // (선택) 바로 다음 단계로 강조하고 싶다면
    // await getState().NEXT_STEP();

  } catch (error: unknown) {
    setState({
      ...getState(),
      error:
        error instanceof Error
          ? error.message
          : 'An unknown error occurred',
      running: false,
    });
  }
};


export async function processGuide(
  set: (state: Partial<RootState>) => void,
  get: () => RootState,
  payload: { software: string, question: string }
) {
  let { software, question } = payload;
  console.log('🤖 [메인 Overlay Store] PROCESS_GUIDE 호출됨!', { software, question, pid: process.pid, time: new Date().toISOString() });
  try {
    set({
      instructions: question,
      fullyAuto: !get().isGuideMode
    });
    if (get().fullyAuto) {
      console.log('🤖 [메인 Overlay Store] 자동 모드에서 RUN_AGENT 호출 시도');
      const runAgentResult = await get().RUN_AGENT_OVERLAY();
      console.log('🤖 [메인 Overlay Store] RUN_AGENT 결과:', runAgentResult);
      return { success: true, result: runAgentResult };
    } else {
      if (!get().isGuideMode) {
        return { success: false, error: 'Guide mode is disabled' };
      }
      if (!software || software === 'unknown') {
        const activeWindow = await get().DETECT_ACTIVE_SOFTWARE();
        software = activeWindow.software;
      }
      const mainWindow = BrowserWindow.getFocusedWindow();
      if (!mainWindow)
        return { success: false, error: 'No main window available' };
      const hideWindow = () => mainWindow.hide();
      const showWindow = () => mainWindow.show();
      const screenshotPath = await get().TAKE_SCREENSHOT(
        hideWindow,
        showWindow,
      );
      const screenshotData = await get().GET_IMAGE_PREVIEW(screenshotPath);
      await get().SHOW_GUIDE({
        software,
        question,
        steps: [],
      });
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error processing guide in Overlay Store:', error);
    set({ error: `가이드 처리 오류 (Overlay): ${error.message}` });
    return { success: false, error: error.message };
  }
}