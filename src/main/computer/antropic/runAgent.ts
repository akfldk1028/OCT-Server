import {
  BetaMessage,
  BetaMessageParam,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
// import { createCanvas, loadImage } from 'canvas';
import { desktopCapturer, screen } from 'electron';
import { APIError } from '@anthropic-ai/sdk';
import { anthropic } from './anthropic';
import { AppState, NextAction } from '../../../common/types/action-types';
import { extractAction } from './extractAction';
import { hideWindowBlock, showWindow } from '../../window';
import { EditTool } from './editTool';
import path from 'path';

// webpack 우회를 위한 require
declare const __non_webpack_require__: NodeRequire;
const requireNode: NodeRequire = typeof __non_webpack_require__ === 'function' ? __non_webpack_require__ : require;

function safeRequire(moduleName: string) {
  try {
    return requireNode(moduleName);
  } catch (e) {
    try {
      const fallback = path.resolve(__dirname, '../../../../release/app/node_modules', moduleName);
      return requireNode(fallback);
    } catch (e2) {
      throw e;
    }
  }
}

// nut-js 모듈 동적 로딩
let nutjs: any = null;
let Button: any, Key: any, keyboard: any, mouse: any, Point: any;

try {
  nutjs = safeRequire('@nut-tree-fork/nut-js');
  ({ Button, Key, keyboard, mouse, Point } = nutjs);
  console.log('✅ @nut-tree-fork/nut-js 로드 성공');
} catch (e) {
  console.warn('⚠️ @nut-tree-fork/nut-js 로드 실패:', e);
}

// 설정을 사용하는 promptForAction 함수
import { loadConfig, generateSystemPrompt } from './config';

const editTool = new EditTool();

const editToolDef = {
  type: 'text_editor_20250124',
  name: 'str_replace_editor',
};

const MAX_STEPS = 50;

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

const mapToAiSpace = (x: number, y: number) => {
  const { width, height } = getScreenDimensions();
  const aiDimensions = getAiScaledScreenDimensions();
  return {
    x: (x * aiDimensions.width) / width,
    y: (y * aiDimensions.height) / height,
  };
};

const mapFromAiSpace = (x: number, y: number) => {
  const { width, height } = getScreenDimensions();
  const aiDimensions = getAiScaledScreenDimensions();
  return {
    x: (x * width) / aiDimensions.width,
    y: (y * height) / aiDimensions.height,
  };
};


// const promptForAction = async (
//   runHistory: BetaMessageParam[],
// ): Promise<BetaMessageParam> => {
//   // Strip images from all but the last message
//   const historyWithoutImages = runHistory.map((msg, index) => {
//     if (index === runHistory.length - 1) return msg; // Keep the last message intact
//     if (Array.isArray(msg.content)) {
//       return {
//         ...msg,
//         content: msg.content.map((item) => {
//           if (item.type === 'tool_result' && typeof item.content !== 'string') {
//             return {
//               ...item,
//               content: item.content?.filter((c) => c.type !== 'image'),
//             };
//           }
//           return item;
//         }),
//       };
//     }
//     return msg;
//   });
//
//   const message = await anthropic.beta.messages.create({
//     model: 'claude-3-5-sonnet-20241022',
//     max_tokens: 1024,
//     tools: [
//       {
//         type: 'computer_20241022',
//         name: 'computer',
//         display_width_px: getAiScaledScreenDimensions().width,
//         display_height_px: getAiScaledScreenDimensions().height,
//         display_number: 1,
//       },
//       {
//         name: 'finish_run',
//         description:
//           'Call this function when you have achieved the goal of the task.',
//         input_schema: {
//           type: 'object',
//           properties: {
//             success: {
//               type: 'boolean',
//               description: 'Whether the task was successful',
//             },
//             error: {
//               type: 'string',
//               description: 'The error message if the task was not successful',
//             },
//           },
//           required: ['success'],
//         },
//       },
//     ],
//     system: `The user will ask you to perform a task and you should use their computer to do so. After each step, take a screenshot and carefully evaluate if you have achieved the right outcome. Explicitly show your thinking: "I have evaluated step X..." If not correct, try again. Only when you confirm a step was executed correctly should you move on to the next one. Note that you have to click into the browser address bar before typing a URL. You should always call a tool! Always return a tool call. Remember call the finish_run tool when you have achieved the goal of the task. Do not explain you have finished the task, just call the tool. Use keyboard shortcuts to navigate whenever possible.`,
//     messages: historyWithoutImages,
//     betas: ['computer-use-2024-10-22'],
//   });
//
//   return { content: message.content, role: message.role };
// };


const promptForAction = async (
  runHistory: BetaMessageParam[],
): Promise<BetaMessageParam> => {
  // 설정 로드
  const config = loadConfig();

  // 시스템 프롬프트 생성
  const systemPrompt = generateSystemPrompt(config);

  // 이미지 제거 코드
  const historyWithoutImages = runHistory.map((msg, index) => {
    if (index === runHistory.length - 1) return msg; // 마지막 메시지는 그대로 유지
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

  try {
    // 최신 도구 버전 시도
    const message = await anthropic.beta.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1024,
      tools: [
        {
          type: 'computer_20250124',
          name: 'computer',
          display_width_px: getAiScaledScreenDimensions().width,
          display_height_px: getAiScaledScreenDimensions().height,
          display_number: 1,
        },
        {
          name: 'finish_run',
          description:
            'Call this function when you have achieved the goal of the task.',
          input_schema: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Whether the task was successful',
              },
              error: {
                type: 'string',
                description: 'The error message if the task was not successful',
              },
            },
            required: ['success'],
          },
        },
      ],
      system: systemPrompt,
      messages: historyWithoutImages,
      betas: ['computer-use-2025-01-24'],
    });

    return { content: message.content, role: message.role };
  } catch (error) {
    console.log(
      'Error with newer computer tool version, falling back to older version:',
      error,
    );

    // 이전 버전으로 폴백
    const message = await anthropic.beta.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      tools: [
        {
          type: 'computer_20241022',
          name: 'computer',
          display_width_px: getAiScaledScreenDimensions().width,
          display_height_px: getAiScaledScreenDimensions().height,
          display_number: 1,
        },
        {
          name: 'finish_run',
          description:
            'Call this function when you have achieved the goal of the task.',
          input_schema: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Whether the task was successful',
              },
              error: {
                type: 'string',
                description: 'The error message if the task was not successful',
              },
            },
            required: ['success'],
          },
        },
      ],
      system: `The user will ask you to perform a task and you should use their computer to do so. After each step, take a screenshot and carefully evaluate if you have achieved the right outcome. Explicitly show your thinking: "I have evaluated step X..." If not correct, try again. Only when you confirm a step was executed correctly should you move on to the next one. Note that you have to click into the browser address bar before typing a URL. You should always call a tool! Always return a tool call. Remember call the finish_run tool when you have achieved the goal of the task. Do not explain you have finished the task, just call the tool. Use keyboard shortcuts to navigate whenever possible.`,
      messages: historyWithoutImages,
      betas: ['computer-use-2024-10-22'],
    });

    return { content: message.content, role: message.role };
  }
};
// 유틸리티 함수들
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mapKey(keyText: string | undefined): any | undefined {
  if (!keyText || !Key) return undefined;

  const keyMap: Record<string, any> = {
    Return: Key.Enter,
    Enter: Key.Enter,
    Tab: Key.Tab,
    Escape: Key.Escape,
    Esc: Key.Escape,
    Control: Key.LeftControl,
    Ctrl: Key.LeftControl,
    Alt: Key.LeftAlt,
    Shift: Key.LeftShift,
    Super: Key.LeftSuper,
    // 필요에 따라 더 많은 키 추가
  };

  return keyMap[keyText];
}

