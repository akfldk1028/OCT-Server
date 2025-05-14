import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

interface TriggerNodeProps {
  id: string;
  data: {
    label?: string;
    onTrigger?: () => void;
  };
  selected?: boolean;
}

export default function TriggerNode({ id, data, selected }: TriggerNodeProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleTrigger = () => {
    setIsRunning(true);
    
    // 로그 추가
    const newLog = `[${new Date().toLocaleTimeString()}] Trigger ${id} activated`;
    setLogs((prevLogs) => [...prevLogs.slice(-4), newLog]); // 최대 5개 로그 유지
    
    console.log(newLog);
    
    // 커스텀 콜백 실행
    if (data.onTrigger) {
      data.onTrigger();
    }
    
    // 1초 후 실행 완료 상태로 변경
    setTimeout(() => {
      setIsRunning(false);
      const completedLog = `[${new Date().toLocaleTimeString()}] Trigger ${id} completed`;
      setLogs((prevLogs) => [...prevLogs.slice(-4), completedLog]);
      console.log(completedLog);
    }, 1000);
  };

  return (
    <div className={`p-4 bg-card border ${selected ? 'border-primary shadow-md ring-2 ring-primary/30' : 'border-border shadow'} rounded-lg flex flex-col max-w-[250px] transition-shadow duration-200`}>
      
      <Handle type="target" position={Position.Left} className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800" />
      
      <div className="text-lg font-bold text-center mb-3">
        {data.label || "START TRIGGER"}
      </div>
      
      <button
        className={`py-3 px-4 rounded-lg font-bold text-white ${
          isRunning 
            ? 'bg-amber-500 cursor-not-allowed' 
            : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
        } transition-colors duration-200 flex items-center justify-center`}
        onClick={handleTrigger}
        disabled={isRunning}
      >
        {isRunning ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            PROCESSING...
          </>
        ) : (
          <>
            <svg className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            PLAY
          </>
        )}
      </button>
      
      {logs.length > 0 && (
        <div className="mt-3 text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 max-h-[100px] overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-muted-foreground">{log}</div>
          ))}
        </div>
      )}
      
      
      <Handle type="source" position={Position.Right} className="!w-5 !h-5 !bg-primary !border-2 !border-white dark:!border-gray-800" />
    </div>
  );
} 