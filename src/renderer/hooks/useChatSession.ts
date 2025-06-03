// // components/ChatPage.tsx
// import { useEffect, useRef } from 'react';
// import { useParams } from 'react-router';
// import { useStore, useDispatch } from '@/hooks/useStore';

// export default function ChatPage() {
//   const { sessionId } = useParams<{ sessionId: string }>();
//   const store = useStore();
//   const dispatch = useDispatch();
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   // 세션 초기화
//   useEffect(() => {
//     if (sessionId && !store.chat.configs[sessionId]) {
//       dispatch({
//         type: 'chat.initializeSession',
//         payload: {
//           sessionId,
//           config: {
//             model: 'openai/gpt-4',
//             temperature: 0.7
//           }
//         }
//       });
//     }
//   }, [sessionId]);

//   // 메시지 가져오기
//   const messages = sessionId ? store.chat.messages[sessionId] || [] : [];
//   const config = sessionId ? store.chat.configs[sessionId] : null;
//   const streamingContent = sessionId ? store.chat.streamingMessages[sessionId] : null;

//   // 메시지 전송
//   const sendMessage = async (content: string) => {
//     if (!sessionId) return;

//     try {
//       await dispatch({
//         type: 'chat.sendMessage',
//         payload: { sessionId, content }
//       });
//     } catch (error) {
//       console.error('Failed to send message:', error);
//     }
//   };

//   // 스트리밍 메시지 전송
//   const sendStreamingMessage = async (content: string) => {
//     if (!sessionId) return;

//     try {
//       // dispatch를 통한 스트리밍은 복잡하므로 직접 호출
//       const generator = store.chat.sendStreamingMessage(sessionId, content);
      
//       for await (const chunk of generator) {
//         // 청크 처리 (이미 store에서 업데이트됨)
//       }
//     } catch (error) {
//       console.error('Streaming failed:', error);
//     }
//   };

//   // 자동 스크롤
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages, streamingContent]);

//   return (
//     <div className="flex flex-col h-full">
//       {/* 메시지 영역 */}
//       <div className="flex-1 overflow-auto p-4">
//         {messages.map((message) => (
//           <div
//             key={message.id}
//             className={cn(
//               'mb-4 p-3 rounded-lg',
//               message.role === 'user' ? 'bg-blue-100 ml-auto max-w-[80%]' : 'bg-gray-100 mr-auto max-w-[80%]'
//             )}
//           >
//             <div className="font-semibold text-sm mb-1">
//               {message.role === 'user' ? 'You' : 'Assistant'}
//             </div>
//             <div className="whitespace-pre-wrap">{message.content}</div>
//             {message.metadata?.duration && (
//               <div className="text-xs text-gray-500 mt-1">
//                 {message.metadata.duration}ms • {message.metadata.tokens} tokens
//               </div>
//             )}
//           </div>
//         ))}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* 입력 영역 */}
//       <ChatInput onSend={sendMessage} disabled={!!streamingContent} />
//     </div>
//   );
// }



import { useDispatch } from "@zubridge/electron";

import { ChatConfig } from "@/main/stores/chat/chat-types";
import {useStore} from "@/renderer/hooks/useStore";

// hooks/useChatSession.ts - 커스텀 훅으로 만들기
export function useChatSession(sessionId: string | undefined) {
    const store = useStore();
    const dispatch = useDispatch();
  
    const messages = sessionId ? store.chat.messages[sessionId] || [] : [];
    const config = sessionId ? store.chat.configs[sessionId] : null;
    const isStreaming = sessionId ? !!store.chat.streamingMessages[sessionId] : false;
  
    const sendMessage = async (content: string) => {
      if (!sessionId) throw new Error('No session ID');
      
      return dispatch({
        type: 'chat.sendMessage',
        payload: { sessionId, content } 
      });
    };
  
    const updateConfig = (updates: Partial<ChatConfig>) => {
      if (!sessionId) return;
      
      dispatch({
        type: 'chat.updateConfig',
        payload: { sessionId, config: updates }
      });
    };
  
    return {
      messages,
      config,
      isStreaming,
      sendMessage,
      updateConfig
    };
  }