export const performAction = async (action: NextAction) => {
  // nut-js 모듈이 로드되지 않았으면 에러
  if (!nutjs || !mouse || !keyboard || !Button || !Key || !Point) {
    throw new Error('@nut-tree-fork/nut-js 모듈이 로드되지 않았습니다');
  }

  switch (action.type) {
    case 'mouse_move':
      const { x, y } = mapFromAiSpace(action.x, action.y);
      await mouse.setPosition(new Point(x, y));
      break;
    case 'left_click_drag':
      const { x: dragX, y: dragY } = mapFromAiSpace(action.x, action.y);
      const currentPosition = await mouse.getPosition();
      await mouse.drag([currentPosition, new Point(dragX, dragY)]);
      break;

    case 'cursor_position':
      const position = await mouse.getPosition();
      const aiPosition = mapToAiSpace(position.x, position.y);
      // TODO: actually return the position
      break;
    case 'left_click':
      await mouse.leftClick();
      break;
    case 'right_click':
      await mouse.rightClick();
      break;
    case 'middle_click':
      await mouse.click(Button.MIDDLE);
      break;
    case 'double_click':
      await mouse.doubleClick(Button.LEFT);
      break;
    case 'triple_click': {
      if (action.x !== undefined && action.y !== undefined) {
        const { x, y } = mapFromAiSpace(action.x, action.y);
        await mouse.setPosition(new Point(x, y));
      }
      if (action.key) {
        const key = mapKey(action.key);
        if (key) await keyboard.pressKey(key);
      }
      // 세 번 클릭
      await mouse.click(Button.LEFT);
      await delay(10);
      await mouse.click(Button.LEFT);
      await delay(10);
      await mouse.click(Button.LEFT);
      if (action.key) {
        const key = mapKey(action.key);
        if (key) await keyboard.releaseKey(key);
      }
      break;
    }

    case 'left_mouse_down':
      await mouse.pressButton(Button.LEFT);
      break;

    case 'left_mouse_up':
      await mouse.releaseButton(Button.LEFT);
      break;

    case 'scroll': {
      // 필요한 경우 좌표로 이동
      if (action.coordinate) {
        const [aiX, aiY] = action.coordinate;
        const { x, y } = mapFromAiSpace(aiX, aiY);
        await mouse.setPosition(new Point(x, y));
      }
      for (let i = 0; i < action.scroll_amount; i++) {
        switch (action.scroll_direction) {
          case 'up':
            await mouse.scrollUp(action.scroll_amount);
            break;
          case 'down':
            await mouse.scrollDown(action.scroll_amount);
            break;
          case 'left':
            await mouse.scrollLeft(action.scroll_amount);
            break;
          case 'right':
            await mouse.scrollRight(action.scroll_amount);
            break;
        }
      }
      break;
    }

    case 'hold_key': {
      const key = mapKey(action.text);
      if (!key) throw new Error(`Unknown key: ${action.text}`);
      await keyboard.pressKey(key);
      await delay(action.duration * 1000);
      await keyboard.releaseKey(key);
      break;
    }

    // case 'wait':
    //   await delay(action.duration * 1000);
    //   break;

    case 'type': {
      keyboard.config.autoDelayMs = 0;
      await keyboard.type(action.text);
      keyboard.config.autoDelayMs = 500;
      break;
    }

    case 'key': {
      const keys = action.text.split('+').map(k => {
        const mapped = mapKey(k);
        if (!mapped) throw new Error(`Unknown key: ${k}`);
        return mapped;
      });
      await keyboard.pressKey(...keys);
      for (const k of keys) await keyboard.releaseKey(k);
      break;
    }

    case 'screenshot':
      // noop
      break;

    case 'finish':
      // 완료
      break;

    case 'error':
      throw new Error(action.message);

    default:
      // 타입 가드 통과를 위해 never 처리
      const _exhaust: never = action;
      throw new Error(`Unsupported action: ${JSON.stringify(_exhaust)}`);
  }
};
/**
 * 주어진 promise가 timeoutMs 내에 완료되지 않으면 reject합니다.
 */
