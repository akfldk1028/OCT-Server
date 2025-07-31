// src/main/store/aiActions.ts
import { BetaMessage, BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { BrowserWindow, desktopCapturer, screen } from 'electron';
import { OverlayState, GuideStep } from '../../stores/overlay/overlay-types';
import { anthropic } from '../antropic/anthropic';
import { hideWindowBlock } from '../../window';

// 🔥 메모리 효율적인 스크린샷 캐시 시스템
const screenshotCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 2000; // 2초 캐시
const MAX_CACHE_SIZE = 3; // 최대 3개 캐시

// 🔥 캐시 정리 함수
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of screenshotCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      screenshotCache.delete(key);
    }
  }
  
  // 크기 제한
  if (screenshotCache.size > MAX_CACHE_SIZE) {
    const oldestKey = screenshotCache.keys().next().value;
    if (oldestKey) {
      screenshotCache.delete(oldestKey);
    }
  }
};

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

  // 🔥 성능 최적화: 이미지 크기를 더 작게 조정 (1280x800 → 720x450)
  if (aspectRatio > 720 / 450) {
    scaledWidth = 720;
    scaledHeight = Math.round(720 / aspectRatio);
  } else {
    scaledHeight = 450;
    scaledWidth = Math.round(450 * aspectRatio);
  }

  // 🔥 개발 환경에서만 상세 로그 출력
  if (process.env.NODE_ENV === 'development') {
    console.log('📏 [getAiScaledScreenDimensions] 최적화된 크기:', { 
      original: { width, height }, 
      scaled: { width: scaledWidth, height: scaledHeight },
      reduction: `${Math.round((1 - (scaledWidth * scaledHeight) / (width * height)) * 100)}%`
    });
  }

  return { width: scaledWidth, height: scaledHeight };
}

// 🔥 Window-Specific 스크린샷 캡처 + 창 정보 반환
const getScreenshotWithWindowInfo = async (): Promise<{ 
  screenshot: string; 
  windowInfo?: any 
}> => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  try {
    const { combinedStore } = require('../../stores/combinedStore');
    const windowState = combinedStore.getState().window;
    const targetWindow = windowState?.targetWindowInfo;
    
    console.log('📸 [getScreenshotWithWindowInfo] 창 정보:', targetWindow?.name);
    
    let screenshot: string;
    let windowInfo: any = null;
    
    if (targetWindow && windowState?.captureTargetWindow) {
      // 선택된 창만 캡처
      screenshot = await windowState.captureTargetWindow();
      windowInfo = targetWindow;
    } else {
      // 폴백: 전체 화면 캡처
      screenshot = await fallbackScreenshot();
    }
    
    // 🔥 성능 및 메모리 모니터링
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external
    };
    
    // 🔥 PNG→JPEG 변환 (Anthropic API 호환성을 위해)
    const { nativeImage } = require('electron');
    try {
      const buffer = Buffer.from(screenshot, 'base64');
      const image = nativeImage.createFromBuffer(buffer);
      const jpegBuffer = image.toJPEG(75); // 75% 품질로 JPEG 변환
      screenshot = jpegBuffer.toString('base64');
      
      console.log('📸 [getScreenshotWithWindowInfo] PNG→JPEG 변환 완료:', {
        originalSize: `${Math.round(buffer.length / 1024)}KB`,
        compressedSize: `${Math.round(jpegBuffer.length / 1024)}KB`,
        compression: `${Math.round((1 - jpegBuffer.length / buffer.length) * 100)}% 절약`
      });
    } catch (convertError) {
      console.warn('⚠️ [getScreenshotWithWindowInfo] 이미지 변환 실패:', convertError);
      // 변환 실패 시 원본 사용 (최악의 경우 대비)
    }

    console.log('📊 [getScreenshotWithWindowInfo] 성능 리포트:', {
      duration: `${endTime - startTime}ms`,
      memoryDelta: {
        rss: `${Math.round(memoryDelta.rss / 1024 / 1024 * 100) / 100}MB`,
        heapUsed: `${Math.round(memoryDelta.heapUsed / 1024 / 1024 * 100) / 100}MB`,
        external: `${Math.round(memoryDelta.external / 1024 / 1024 * 100) / 100}MB`
      },
      screenshotSize: `${Math.round(screenshot.length / 1024)}KB`,
      windowType: windowInfo ? 'targeted' : 'fullscreen'
    });
    
    // 🔥 메모리 정리 (큰 스크린샷 처리 후)
    if (global.gc) {
      global.gc();
      console.log('🧹 [getScreenshotWithWindowInfo] 가비지 컬렉션 실행');
    }
    
    return { screenshot, windowInfo };
    
  } catch (error) {
    console.error('❌ [getScreenshotWithWindowInfo] 실패:', error);
    const screenshot = await fallbackScreenshot();
    return { screenshot };
  }
};

