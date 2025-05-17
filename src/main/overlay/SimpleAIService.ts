// src/common/ai/SimpleAIService.ts
import fetch from 'node-fetch';

// 간단한 가이드 요청 인터페이스
export interface GuideRequest {
  software: string;
  question: string;
  screenshotData?: string;
}

// 가이드 단계 인터페이스
export interface GuideStep {
  id: string;
  stepNumber?: string; // 단계 번호 추가
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  shortcut?: string;
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right'; // 화살표 위치 속성 추가
}

// 가이드 응답 인터페이스
export interface GuideResponse {
  software: string;
  question: string;
  steps: GuideStep[];
  error?: string;
}

/**
 * 간단한 AI 서비스 클래스 - 테스트용
 */
export class SimpleAIService {
  // API 키
  private apiKey: string | null = null;
  
  // API 키 설정
  public setApiKey(key: string): void {
    if (!key || key.trim() === '') {
      console.warn("빈 API 키가 설정되려고 했습니다");
      return;
    }
    
    this.apiKey = key.trim();
    console.log(`API 키가 설정되었습니다: ${key.substring(0, 4)}...${key.substring(key.length - 4)}`);
  }
  
  public isApiKeySet(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }
  
  /**
   * 가이드 생성 - API 키 여부에 따라 실제 API 호출 또는 모의 응답
   */
  public async generateGuide(request: GuideRequest): Promise<GuideResponse> {
    console.log("API 키 상태:", this.apiKey ? "설정됨" : "설정되지 않음");
    console.log("스크린샷 데이터 존재:", request.screenshotData ? "있음" : "없음");
    
    if (this.apiKey && request.screenshotData) {
      try {
        // API 키가 있으면 실제 AI 서비스 호출
        return await this.callAIAPI(request);
      } catch (error) {
        console.error("AI API 호출 실패:", error);
        // 오류 메시지를 가이드에 포함
        const errorGuide = this.generateMockGuide(request);
        errorGuide.steps[0].description = `AI 서비스 응답: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n기본 가이드를 표시합니다.`;
        return errorGuide;
      }
    } else {
      console.log("모의 응답 생성 이유:", 
        !this.apiKey ? "API 키 없음" : "스크린샷 데이터 없음");
    }
    
    // API 키가 없거나 스크린샷이 없으면 모의 응답 반환
    return this.generateMockGuide(request);
  }
  