function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TimeoutError'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
const MAX_HISTORY = 8;
// d
export const runAgent = async (
  setState: (state: AppState) => void,
  getState: () => AppState,
) => {
  setState({
    ...getState(),
    running: true,
    runHistory: [{ role: 'user', content: getState().instructions ?? '' }],
    error: null,
  });

  while (getState().running) {
    // Add this check at the start of the loop
    if (getState().runHistory.length >= MAX_STEPS * 2) {
      setState({
        ...getState(),
        error: 'Maximum steps exceeded',
        running: false,
      });
      break;
    }

    try {
      let message: BetaMessageParam | null = null;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      while (!message && retryCount < MAX_RETRIES) {
        try {
          let startIndex = getState().runHistory.length - MAX_HISTORY;
          if (startIndex < 0) startIndex = 0;

          // 2) 만약 startIndex 위치 메시지가 tool_result 라면,
          //    그 이전 메시지(인덱스 startIndex-1)도 포함
          const history = getState().runHistory;
          if (
            history[startIndex] &&
            Array.isArray(history[startIndex].content) &&
            history[startIndex].content[0].type === 'tool_result'
          ) {
            startIndex = Math.max(0, startIndex - 1);
          }
          const recentHistory = history.slice(startIndex);

          message = await promiseWithTimeout(
            promptForAction(recentHistory),
            15000,
          );
          console.log(
            '🛎 Claude raw message:',
            JSON.stringify(message, null, 2),
          );




        } catch (e) {
          if (e instanceof APIError && e.status === 429) {
            // RateLimitError: retry-after 헤더 읽어서 대기
            const waitSec = parseInt(e.headers['retry-after'] || '15', 10);
            console.warn(`Rate limited. retry after ${waitSec}s`);
            await new Promise((r) => setTimeout(r, waitSec * 1000));
            retryCount++;
            continue;
          }
          // 1) Claude API에서 400이 떨어졌다면, 재시도하지 말고 에러를 그대로 던진다
          if (e instanceof APIError && e.status === 400) {
            throw e;
          }
          // 2) 진짜 타임아웃(TimeoutError)이거나 네트워크 에러라면 스크린샷 재전송
          console.warn(
            `[WARN] Claude 응답 없음. 스크린샷 재전송 (${retryCount + 1}/${MAX_RETRIES})`,
          );
          const screenshot = await getScreenshot();
          setState({
            ...getState(),
            runHistory: [
              ...getState().runHistory,
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Retrying due to timeout. Here is a new screenshot.',
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/png',
                      data: screenshot,
                    },
                  },
                ],
              },
            ],
          });
          retryCount++;
        }
      }

      if (!message) {
        setState({
          ...getState(),
          error: 'Claude did not respond after multiple retries.',
          running: false,
        });
        break; // ✅ 이제 루프 안이라 OK
      }
      setState({
        ...getState(),
        runHistory: [...getState().runHistory, message],
      });
      const { action, reasoning, toolId } = extractAction(
        message as BetaMessage,
      );

      console.log('REASONING', reasoning);
      console.log('ACTION', action);
      if (toolId === 'str_replace_editor') {
        // action 은 EditInput 타입입니다.
        const resultText = await editTool.run(action as any /* EditInput */);
        // runHistory 에 편집 결과 추가
        setState({
          ...getState(),
          runHistory: [
            ...getState().runHistory,
            {
              role: 'user',
              content: `Edit result:\n\n${resultText}`,
            },
          ],
        });
        continue; // 다음 루프로 넘어감
      }

      if (action.type === 'screenshot') {
        const screenshot = await getScreenshot();
        setState({
          ...getState(),
          runHistory: [
            ...getState().runHistory,
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolId, // ← extractAction에서 받은 toolId
                  content: [
                    {
                      type: 'text',
                      text: 'Here is the screenshot you requested',
                    },
                    {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: 'image/png',
                        data: screenshot,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        });
        continue;
      }
      if (action.type === 'error') {
        setState({
          ...getState(),
          error: action.message,
          running: false,
        });
        break;
      } else if (action.type === 'finish') {
        setState({
          ...getState(),
          running: false,
        });
        break;
      }
      if (!getState().running) {
        break;
      }

      hideWindowBlock(() => performAction(action));

      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!getState().running) {
        break;
      }

      setState({
        ...getState(),
        runHistory: [
          ...getState().runHistory,
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolId,
                content: [
                  {
                    type: 'text',
                    text: 'Here is the screenshot after the action was executed',
                  },
                ],
              },
            ],
          },
        ],
      });
    } catch (error: unknown) {
      setState({
        ...getState(),
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
        running: false,
      });
      break;
    }
  }
};




