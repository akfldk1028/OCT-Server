// hooks/useChatCreation.ts
import { useState, useEffect } from 'react';
import { useDispatch, useStore } from '@/hooks/useStore';
import { useNavigate } from 'react-router';

export const useChatCreation = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();

  const [pendingRoomCreation, setPendingRoomCreation] = useState<{
    resolve: (id: string) => void;
    beforeIds: string[];
  } | null>(null);

  const [pendingSessionCreation, setPendingSessionCreation] = useState<{
    resolve: (id: string) => void;
    beforeIds: string[];
  } | null>(null);

  // Room 변경 감지
  useEffect(() => {
    if (pendingRoomCreation) {
      const currentIds = Object.keys(store.room.rooms);
      const newId = currentIds.find(id => !pendingRoomCreation.beforeIds.includes(id));
      
      if (newId) {
        pendingRoomCreation.resolve(newId);
        setPendingRoomCreation(null);
      }
    }
  }, [store.room.rooms, pendingRoomCreation]);

  // Session 변경 감지
  useEffect(() => {
    if (pendingSessionCreation) {
      const currentIds = Object.keys(store.session.sessions);
      const newId = currentIds.find(id => !pendingSessionCreation.beforeIds.includes(id));
      
      if (newId) {
        pendingSessionCreation.resolve(newId);
        setPendingSessionCreation(null);
      }
    }
  }, [store.session.sessions, pendingSessionCreation]);

  const createNewChat = async (title: string = 'New Chat') => {
    try {
      // 1. Room 생성
      const roomPromise = new Promise<string>((resolve) => {
        setPendingRoomCreation({
          resolve,
          beforeIds: Object.keys(store.room.rooms)
        });
      });
      
      dispatch({ type: 'room.createRoom', payload: title });
      const roomId = await roomPromise;
      console.log('🔄 Room created:', roomId);

      // 2. Session 생성
      const sessionPromise = new Promise<string>((resolve) => {
        setPendingSessionCreation({
          resolve,
          beforeIds: Object.keys(store.session.sessions)
        });
      });
      
      dispatch({ type: 'session.createSession', payload: { roomId } });
      const sessionId = await sessionPromise;
      console.log('🔄 Session created:', sessionId);
      // store.room.addSessionToRoom(roomId, sessionId);
      // 3. Room에 Session 추가
      dispatch({
        type: 'room.addSessionToRoom',
        payload: { roomId, sessionId }
      });
      // 4. ChatStore 초기화 (선택사항)
      dispatch({
        type: 'chat.initializeSession',
        payload: {
          sessionId,
          config: {
            model: 'openai/gpt-4o-mini',
            temperature: 0.7
          }
        }
      });

      // 5. 페이지 이동
      navigate(`/jobs/chat/${sessionId}`);
      
      return { roomId, sessionId };
    } catch (err) {
      console.error('Failed to create new chat:', err);
      throw err;
    }
  };

  return { createNewChat };
};
