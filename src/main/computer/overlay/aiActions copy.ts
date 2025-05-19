// // src/main/store/aiActions.ts
// import fetch from 'node-fetch';
// import { AppState, GuideStep } from '@/common/types/overlay-types';
// import { store } from './create';

// // AI 서비스 관련 상태 및 액션 추가
// export function addAIActions(set: (state: any) => void, get: () => any) {
//   return {
//     // 상태 확장
//     apiKey: null,
//     apiKeySource: '없음', // 상태에 API 키 소스 추가

//     // API 키 초기화 액션 추가
//     INIT_API_KEY: () => {
//       // 테스트 API 키 (개발용)
//       const TEST_API_KEY = 'sk'; // 테스트용 더미 키

//       // 환경 변수에서 API 키 로드
//       if (process.env.OPENAI_API_KEY) {
//         get().SET_API_KEY(process.env.OPENAI_API_KEY, '환경 변수');
//         console.log('✅ OpenAI API 키가 환경 변수에서 로드되었습니다');
//       } else {
//         // 테스트 API 키 설정 (개발 중에만 사용)
//         if (process.env.NODE_ENV === 'development') {
//           get().SET_API_KEY(TEST_API_KEY, '개발용 테스트 키');
//           console.log('⚠️ 개발 모드: 테스트 API 키가 설정되었습니다');
//         } else {
//           console.log(
//             '⚠️ OpenAI API 키가 설정되지 않았습니다. 모의 응답이 사용됩니다.',
//           );
//           set({ apiKeySource: '없음' });
//         }
//       }
//     },

//     // API 키 상태 조회 액션 추가
//     GET_API_KEY_STATUS: () => {
//       const state = get();
//       return {
//         isSet: !!state.apiKey && state.apiKey.trim() !== '',
//         source: state.apiKeySource,
//       };
//     },

//     // 액션 확장 - 소스 파라미터 추가
//     SET_API_KEY: (key: string, source?: string) => {
//       if (!key || key.trim() === '') {
//         console.warn('빈 API 키가 설정되려고 했습니다');
//         return;
//       }

//       const trimmedKey = key.trim();
//       const sourceValue = source || '사용자 설정';

//       console.log(
//         `API 키가 설정되었습니다: ${trimmedKey.substring(0, 4)}...${trimmedKey.substring(trimmedKey.length - 4)}`,
//       );
//       set({ apiKey: trimmedKey, apiKeySource: sourceValue }); // 소스 정보도 상태에 저장
//     },

//     IS_API_KEY_SET: () => {
//       const state = get();
//       return !!state.apiKey && state.apiKey.trim() !== '';
//     },

//     GENERATE_GUIDE: async (
//       software: string,
//       question: string,
//       screenshotData?: string,
//     ) => {
//       set({ error: null });

//       try {
//         const state = get();
//         console.log('API 키 상태:', state.apiKey ? '설정됨' : '설정되지 않음');
//         console.log('스크린샷 데이터 존재:', screenshotData ? '있음' : '없음');

//         if (state.apiKey && screenshotData) {
//           // API 키가 있으면 실제 AI 서비스 호출
//           const guideResponse = await callAIAPI(
//             {
//               software,
//               question,
//               screenshotData,
//             },
//             state.apiKey,
//           );

//           set({ guideSteps: guideResponse.steps, activeSoftware: software });
//           return guideResponse;
//         }
//         console.log(
//           '모의 응답 생성 이유:',
//           !state.apiKey ? 'API 키 없음' : '스크린샷 데이터 없음',
//         );

//         // API 키가 없거나 스크린샷이 없으면 모의 응답 생성
//         const mockGuide = generateMockGuide({
//           software,
//           question,
//           screenshotData,
//         });

//         set({ guideSteps: mockGuide.steps, activeSoftware: software });
//         return mockGuide;
//       } catch (error) {
//         console.error('Guide generation error:', error);
//         set({ error: `가이드 생성 오류: ${error}` });
//         throw error;
//       }
//     },
//   };
// }
// // AI API 호출 함수
// // AI API 호출 함수
// async function callAIAPI(
//   request: {
//     software: string;
//     question: string;
//     screenshotData: string;
//   },
//   apiKey: string,
// ) {
//   try {
//     console.log(`🚀 AI 서비스로 ${request.software} 가이드 생성 중...`);