// import {
//   BetaMessage,
//   BetaMessageParam,
// } from '@anthropic-ai/sdk/resources/beta/messages/messages';
// import { Button, Key, keyboard, mouse, Point } from '@nut-tree-fork/nut-js';

// // import { createCanvas, loadImage } from 'canvas';
// import { desktopCapturer, screen } from 'electron';
// import { anthropic } from './anthropic';
// import { AppState, NextAction } from '../../../common/types/action-types';
// import { extractAction } from './extractAction';
// import { hideWindowBlock, showWindow } from '../../window';
// import { RootState } from '../overlay/create';

// const MAX_STEPS = 50;

// function getScreenDimensions(): { width: number; height: number } {
//   const primaryDisplay = screen.getPrimaryDisplay();
//   return primaryDisplay.size;
// }

// function getAiScaledScreenDimensions(): { width: number; height: number } {
//   const { width, height } = getScreenDimensions();
//   const aspectRatio = width / height;

//   let scaledWidth: number;
//   let scaledHeight: number;

//   if (aspectRatio > 1280 / 800) {
//     // Width is the limiting factor
//     scaledWidth = 1280;
//     scaledHeight = Math.round(1280 / aspectRatio);
//   } else {
//     // Height is the limiting factor
//     scaledHeight = 800;
//     scaledWidth = Math.round(800 * aspectRatio);
//   }