  /**
   * AI API 호출 (OpenAI 사용)
   */
  private async callAIAPI(request: GuideRequest): Promise<GuideResponse> {
    try {
      console.log(`AI 서비스로 ${request.software} 가이드 생성 중...`);
      
      // 이미지 데이터 준비
      const base64Image = request.screenshotData.replace(/^data:image\/\w+;base64,/, '');
      
      // 수정된 프롬프트로 API 요청
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `당신은 소프트웨어 인터페이스 가이드 생성 도구입니다. 
                  아래 첨부된 이미지에는 사용자 인터페이스의 일부가 포함되어 있습니다. 
                  사용자의 질문: "${request.question}"
                  
                  이 인터페이스에서 사용자가 작업을 수행하는 데 도움이 될 수 있는 단계별 안내를 제공해 주세요.
                  소프트웨어나 개인을 식별하지 말고, 단순히 보이는 UI 요소(버튼, 메뉴, 필드 등)에 대한 가이드만 제공하세요.
                  
                  다음과 같은 형식으로 응답해 주세요:
                  \`\`\`json
                  {
                    "steps": [
                      {
                        "stepNumber": "1",
                        "title": "인터페이스 요소 찾기",
                        "description": "인터페이스에서 관련 요소를 찾는 방법 설명",
                        "x": 100,
                        "y": 100,
                        "arrowPosition": "top"
                      },
                      {
                        "stepNumber": "2",
                        "title": "작업 수행하기",
                        "description": "해당 요소를 사용하여 작업을 수행하는 방법",
                        "x": 200,
                        "y": 200,
                        "arrowPosition": "left"
                      }
                    ]
                  }
                  \`\`\`
                  
                  각 단계에 대해:
                  1. stepNumber: 단계 번호를 명확하게 표시해 주세요 (1, 2, 3 등).
                  2. description: 자세한 설명을 제공하세요. 코드나 명령어가 포함된 경우 \`코드\` 형식으로 표시할 수 있습니다.
                  3. arrowPosition: "top", "bottom", "left", "right" 중 하나로 지정하세요. 이는 말풍선의 화살표가 가리키는 방향입니다.
                  
                  가이드 말풍선은 주로 관련 UI 요소 근처에 배치하고, 화살표가 해당 요소를 가리키도록 위치를 지정하세요.
                  이미지에 보이는 일반적인 UI 요소에 대한 기능적인 설명만 포함해 주세요.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1500
        })
      });
      
      const data = await response.json();
      console.log("API 응답 데이터:", JSON.stringify(data).substring(0, 200) + "...");
      
      // 오류 검사
      if (data.error) {
        console.error("API 오류 응답:", data.error);
        throw new Error(`API 오류: ${data.error.message}`);
      }
      
      // 응답 유효성 검사
      if (!data || !data.choices || !data.choices.length) {
        console.error("API 응답 구조 오류:", data);
        throw new Error("API 응답에 choices 배열이 없습니다");
      }
      
      // 첫 번째 선택지 가져오기
      const firstChoice = data.choices[0];
      if (!firstChoice || !firstChoice.message || !firstChoice.message.content) {
        console.error("API 응답 메시지 오류:", firstChoice);
        throw new Error("API 응답에 유효한 메시지 콘텐츠가 없습니다");
      }
      
      // 응답 파싱
      const content = firstChoice.message.content;
      console.log("API 응답 콘텐츠:", content.substring(0, 200) + "...");
      
      // JSON 추출 시도
      let parsedData;
      try {
        // JSON 형식을 찾기 위한 정규식 - 코드 블록에서 JSON 추출
        const jsonRegex = /```(?:json)?\s*([\s\S]*?)```/;
        const jsonMatch = content.match(jsonRegex);
        
        if (jsonMatch && jsonMatch[1]) {
          // 코드 블록 내의 JSON 추출
          const jsonText = jsonMatch[1].trim();
          console.log("추출된 JSON 텍스트:", jsonText.substring(0, 100) + "...");
          parsedData = JSON.parse(jsonText);
        } else {
          // JSON 블록이 없는 경우 처리
          console.log("JSON 블록을 찾지 못함, 응답을 수동으로 파싱...");
          
          // 응답이 JSON 포맷이 아닌 경우 수동으로 간단한 단계 생성
          parsedData = {
            steps: [
              {
                stepNumber: "1",
                title: "인터페이스 안내",
                description: content.substring(0, 500) + "...",
                x: 100,
                y: 100,
                arrowPosition: "top"
              }
            ]
          };
        }
      } catch (parseError) {
        console.error("JSON 파싱 오류:", parseError);
        console.log("파싱 시도한 텍스트:", content);
        
        // 파싱 실패 시 기본 단계 생성
        parsedData = {
          steps: [
            {
              stepNumber: "1",
              title: "인터페이스 안내",
              description: content.substring(0, 500) + "...",
              x: 100,
              y: 100,
              arrowPosition: "top"
            }
          ]
        };
      }
      
      // 가이드 단계 유효성 검사
      if (!parsedData || !parsedData.steps || !Array.isArray(parsedData.steps)) {
        console.error("파싱된 데이터에 steps 배열이 없음, 기본 단계 생성:", parsedData);
        parsedData = {
          steps: [
            {
              stepNumber: "1",
              title: "기본 인터페이스 안내",
              description: content.substring(0, 500) + "...",
              x: 100,
              y: 100,
              arrowPosition: "top"
            }
          ]
        };
      }
      
      // 가이드 단계 매핑 - stepNumber 및 arrowPosition 포함
      const steps = parsedData.steps.map((step: any, index: number) => ({
        id: (index + 1).toString(),
        stepNumber: step.stepNumber || (index + 1).toString(),
        title: step.title || `단계 ${index + 1}`,
        description: step.description || '',
        x: step.x || 100,
        y: step.y || 100 + (index * 50),
        width: step.width || 300,
        height: step.height || 200,
        type: 'tooltip',
        shortcut: step.shortcut || undefined,
        arrowPosition: step.arrowPosition || "top"
      }));
      
      return {
        software: request.software,
        question: request.question,
        steps
      };
    } catch (error) {
      console.error("API 호출 오류:", error);
      throw error;
    }
  }
  
  /**
   * 모의 가이드 생성 (API 호출 없이)
   */
  private generateMockGuide(request: GuideRequest): GuideResponse {
    console.log(`모의 ${request.software} 가이드 생성...`);
    
    // 소프트웨어 이름 기반 가이드 생성
    let softwareType = 'unknown';
    const software = request.software.toLowerCase();
    
    if (software.includes('code') || software.includes('vscode') || software.includes('visual')) {
      softwareType = 'editor';
    } else if (software.includes('excel') || software.includes('sheet') || software.includes('calc')) {
      softwareType = 'spreadsheet';
    } else if (software.includes('word') || software.includes('doc')) {
      softwareType = 'document';
    } else if (software.includes('browser') || software.includes('chrome') || software.includes('firefox')) {
      softwareType = 'browser';
    } else if (software.includes('photoshop') || software.includes('photo') || software.includes('image')) {
      softwareType = 'image';
    }
    
    // 소프트웨어 유형에 따른 가이드 생성
    let steps = [];
    
    switch (softwareType) {
      case 'editor':
        steps = [
          {
            id: '1',
            stepNumber: "1",
            title: '코드 편집기 기본 기능',
            description: '대부분의 코드 편집기는 파일 탐색기, 에디터 영역, 터미널 영역으로 구성되어 있습니다. 왼쪽 패널에서 파일을 선택하고, 중앙 영역에서 코드를 편집하세요.\n\n예시 코드: `const hello = "world";`\n\n```javascript\n// 함수 예시\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```',
            x: 100,
            y: 100,
            width: 320,
            height: 250,
            type: 'tooltip',
            shortcut: 'Ctrl+N (새 파일)',
            arrowPosition: 'top'
          },
          {
            id: '2',
            stepNumber: "2",
            title: '빠른 명령 실행',
            description: '대부분의 기능은 명령 팔레트를 통해 접근할 수 있습니다. 단축키를 사용하여 명령 팔레트를 열고 원하는 기능을 검색하세요.',
            x: 100,
            y: 360,
            width: 320,
            height: 150,
            type: 'tooltip',
            shortcut: 'Ctrl+Shift+P (명령 팔레트)',
            arrowPosition: 'left'
          }
        ];
        break;
        