//     // 이미지 데이터 준비
//     const base64Image = request.screenshotData.replace(
//       /^data:image\/\w+;base64,/,
//       '',
//     );

//     // OpenAI API 요청
//     const response = await fetch('https://api.openai.com/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${apiKey}`,
//       },
//       body: JSON.stringify({
//         model: 'gpt-4o',
//         messages: [
//           {
//             role: 'user',
//             content: [
//               {
//                 type: 'text',
//                 text: `당신은 소프트웨어 인터페이스 가이드 생성 도구입니다.
//                 아래 첨부된 이미지에는 사용자 인터페이스의 일부가 포함되어 있습니다.
//                 사용자의 질문: "${request.question}"

//                 이 인터페이스에서 사용자가 작업을 수행하는 데 도움이 될 수 있는 단계별 안내를 제공해 주세요.
//                 소프트웨어나 개인을 식별하지 말고, 단순히 보이는 UI 요소(버튼, 메뉴, 필드 등)에 대한 가이드만 제공하세요.

//                 다음과 같은 형식으로 응답해 주세요:
//                 \`\`\`json
//                 {
//                   "steps": [
//                     {
//                       "stepNumber": "1",
//                       "title": "인터페이스 요소 찾기",
//                       "description": "인터페이스에서 관련 요소를 찾는 방법 설명",
//                       "x": 100,
//                       "y": 100,
//                       "arrowPosition": "top"
//                     },
//                     {
//                       "stepNumber": "2",
//                       "title": "작업 수행하기",
//                       "description": "해당 요소를 사용하여 작업을 수행하는 방법",
//                       "x": 200,
//                       "y": 200,
//                       "arrowPosition": "left"
//                     }
//                   ]
//                 }
//                 \`\`\`

//                 각 단계에 대해:
//                 1. stepNumber: 단계 번호를 명확하게 표시해 주세요 (1, 2, 3 등).
//                 2. description: 자세한 설명을 제공하세요. 코드나 명령어가 포함된 경우 \`코드\` 형식으로 표시할 수 있습니다.
//                 3. arrowPosition: "top", "bottom", "left", "right" 중 하나로 지정하세요. 이는 말풍선의 화살표가 가리키는 방향입니다.

//                 가이드 말풍선은 주로 관련 UI 요소 근처에 배치하고, 화살표가 해당 요소를 가리키도록 위치를 지정하세요.
//                 이미지에 보이는 일반적인 UI 요소에 대한 기능적인 설명만 포함해 주세요.`,
//               },
//               {
//                 type: 'image_url',
//                 image_url: {
//                   url: `data:image/png;base64,${base64Image}`,
//                 },
//               },
//             ],
//           },
//         ],
//         max_tokens: 1500,
//       }),
//     });

//     const data = await response.json();
//     console.log(
//       '📡 API 응답 데이터:',
//       `${JSON.stringify(data).substring(0, 200)}...`,
//     );

//     // 오류 검사
//     if (data.error) {
//       console.error('❌ API 오류 응답:', data.error);
//       throw new Error(`API 오류: ${data.error.message}`);
//     }

//     // 응답 유효성 검사
//     if (!data || !data.choices || !data.choices.length) {
//       console.error('❌ API 응답 구조 오류:', data);
//       throw new Error('API 응답에 choices 배열이 없습니다');
//     }

//     // 첫 번째 선택지 가져오기
//     const firstChoice = data.choices[0];
//     if (!firstChoice || !firstChoice.message || !firstChoice.message.content) {
//       console.error('❌ API 응답 메시지 오류:', firstChoice);
//       throw new Error('API 응답에 유효한 메시지 콘텐츠가 없습니다');
//     }

//     // 응답 파싱
//     const { content } = firstChoice.message;
//     console.log('📝 API 응답 콘텐츠:', `${content.substring(0, 200)}...`);

//     // JSON 추출 시도
//     let parsedData;
//     try {
//       // JSON 형식을 찾기 위한 정규식 - 코드 블록에서 JSON 추출
//       const jsonRegex = /```(?:json)?\s*([\s\S]*?)```/;
//       const jsonMatch = content.match(jsonRegex);