//   return { width: scaledWidth, height: scaledHeight };
// }

// const getScreenshot = async (): Promise<string> => {
//   const primaryDisplay = screen.getPrimaryDisplay();
//   const { width, height } = primaryDisplay.size;
//   const aiDimensions = getAiScaledScreenDimensions();

//   return hideWindowBlock(async () => {
//     const sources = await desktopCapturer.getSources({
//       types: ['screen'],
//       thumbnailSize: { width, height },
//     });
//     const primarySource = sources[0]; // Assuming the first source is the primary display

//     if (primarySource) {
//       const screenshot = primarySource.thumbnail;
//       // Resize the screenshot to AI dimensions
//       const resizedScreenshot = screenshot.resize(aiDimensions);
//       // Convert the resized screenshot to a base64-encoded PNG
//       const base64Image = resizedScreenshot.toPNG().toString('base64');
//       return base64Image;
//     }
//     throw new Error('No display found for screenshot');
//   });
// };

// const mapToAiSpace = (x: number, y: number) => {
//   const { width, height } = getScreenDimensions();
//   const aiDimensions = getAiScaledScreenDimensions();
//   return {
//     x: (x * aiDimensions.width) / width,
//     y: (y * aiDimensions.height) / height,
//   };
// };

// const mapFromAiSpace = (x: number, y: number) => {
//   const { width, height } = getScreenDimensions();
//   const aiDimensions = getAiScaledScreenDimensions();
//   return {
//     x: (x * width) / aiDimensions.width,
//     y: (y * height) / aiDimensions.height,
//   };
// };

// const promptForAction = async (
//   runHistory: BetaMessageParam[],
// ): Promise<BetaMessageParam> => {
//   // Strip images from all but the last message
//   const historyWithoutImages = runHistory.map((msg, index) => {
//     if (index === runHistory.length - 1) return msg; // Keep the last message intact
//     if (Array.isArray(msg.content)) {
//       return {
//         ...msg,
//         content: msg.content.map((item) => {
//           if (item.type === 'tool_result' && typeof item.content !== 'string') {
//             return {
//               ...item,
//               content: item.content?.filter((c) => c.type !== 'image'),
//             };
//           }
//           return item;
//         }),
//       };
//     }
//     return msg;
//   });

//   const message = await anthropic.beta.messages.create({
//     model: 'claude-3-5-sonnet-20241022',
//     max_tokens: 1024,
//     tools: [
//       {
//         type: 'computer_20241022',
//         name: 'computer',
//         display_width_px: getAiScaledScreenDimensions().width,
//         display_height_px: getAiScaledScreenDimensions().height,
//         display_number: 1,
//       },
//       {
//         name: 'finish_run',
//         description:
//           'Call this function when you have achieved the goal of the task.',
//         input_schema: {
//           type: 'object',
//           properties: {
//             success: {
//               type: 'boolean',
//               description: 'Whether the task was successful',
//             },
//             error: {
//               type: 'string',
//               description: 'The error message if the task was not successful',
//             },
//           },
//           required: ['success'],
//         },
//       },
//     ],
//     system: `The user will ask you to perform a task and you should use their computer to do so. After each step, take a screenshot and carefully evaluate if you have achieved the right outcome. Explicitly show your thinking: "I have evaluated step X..." If not correct, try again. Only when you confirm a step was executed correctly should you move on to the next one. Note that you have to click into the browser address bar before typing a URL. You should always call a tool! Always return a tool call. Remember call the finish_run tool when you have achieved the goal of the task. Do not explain you have finished the task, just call the tool. Use keyboard shortcuts to navigate whenever possible.`,
//     // tool_choice: { type: 'any' },
//     messages: historyWithoutImages,
//     betas: ['computer-use-2024-10-22'],
//   });

