// src/renderer/features/guide/pages/overlayHome-page.tsx
import React from 'react';
import { FaStop, FaTrash } from 'react-icons/fa';
import { HiSelector } from 'react-icons/hi';
import { Textarea } from '@/renderer/common/components/ui/textarea';
import { Button } from '@/renderer/common/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/common/components/ui/select';
import { useDispatch } from '@zubridge/electron';
import { CombinedState } from '@/common/types/root-types';
import { useStore } from '../../../hooks/useStore';
import { RunHistory } from '../components/RunHistory';
import type { AppState as ActionAppState } from '../../../../common/types/action-types';
import type { AppState as OverlayAppState } from '../../../../common/types/overlay-types';
import { AntropicRun } from '../components/AntropicRun';
import { IS_WEB } from '../../../utils/environment';

export default function OverlayHome() {
  if (IS_WEB) {
    return null;
  }
  const dispatch = useDispatch<CombinedState>();
  const {
    instructions,
    running,
    error,
   fullyAuto,
   runHistory,
   isGuideMode,
    activeSoftware,
  } = useStore();

  const [localInstructions, setLocalInstructions] = React.useState(
    instructions ?? '',
  );
  const [selectedSoftware, setSelectedSoftware] = React.useState(
    activeSoftware || 'unknown',
  );
  const [showToast, setShowToast] = React.useState(false);
  const [mode, setMode] = React.useState<'guide' | 'auto'>(
    fullyAuto ? 'auto' : 'guide',
  );

  const softwareOptions = [
    { value: 'unknown', label: '자동 감지' },
    { value: 'vscode', label: 'Visual Studio Code' },
    { value: 'excel', label: 'Microsoft Excel' },
    { value: 'word', label: 'Microsoft Word' },
    { value: 'chrome', label: 'Google Chrome' },
    { value: 'photoshop', label: 'Adobe Photoshop' },
    { value: 'figma', label: 'Figma' },
  ];

  const startRun = async () => {
    console.log('🚀 실행!', { mode, localInstructions, selectedSoftware });
    if (mode === 'auto') {
      dispatch({ type: 'SET_INSTRUCTIONS', payload: localInstructions });
      dispatch({ type: 'RUN_AGENT_AUTO', payload: null });
    } else {
      dispatch({
        type: 'SET_INSTRUCTIONS_OVERLAY',
        payload: {
          software: selectedSoftware,
          question: 'How do I use this software?',
        },
      });
      dispatch({ type: 'RUN_AGENT_OVERLAY', payload: null });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      startRun();
    }
  };

  const toggleMode = () => {
    const next = mode === 'guide' ? 'auto' : 'guide';
    setMode(next);
    setLocalInstructions(
      'find flights from seoul to sf for next tuesday to thursday',
    );
    // Action store에 자동 모드 플래그 업데이트
    dispatch({ type: 'SET_FULLY_AUTO', payload: next === 'auto' });
    // Overlay store에 가이드 모드 토글
    dispatch({ type: 'TOGGLE_GUIDE_MODE', payload: next === 'guide' });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const isProcessing = running;
  const errorMessage = error;

  return (
    <div
      className="relative w-full h-screen p-4"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="absolute top-2 left-6">
        <h1 className="font-hairline font-serif text-xl">Computer Agent</h1>
      </div>

      <div className="flex flex-col items-center h-full w-full pt-16 space-y-4">
        {mode === 'guide' && (
          <div className="w-full">
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-gray-700 mr-2">
                소프트웨어:
              </span>
              <Select
                value={selectedSoftware}
                onValueChange={setSelectedSoftware}
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="소프트웨어 선택" />
                </SelectTrigger>
                <SelectContent>
                  {softwareOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Textarea
          placeholder={
            mode === 'auto' ? localInstructions : 'How do I use this software?'
          }
          className="w-full min-h-12 p-4 rounded-2xl border border-gray-300 resize-none"
          style={{ WebkitAppRegion: 'no-drag' }}
          value={
            mode === 'auto' ? localInstructions : 'How do I use this software?'
          }
          disabled={isProcessing}
          onChange={(e) => {
            setLocalInstructions(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="flex justify-between items-center w-full">
          <div className="flex items-center select-none font-sans space-x-2">
            <span
              className={`text-sm font-medium ${mode === 'guide' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Guide
            </span>
            <button
              type="button"
              className={`relative w-12 h-7 rounded-full transition-colors ${mode === 'auto' ? 'bg-primary' : 'bg-muted'}`}
              aria-pressed={mode === 'auto'}
              onClick={toggleMode}
              style={{ minWidth: 48 }}
            >
              <span
                className={`absolute left-1 top-1 w-5 h-5 rounded-full bg-background transform transition-transform ${
                  mode === 'auto' ? 'translate-x-5' : ''
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${mode === 'auto' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Auto
            </span>
          </div>

          <div className="flex items-center">
            {isProcessing && <FaStop className="mr-2 animate-spin" />}
            {!isProcessing && runHistory.length > 0 && (
              <Button
                onClick={() => dispatch({ type: 'CLEAR_HISTORY' })}
                className="bg-transparent"
              >
                <FaTrash />
              </Button>
            )}
            <Button
              onClick={
                isProcessing
                  ? mode === 'auto'
                    ? () => dispatch({ type: 'STOP_RUN' })
                    : () => dispatch({ type: 'STOP_APP' })
                  : startRun
              }
              disabled={!isProcessing && !localInstructions.trim()}
            >
              {isProcessing ? <FaStop /> : "Let's Go"}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="w-full text-red-700">{errorMessage}</div>
        )}

        <div className="w-full text-center text-xs text-gray-500 italic">
          {mode === 'auto'
            ? 'Auto Mode: Claude will control your computer automatically.'
            : 'Guide Mode: Claude provides step-by-step overlays.'}
        </div>

        <div className="flex-1 w-full overflow-auto">
          {mode === 'auto' ? (
            <AntropicRun />
          ) : (
            <div className="text-center p-4 text-gray-500">
              <p className="text-lg font-semibold mb-2">
                {isGuideMode ? 'Guide Mode Active' : 'Guide Mode Disabled'}
              </p>
              <p>
                {isGuideMode
                  ? 'Instructions will appear as overlays on your screen.'
                  : 'Please enable guide mode to receive on-screen instructions.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-md">
          <p>Mode switched to {mode.toUpperCase()}.</p>
        </div>
      )}
    </div>
  );
}