// 🔥 캐시 키 생성 함수
const getCacheKey = (windowInfo?: any): string => {
  if (windowInfo) {
    return `window_${windowInfo.id}_${windowInfo.x}_${windowInfo.y}`;
  }
  return 'fullscreen';
};

// 폴백 전체 화면 캡처 (캐시 적용)
const fallbackScreenshot = async (): Promise<string> => {
  const cacheKey = getCacheKey();
  
  // 🔥 캐시 확인
  cleanupCache();
  const cached = screenshotCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📸 [fallbackScreenshot] 캐시에서 반환');
    return cached.data;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const aiDimensions = getAiScaledScreenDimensions();

  try {
    const result = await hideWindowBlock(async () => {
      // 🔥 타임아웃 추가 (5초)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Screenshot timeout')), 5000);
      });
      
      const screenshotPromise = (async () => {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: aiDimensions, // 🔥 최적화: 처음부터 작은 크기로 캡처
        });
        const primarySource = sources[0];

        if (primarySource) {
          const screenshot = primarySource.thumbnail;
          
          // 🔥 최적화: JPEG 압축 사용 (PNG보다 50-70% 작음)
          const jpegBuffer = screenshot.toJPEG(75); // 75% 품질 (AI 분석에 충분, 더 작은 파일)
          const base64Image = jpegBuffer.toString('base64');
          
          if (process.env.NODE_ENV === 'development') {
            console.log('📸 [fallbackScreenshot] 압축 완료:', {
              originalSize: `${width}x${height}`,
              compressedSize: `${aiDimensions.width}x${aiDimensions.height}`,
              format: 'JPEG 75%',
              dataSize: `${Math.round(base64Image.length / 1024)}KB`
            });
          }
          
          return base64Image;
        }
        throw new Error('No display found for screenshot');
      })();
      
      return Promise.race([screenshotPromise, timeoutPromise]);
    });
    
    // 🔥 캐시에 저장
    screenshotCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ [fallbackScreenshot] 실패:', error);
    
    // 🔥 에러 복구: 더 작은 크기로 재시도
    try {
      console.log('🔄 [fallbackScreenshot] 더 작은 크기로 재시도...');
      const smallerDimensions = { width: 480, height: 300 };
      
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: smallerDimensions,
      });
      
      if (sources[0]) {
        const jpegBuffer = sources[0].thumbnail.toJPEG(60);
        const base64Image = jpegBuffer.toString('base64');
        
        console.log('✅ [fallbackScreenshot] 복구 성공');
        return base64Image;
      }
    } catch (retryError) {
      console.error('❌ [fallbackScreenshot] 복구 실패:', retryError);
    }
    
    throw error;
  }
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
            media_type: 'image/jpeg', // 🔥 JPEG 형식으로 변경
            data: screenshotData,
          },
        },
      ],
    };
  }

  // 🔥 AI 요청 최적화
  const startAITime = Date.now();
  const message = await anthropic.beta.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 800, // 🔥 토큰 절약: 1024 → 800
    system: `소프트웨어 가이드 생성 전문가입니다.

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

규칙:
1. UI 요소 근처에 가이드 배치
2. 순서대로 진행하기 쉽게 배치
3. 겹치지 않게 간격 유지
4. 명확하고 간결한 설명`,
    messages: historyWithoutImages,
  });

  // 🔥 AI 응답 시간 측정
  const aiTime = Date.now() - startAITime;
  if (process.env.NODE_ENV === 'development') {
    console.log(`🤖 [promptForGuideWithWindow] AI 응답 시간: ${aiTime}ms`);
  }

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

  console.log('🔍 [extractStepsFromResponse] AI 응답 내용:', {
    contentLength: contentText.length,
    preview: contentText.substring(0, 200) + '...'
  });

  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/i;
  const jsonMatch = contentText.match(jsonBlockRegex);

  let parsed: any = null;

  try {
    if (jsonMatch && jsonMatch[1]) {
      console.log('✅ [extractStepsFromResponse] JSON 블록 발견');
      parsed = JSON.parse(jsonMatch[1].trim());
    } else {
      console.log('🔍 [extractStepsFromResponse] 인라인 JSON 검색 중...');
      const inlineJsonMatch = contentText.match(/\{\s*"steps"[\s\S]*\}$/m);
      if (inlineJsonMatch) {
        console.log('✅ [extractStepsFromResponse] 인라인 JSON 발견');
        parsed = JSON.parse(inlineJsonMatch[0]);
      } else {
        console.warn('⚠️ [extractStepsFromResponse] JSON 형식을 찾을 수 없음');
      }
    }
  } catch (e) {
    console.warn('⚠️ [extractStepsFromResponse] JSON 파싱 실패:', e);
    console.log('📄 [extractStepsFromResponse] 파싱 실패한 내용:', jsonMatch ? jsonMatch[1] : '매치된 내용 없음');
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
        const { nativeImage } = require('electron');
        
        const screenshotBuffer = await fs.readFile(screenshotPath);
        
        // 🔥 PNG를 JPEG로 변환 (Anthropic API 호환성을 위해)
        const image = nativeImage.createFromBuffer(screenshotBuffer);
        const jpegBuffer = image.toJPEG(75); // 75% 품질로 JPEG 변환
        screenshot = jpegBuffer.toString('base64');
        
        console.log('📸 [runAgent] PNG→JPEG 변환 완료:', {
          originalSize: `${Math.round(screenshotBuffer.length / 1024)}KB`,
          compressedSize: `${Math.round(jpegBuffer.length / 1024)}KB`,
          compression: `${Math.round((1 - jpegBuffer.length / screenshotBuffer.length) * 100)}% 절약`
        });
        
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
    console.log('📋 [runAgent] AI 응답 파싱 결과:', {
      originalSteps: steps.length,
      stepTitles: steps.map(s => s.title)
    });
    
    const adjustedSteps = windowInfo ? 
      adjustStepsForWindow(steps, windowInfo) : 
      steps;

    console.log('🎯 [runAgent] 좌표 조정 완료:', {
      adjustedSteps: adjustedSteps.length,
      windowAdjusted: !!windowInfo
    });

    setState({
      ...getState(),
      guideSteps: adjustedSteps,
      running: false,
    });

    // 🔥 5단계: 가이드 표시
    if (adjustedSteps.length > 0) {
      console.log('🎯 [runAgent] 가이드 표시 시작...');
      const showResult = await getState().SHOW_GUIDE({
        software: getState().activeSoftware,
        steps: adjustedSteps,
      });
      console.log('✅ [runAgent] 가이드 표시 결과:', showResult);
    } else {
      console.warn('⚠️ [runAgent] 가이드 스텝이 없어 표시하지 않음');
    }

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