//   return { content: message.content, role: message.role };
// };

// export const performAction = async (action: NextAction) => {
//   switch (action.type) {
//     case 'mouse_move':
//       const { x, y } = mapFromAiSpace(action.x, action.y);
//       await mouse.setPosition(new Point(x, y));
//       break;
//     case 'left_click_drag':
//       const { x: dragX, y: dragY } = mapFromAiSpace(action.x, action.y);
//       const currentPosition = await mouse.getPosition();
//       await mouse.drag([currentPosition, new Point(dragX, dragY)]);
//       break;
//     case 'cursor_position':
//       const position = await mouse.getPosition();
//       const aiPosition = mapToAiSpace(position.x, position.y);
//       // TODO: actually return the position
//       break;
//     case 'left_click':
//       await mouse.leftClick();
//       break;
//     case 'right_click':
//       await mouse.rightClick();
//       break;
//     case 'middle_click':
//       await mouse.click(Button.MIDDLE);
//       break;
//     case 'double_click':
//       await mouse.doubleClick(Button.LEFT);
//       break;
//     case 'type':
//       // Set typing delay to 0ms for instant typing
//       keyboard.config.autoDelayMs = 0;
//       await keyboard.type(action.text);
//       // Reset delay back to default if needed
//       keyboard.config.autoDelayMs = 500;
//       break;
//     case 'key':
//       const keyMap = {
//         Return: Key.Enter,
//       };
//       const keys = action.text.split('+').map((key) => {
//         const mappedKey = keyMap[key as keyof typeof keyMap];
//         if (!mappedKey) {
//           throw new Error(`Tried to press unknown key: ${key}`);
//         }
//         return mappedKey;
//       });
//       await keyboard.pressKey(...keys);
//       break;
//     case 'screenshot':
//       // Don't do anything since we always take a screenshot after each step
//       break;
//     default:
//       throw new Error(`Unsupported action: ${action.type}`);
//   }
// };

// export const runAgent = async (
//   setState: (state: RootState) => void,
//   getState: () => RootState,
// ) => {
//   setState({
//     ...getState(),
//     running: true,
//     runHistory: [{ role: 'user', content: getState().instructions ?? '' }],
//     error: null,
//   });

//   while (getState().running) {
//     // Add this check at the start of the loop
//     if (getState().runHistory.length >= MAX_STEPS * 2) {
//       setState({
//         ...getState(),
//         error: 'Maximum steps exceeded',
//         running: false,
//       });
//       break;
//     }

//     try {
//       const message = await promptForAction(getState().runHistory);
//       setState({
//         ...getState(),
//         runHistory: [...getState().runHistory, message],
//       });
//       const { action, reasoning, toolId } = extractAction(
//         message as BetaMessage,
//       );
//       console.log('REASONING', reasoning);
//       console.log('ACTION', action);

//       if (action.type === 'error') {
//         setState({
//           ...getState(),
//           error: action.message,
//           running: false,
//         });
//         break;
//       } else if (action.type === 'finish') {
//         setState({
//           ...getState(),
//           running: false,
//         });
//         break;
//       }
//       if (!getState().running) {
//         break;
//       }

//       hideWindowBlock(() => performAction(action));

//       await new Promise((resolve) => setTimeout(resolve, 500));
//       if (!getState().running) {
//         break;
//       }

//       setState({
//         ...getState(),
//         runHistory: [
//           ...getState().runHistory,
//           {
//             role: 'user',
//             content: [
//               {
//                 type: 'tool_result',
//                 tool_use_id: toolId,
//                 content: [
//                   {
//                     type: 'text',
//                     text: 'Here is a screenshot after the action was executed',
//                   },
//                   {
//                     type: 'image',
//                     source: {
//                       type: 'base64',
//                       media_type: 'image/png',
//                       data: await getScreenshot(),
//                     },
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//       });
//     } catch (error: unknown) {
//       setState({
//         ...getState(),
//         error:
//           error instanceof Error ? error.message : 'An unknown error occurred',
//         running: false,
//       });
//       break;
//     }
//   }
// };