//       if (jsonMatch && jsonMatch[1]) {
//         // 코드 블록 내의 JSON 추출
//         const jsonText = jsonMatch[1].trim();
//         console.log(
//           '🔍 추출된 JSON 텍스트:',
//           `${jsonText.substring(0, 100)}...`,
//         );
//         parsedData = JSON.parse(jsonText);
//       } else {
//         // JSON 블록이 없는 경우 처리
//         console.log('⚠️ JSON 블록을 찾지 못함, 응답을 수동으로 파싱...');

//         // 응답이 JSON 포맷이 아닌 경우 수동으로 간단한 단계 생성
//         parsedData = {
//           steps: [
//             {
//               stepNumber: '1',
//               title: '인터페이스 안내',
//               description: `${content.substring(0, 500)}...`,
//               x: 100,
//               y: 100,
//               arrowPosition: 'top',
//             },
//           ],
//         };
//       }
//     } catch (parseError) {
//       console.error('❌ JSON 파싱 오류:', parseError);
//       console.log('📄 파싱 시도한 텍스트:', content);

//       // 파싱 실패 시 기본 단계 생성
//       parsedData = {
//         steps: [
//           {
//             stepNumber: '1',
//             title: '인터페이스 안내',
//             description: `${content.substring(0, 500)}...`,
//             x: 100,
//             y: 100,
//             arrowPosition: 'top',
//           },
//         ],
//       };
//     }

//     // 가이드 단계 유효성 검사
//     if (!parsedData || !parsedData.steps || !Array.isArray(parsedData.steps)) {
//       console.error(
//         '⚠️ 파싱된 데이터에 steps 배열이 없음, 기본 단계 생성:',
//         parsedData,
//       );
//       parsedData = {
//         steps: [
//           {
//             stepNumber: '1',
//             title: '기본 인터페이스 안내',
//             description: `${content.substring(0, 500)}...`,
//             x: 100,
//             y: 100,
//             arrowPosition: 'top',
//           },
//         ],
//       };
//     }

//     // 가이드 단계 매핑 - stepNumber 및 arrowPosition 포함
//     const steps = parsedData.steps.map((step: any, index: number) => ({
//       id: (index + 1).toString(),
//       stepNumber: step.stepNumber || (index + 1).toString(),
//       title: step.title || `단계 ${index + 1}`,
//       description: step.description || '',
//       x: step.x || 100,
//       y: step.y || 100 + index * 50,
//       width: step.width || 300,
//       height: step.height || 200,
//       type: 'tooltip',
//       shortcut: step.shortcut || undefined,
//       arrowPosition: step.arrowPosition || 'top',
//     }));

//     console.log(`✅ 가이드 생성 완료: ${steps.length}개 단계`);

//     // 여기가 문제점! steps를 사용해야 합니다 - 빈 배열이 아닌 매핑된 steps 배열 반환
//     return {
//       software: request.software,
//       question: request.question,
//       steps, // 수정된 부분: 빈 배열 대신 실제 steps 배열 반환
//     };
//   } catch (error) {
//     console.error('❌ API 호출 오류:', error);
//     throw error;
//   }
// }

// // 모의 가이드 생성 함수
// function generateMockGuide(request: {
//   software: string;
//   question: string;
//   screenshotData?: string;
// }) {
//   console.log(`모의 ${request.software} 가이드 생성...`);

//   // 소프트웨어 이름 기반 가이드 생성
//   let softwareType = 'unknown';
//   const software = request.software.toLowerCase();

//   if (
//     software.includes('code') ||
//     software.includes('vscode') ||
//     software.includes('visual')
//   ) {
//     softwareType = 'editor';
//   } else if (
//     software.includes('excel') ||
//     software.includes('sheet') ||
//     software.includes('calc')
//   ) {
//     softwareType = 'spreadsheet';
//   }
//   // 나머지 소프트웨어 타입 판별 로직...

//   // 소프트웨어 타입에 따른 가이드 생성
//   const steps: GuideStep[] = []; // 기본값 빈 배열

//   // 최소한의 데이터 추가
//   steps.push({
//     id: '1',
//     stepNumber: '1',
//     title: '기본 안내',
//     description: '인터페이스에서 작업 수행 방법을 보여주는 가이드입니다.',
//     x: 100,
//     y: 100,
//     width: 300,
//     height: 180,
//     type: 'tooltip',
//     arrowPosition: 'top',
//   });

//   return {
//     software: request.software,
//     question: request.question,
//     steps: steps.map((step, index) => ({
//       ...step,
//       id: (index + 1).toString(),
//     })),
//   };
// }