      case 'spreadsheet':
        steps = [
          {
            id: '1',
            stepNumber: "1",
            title: '스프레드시트 기본 기능',
            description: '시트의 셀을 클릭하여 데이터를 입력하고, 수식은 =으로 시작합니다. 함수 마법사를 사용하려면 fx 버튼을 클릭하세요.\n\n예시 수식: `=SUM(A1:A10)`',
            x: 100,
            y: 100,
            width: 320,
            height: 200,
            type: 'tooltip',
            shortcut: 'Alt+= (합계 함수)',
            arrowPosition: 'top'
          },
          {
            id: '2',
            stepNumber: "2",
            title: '데이터 필터링',
            description: '데이터 범위를 선택하고 필터 버튼을 클릭하여 데이터를 정렬하거나 필터링할 수 있습니다.',
            x: 100,
            y: 310,
            width: 320,
            height: 150,
            type: 'tooltip',
            shortcut: 'Ctrl+Shift+L (필터 토글)',
            arrowPosition: 'right'
          }
        ];
        break;
        
      case 'document':
        steps = [
          {
            id: '1',
            stepNumber: "1",
            title: '문서 서식 적용',
            description: '텍스트를 선택하고 서식 도구 모음을 사용하여 글꼴, 크기, 색상 등을 변경할 수 있습니다.',
            x: 100,
            y: 100,
            width: 320,
            height: 150,
            type: 'tooltip',
            shortcut: 'Ctrl+B (굵게)',
            arrowPosition: 'top'
          },
          {
            id: '2',
            stepNumber: "2",
            title: '문서 탐색',
            description: '문서 내를 빠르게 탐색하려면 탐색 창을 사용하세요. 제목, 페이지 또는 검색어를 기준으로 이동할 수 있습니다.',
            x: 100,
            y: 260,
            width: 320,
            height: 150,
            type: 'tooltip',
            shortcut: 'Ctrl+F (찾기)',
            arrowPosition: 'left'
          }
        ];
        break;
        
