
export type NextAction =
  | { type: 'key'; text: string }
  | { type: 'type'; text: string }
  | { type: 'mouse_move'; x: number; y: number }
  | { type: 'left_click'; x?: number; y?: number; key?: string }
  | { type: 'left_click_drag'; x: number; y: number }
  | { type: 'right_click'; x?: number; y?: number; key?: string }
  | { type: 'middle_click'; x?: number; y?: number; key?: string }
  | { type: 'double_click'; x?: number; y?: number; key?: string }
  | { type: 'triple_click'; x?: number; y?: number; key?: string }
  | { type: 'left_mouse_down' }
  | { type: 'left_mouse_up' }
  | { type: 'scroll'; scroll_direction: 'up' | 'down' | 'left' | 'right'; scroll_amount: number; coordinate?: [number, number]; text?: string }

  | { type: 'hold_key'; text: string; duration: number }
  | { type: 'wait'; duration: number }
  | { type: 'screenshot' }
  | { type: 'cursor_position' }
  | { type: 'finish' }
  | { type: 'error'; message: string };


//   {
//     "properties": {
//         "action": {
//             "description": "수행할 작업. 사용 가능한 작업은 다음과 같습니다:\n"
//             "* `key`: 키보드에서 키나 키 조합을 누릅니다.\n"
//             "  - xdotool의 `key` 구문을 지원합니다.\n"
//             '  - 예: "a", "Return", "alt+Tab", "ctrl+s", "Up", "KP_0" (숫자 패드 0 키).\n'
//             "* `hold_key`: 지정된 시간(초) 동안 키나 여러 키를 누르고 있습니다. `key`와 동일한 구문을 지원합니다.\n"
//             "* `type`: 키보드로 문자열을 입력합니다.\n"
//             "* `cursor_position`: 화면에서 커서의 현재 (x, y) 픽셀 좌표를 가져옵니다.\n"
//             "* `mouse_move`: 커서를 화면의 지정된 (x, y) 픽셀 좌표로 이동합니다.\n"
//             "* `left_mouse_down`: 왼쪽 마우스 버튼을 누릅니다.\n"
//             "* `left_mouse_up`: 왼쪽 마우스 버튼을 놓습니다.\n"
//             "* `left_click`: 화면의 지정된 (x, y) 픽셀 좌표에서 왼쪽 마우스 버튼을 클릭합니다. `text` 매개변수를 사용하여 클릭하는 동안 누를 키 조합을 포함할 수도 있습니다.\n"
//             "* `left_click_drag`: `start_coordinate`에서 지정된 (x, y) 픽셀 좌표로 커서를 클릭하고 드래그합니다.\n"
//             "* `right_click`: 화면의 지정된 (x, y) 픽셀 좌표에서 오른쪽 마우스 버튼을 클릭합니다.\n"
//             "* `middle_click`: 화면의 지정된 (x, y) 픽셀 좌표에서 가운데 마우스 버튼을 클릭합니다.\n"
//             "* `double_click`: 화면의 지정된 (x, y) 픽셀 좌표에서 왼쪽 마우스 버튼을 더블 클릭합니다.\n"
//             "* `triple_click`: 화면의 지정된 (x, y) 픽셀 좌표에서 왼쪽 마우스 버튼을 트리플 클릭합니다.\n"
//             "* `scroll`: 지정된 (x, y) 픽셀 좌표에서 지정된 방향으로 스크롤 휠의 지정된 클릭 수만큼 화면을 스크롤합니다. PageUp/PageDown을 사용하여 스크롤하지 마세요.\n"
//             "* `wait`: 지정된 시간(초) 동안 기다립니다.\n"
//             "* `screenshot`: 화면의 스크린샷을 찍습니다.",
//             "enum": [
//                 "key",
//                 "hold_key",
//                 "type",
//                 "cursor_position",
//                 "mouse_move",
//                 "left_mouse_down",
//                 "left_mouse_up",
//                 "left_click",
//                 "left_click_drag",
//                 "right_click",
//                 "middle_click",
//                 "double_click",
//                 "triple_click",
//                 "scroll",
//                 "wait",
//                 "screenshot",
//             ],
//             "type": "string",
//         },
//         "coordinate": {
//             "description": "(x, y): 마우스를 이동할 x(왼쪽 가장자리에서 픽셀) 및 y(위쪽 가장자리에서 픽셀) 좌표. `action=mouse_move` 및 `action=left_click_drag`에서만 필요합니다.",
//             "type": "array",
//         },
//         "duration": {
//             "description": "키를 누르고 있을 시간. `action=hold_key` 및 `action=wait`에서만 필요합니다.",
//             "type": "integer",
//         },
//         "scroll_amount": {
//             "description": "스크롤할 '클릭' 수. `action=scroll`에서만 필요합니다.",
//             "type": "integer",
//         },
//         "scroll_direction": {
//             "description": "화면을 스크롤할 방향. `action=scroll`에서만 필요합니다.",
//             "enum": ["up", "down", "left", "right"],
//             "type": "string",
//         },
//         "start_coordinate": {
//             "description": "(x, y): 드래그를 시작할 x(왼쪽 가장자리에서 픽셀) 및 y(위쪽 가장자리에서 픽셀) 좌표. `action=left_click_drag`에서만 필요합니다.",
//             "type": "array",
//         },
//         "text": {
//             "description": "`action=type`, `action=key`, `action=hold_key`에서만 필요합니다. 클릭하거나 스크롤하는 동안 키를 누르고 있기 위해 클릭이나 스크롤 작업에서도 사용할 수 있습니다.",
//             "type": "string",
//         },
//     },
//     "required": ["action"],
//     "type": "object",
// }

export type AppState = {
  instructions: string | null;
  fullyAuto: boolean;
  running: boolean;
  error: string | null;

  runHistory: BetaMessageParam[];

  RUN_AGENT_AUTO: () => void;
  STOP_RUN: () => void;
  SET_INSTRUCTIONS: (instructions: string) => void;
  SET_FULLY_AUTO: (fullyAuto: boolean) => void;
  CLEAR_HISTORY: () => void;
};



