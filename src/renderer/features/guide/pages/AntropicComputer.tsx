import React from 'react';
import { FaGithub, FaStop, FaTrash } from 'react-icons/fa';
import { HiMinus, HiX } from 'react-icons/hi';
import { RunHistory } from '../components/RunHistory';
import { RootState } from '@/common/types/root-types';

import { useStore} from '../../../hooks/useStore';
import { useDispatch } from '@zubridge/electron';
import { AntropicRun } from '../components/AntropicRun';



export default function AntropicComputer() {
  const dispatch = useDispatch<RootState>();

  const { instructions, running, error, fullyAuto, runHistory } = useStore();


  // Add local state for instructions
  const [localInstructions, setLocalInstructions] = React.useState(
    instructions ?? '',
  );
  // Toast function (simplified for Tailwind version)
  const showToast = (message) => {
    // This would be replaced with your Tailwind toast implementation
    alert(message);
  };

  const startRun = () => {
    // Update Zustand state before starting the run
    dispatch({ type: 'SET_INSTRUCTIONS', payload: localInstructions });
    dispatch({ type: 'RUN_AGENT_AUTO', payload: null });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      startRun();
    }
  };

  return (
    <div 
      className="relative w-full h-screen p-4"
    >
      {/* Title heading no longer needs drag property since parent is draggable */}
      <div className="absolute top-2 left-6">
        <h1 className="font-hairline font-serif text-xl">Agent.exe</h1>
      </div>

      {/* Window controls and GitHub button moved together */}
      <div 
        className="absolute top-2 right-2 flex"
      >
        <a href="https://github.com/corbt/agent.exe" target="_blank" rel="noopener noreferrer">
          <button className="p-0 min-w-8 text-gray-600 hover:text-gray-900">
            <FaGithub />
          </button>
        </a>
        <button
          className="p-0 min-w-8 text-gray-600 hover:text-gray-900"
          // onClick={() => window.electron.windowControls.minimize()}
        >
          <HiMinus />
        </button>
        <button
          className="p-0 min-w-8 text-gray-600 hover:text-gray-900"
          // onClick={() => window.electron.windowControls.close()}
        >
          <HiX />
        </button>
      </div>

      <div 
        className="flex flex-col items-center h-full w-full pt-16 space-y-4"
      >
        <textarea
          placeholder="What can I do for you today?"
          className="w-full min-h-12 p-4 rounded-2xl border border-opacity-50 border-gray-400 resize-none overflow-hidden transition-all hover:shadow focus:border-gray-500 focus:outline-none focus:shadow"
          // style={{ WebkitAppRegion: 'no-drag' }}
          value={localInstructions}
          disabled={running}
          onChange={(e) => {
            setLocalInstructions(e.target.value);
            // Auto-adjust height
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={handleKeyDown}
        />
        
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center space-x-2">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={fullyAuto}
                onChange={() => {
                  showToast("Whoops, automatic mode isn't actually implemented yet. 😬");
                }}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span>Full Auto</span>
          </div>
          
          <div className="flex items-center">
            {running && <div className="mr-2 text-gray-500">
              {/* Simple spinner using border */}
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            </div>}
            
            {!running && runHistory.length > 0 && (
              <button
                className="bg-transparent font-normal hover:bg-white hover:bg-opacity-50 hover:border-gray-300 hover:shadow focus:shadow focus:outline-none rounded-xl border border-gray-200"
                onClick={() => dispatch('CLEAR_HISTORY')}
                aria-label="Clear history"
              >
                <FaTrash />
              </button>
            )}
            
            <button
              className="bg-transparent font-normal hover:bg-white hover:bg-opacity-50 hover:border-gray-300 hover:shadow focus:shadow focus:outline-none rounded-xl border border-gray-200 ml-2 px-3 py-1"
              onClick={running ? () => dispatch('STOP_RUN') : startRun}
              disabled={!running && localInstructions?.trim() === ''}
            >
              {running ? <FaStop /> : "Let's Go"}
            </button>
          </div>
        </div>

        {/* Add error display */}
        {error && (
          <div className="w-full text-red-700">
            {error}
          </div>
        )}

        {/* RunHistory component */}
        <div className="flex-1 w-full overflow-auto">
          {/* <RunHistory /> */}
          <AntropicRun />
        </div>
      </div>
    </div>
  );
}