      case 'browser':
        steps = [
          {
            id: '1',
            stepNumber: "1",
            title: '탭 관리',
            description: '새 탭을 열려면 탭 바의 + 버튼을 클릭하거나 단축키를 사용하세요. 탭을 드래그하여 순서를 변경할 수 있습니다.',
            x: 100,
            y: 100,
            width: 320,
            height: 150,
            type: 'tooltip',
            shortcut: 'Ctrl+T (새 탭)',
            arrowPosition: 'top'
          },
          {
            id: '2',
            stepNumber: "2",
            title: '북마크 관리',
            description: '현재 페이지를 북마크하려면 주소 표시줄 오른쪽의 별표 아이콘을 클릭하세요. 북마크 관리자를 통해 북마크를 정리할 수 있습니다.',
            x: 100,
            y: 260,
            width: 320,
            height: 150,
            type: 'tooltip',
            shortcut: 'Ctrl+D (북마크)',
            arrowPosition: 'right'
          }
        ];
        break;
        
      case 'image':
        steps = [
          {
            id: '1',
            stepNumber: "1",
            title: '이미지 편집 도구',
            description: '왼쪽 도구 패널에서 이미지 편집 도구를 선택할 수 있습니다. 각 도구마다 옵션이 다르며, 상단 옵션 바에서 설정을 변경할 수 있습니다.',
            x: 100,
            y: 100,
            width: 320,
            height: 150,
            type: 'tooltip',
            shortcut: 'B (브러시 도구)',
            arrowPosition: 'left'
          },
          {
            id: '2',
            stepNumber: "2",
            title: '레이어 작업',
            description: '오른쪽 레이어 패널에서 레이어를 추가, 삭제, 재배치할 수 있습니다. 레이어를 드래그하여 순서를 변경하거나, 눈 아이콘을 클릭하여 표시/숨김을 전환할 수 있습니다.',
            x: 100,
            y: 260,
            width: 320,
            height: 180,
            type: 'tooltip',
            shortcut: 'Ctrl+Shift+N (새 레이어)',
            arrowPosition: 'right'
          }
        ];
        break;
        
      default:
        // 기본 가이드
        steps = [
          {
            id: '1',
            stepNumber: "1",
            title: '인터페이스 기본 안내',
            description: `${request.question}에 대한 답변입니다. 대부분의 프로그램은 상단 메뉴바, 도구 모음, 메인 작업 영역으로 구성됩니다. 원하는 기능은 메뉴나 도구 모음에서 찾을 수 있습니다.\n\n특정 기능에 대해 더 자세한 안내가 필요하면 "도움말" 메뉴를 확인하세요.`,
            x: 100,
            y: 100,
            width: 320,
            height: 180,
            type: 'tooltip',
            arrowPosition: 'top'
          },
          {
            id: '2',
            stepNumber: "2",
            title: '도움말 보기',
            description: '상단 메뉴의 도움말 또는 F1 키를 눌러 자세한 안내를 확인할 수 있습니다. 대부분의 프로그램에서는 F1 키를 누르면 상황에 맞는 도움말이 표시됩니다.',
            x: 100,
            y: 290,
            width: 320,
            height: 150,
            type: 'tooltip',
            shortcut: 'F1 (도움말)',
            arrowPosition: 'left'
          }
        ];
    }
    
    return {
      software: request.software,
      question: request.question,
      steps: steps.map((step, index) => ({
        ...step,
        id: (index + 1).toString()
      }))
    };
  }
}

// 싱글톤 인스턴스 생성
export const aiService = new SimpleAIService();