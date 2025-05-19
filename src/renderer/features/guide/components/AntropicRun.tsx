import { useEffect } from 'react';
import { useStore } from '../../../hooks/useStore';
import { extractAction } from '../../../../main/computer/antropic/extractAction';

export function AntropicRun() {
  const { runHistory } = useStore();

  const messages = runHistory
    .filter((m) => m.role === 'assistant')
    .map((m) => extractAction(m));

  useEffect(() => {
    const element = document.getElementById('run-history');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]); // Scroll when messages change

  if (runHistory.length === 0) return null;

  return (
    <div
      id="run-history" // Add ID for scrolling
      className="w-full h-full bg-white rounded-2xl border border-opacity-50 border-gray-400 p-4 overflow-auto"
    >
      {messages.map((action, index) => {
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
      })}
    </div>
  );
}