import { useEffect } from 'react';
import { extractAction } from '../../../../main/computer/antropic/extractAction';
import { useStore } from '../../../hooks/useStore';
export function RunHistory() {
  // 두 모듈의 상태 가져오기
  // const { runHistory = [], fullyAuto } = useActionStore();
  // const { guideSteps = [] } = useOverlayStore();


  // 모드에 따른 다른 데이터 준비
  const messages = fullyAuto 
    ? runHistory
        .filter((m) => m.role === 'assistant')
        .map((m) => extractAction(m))
    : []; // 가이드 모드에서는 별도의 오버레이로 표시되므로 여기서는 빈 배열

  useEffect(() => {
    const element = document.getElementById('run-history');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]); // Scroll when messages change

  // 표시할 내용이 없으면 null 반환
  if ((fullyAuto && runHistory.length === 0) || (!fullyAuto && guideSteps.length === 0)) {
    return null;
  }

  return (
    <div
      id="run-history"
      className="w-full h-full bg-white rounded-2xl border border-[rgba(112,107,87,0.5)] p-4 overflow-auto"
    >
      {fullyAuto ? (
        // 자동 모드 - 첫 번째 모듈의 runHistory 표시
        messages.map((action, index) => {
          const { type, ...params } = action.action;
          return (
            <div key={index} className="mb-4 p-3 rounded-md bg-gray-50">
              <div className="mb-2 text-sm text-gray-600">
                {action.reasoning}
              </div>
              <div className="font-mono text-blue-600">
                {type}({params ? JSON.stringify(params) : ''})
              </div>
            </div>
          );
        })
      ) : (
        // 가이드 모드 - 두 번째 모듈의 guideSteps 요약 표시
        <div className="text-center p-4">
          <p className="text-gray-600 mb-4">
            Guide mode active - {guideSteps.length} steps are displayed as overlays
          </p>
          {guideSteps.map((step, index) => (
            <div key={index} className="mb-3 p-2 text-left border-l-4 border-green-400 pl-3">
              <div className="font-semibold text-green-700">
                Step {step.stepNumber || index + 1}: {step.title}
              </div>
              <div className="text-sm text-gray-600 line-clamp-2">
                {/* 설명이 너무 길면 자르기 */}
                {step.description.length > 100 
                  ? `${step.description.substring(0, 100)}...` 
                  : step.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}