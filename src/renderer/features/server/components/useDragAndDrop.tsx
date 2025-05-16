import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useDnD } from './DnDContext';
import { useOutletContext } from 'react-router';
import type { ServerItem, ClientRow } from '../../../types';

// 전역 변수 타입 선언 (TypeScript에서 필요)
declare global {
  interface Window {
    __lastDraggedServerId?: string;
    __lastDraggedServer?: ServerItem;
  }
}

// 노드 생성을 위한 ID 생성기
let id = 0;
const getId = (type: string) => `${type}_${id++}`;

// 노드 타입별 기본 데이터 생성
function getNodeDefaultData(type: string, customData?: any) {
  switch (type) {
    case 'text':
    case 'input':
      return { text: '', label: `${type} node` };
    case 'uppercase':
      return { text: '' };
    case 'result':
    case 'output':
      return { label: `${type} node` };
    case 'color':
      return { color: '#000000' };
    case 'image':
      return { imageUrl: null, imageName: null };
    case 'counter':
      return { count: 0 };
    case 'trigger':
      return {
        label: 'START TRIGGER',
        onTrigger: () => {
          console.log('Custom trigger function can be defined here');
        }
      };
    case 'service':
      // customData가 있으면 사용, 없으면 기본 값
      return customData || { };
    case 'default':
      return { label: 'default node' };
    default:
      return { label: `${type} node` };
  }
}

// 기본 노드 타입 목록
const DEFAULT_NODE_TYPES = ['text', 'result', 'color', 'image', 'counter', 'input', 'output', 'uppercase', 'trigger'];

// 드래그 앤 드롭 관리 훅
export function useDragAndDrop() {
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();
  const { clients } = useOutletContext<{ clients: ClientRow[] }>();

  // 드래그 오버 핸들러
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 드롭 핸들러
  const onDrop = useCallback(
    (event: React.DragEvent, setNodes: any) => {
      event.preventDefault();

      console.log('[onDrop] 드롭 이벤트 발생');
      console.log('[onDrop] 사용 가능한 타입:', event.dataTransfer.types);

      // text/plain 데이터 먼저 확인 (우리의 새로운 방식)
      const textData = event.dataTransfer.getData('text/plain');
      console.log('[onDrop] text/plain 데이터 원본:', textData); //[onDrop] text/plain 데이터 원본: SERVER_ID:471


      // 1. SERVER_ID: 접두사가 있는지 확인 - 명확한 비교 사용
      if (textData && typeof textData === 'string' && textData.indexOf('SERVER_ID:') === 0) {
        try {
          // 접두사 제거하여 서버 ID 추출
          const serverId = textData.substring('SERVER_ID:'.length);
          console.log('[onDrop] 서버 ID 추출됨:', serverId); //[onDrop] 서버 ID 추출됨: 471

          // 전역 변수에서 서버 데이터 가져오기
          const serverData = window.__lastDraggedServer;

          if (serverData && serverData.id === serverId) {
            console.log('[onDrop] 서버 노드 생성 시작:', serverData.name || serverData.id);

            // 위치 계산
            const position = screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });

            console.log('[onDrop] 서버 노드 위치 계산됨:', position);

            // ServerNode 생성
            const newNode = {
              id: getId('server'),
              type: 'server', // 반드시 'server' 타입으로 설정
              position,
              data: serverData, // 서버 데이터 그대로 전달
            };

            console.log('[onDrop] 생성할 서버 노드:', newNode);

            setNodes((nds: any) => nds.concat(newNode));
            console.log('[onDrop] 서버 노드 생성 완료');

            // 전역 변수 정리 (선택사항)
            window.__lastDraggedServerId = undefined;
            window.__lastDraggedServer = undefined;

            // 여기서 중요: 반드시 return하여 아래 코드가 실행되지 않도록!
            return;
          } else {
            console.error('[onDrop] 전역 변수에서 서버 데이터를 찾을 수 없음', serverId);
            console.error('현재 저장된 서버 ID:', window.__lastDraggedServerId);
          }
        } catch (e) {
          console.error('SERVER_ID 처리 에러:', e);
        }
      }


      // 2. text/plain에서 'server' 값 확인
      if (textData === 'server') {
        console.log('[onDrop] text/plain에서 server 타입 감지');
        // 서버 노드 생성 (기본 데이터로)
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        setNodes((nds: any) =>
          nds.concat({
            id: getId('server'),
            type: 'server',
            position,
            data: {
              name: 'Default Server',
              id: 'default-server-' + Date.now(),
              status: 'unknown',
              config: {
                name: 'Default Server',
                description: '드래그 앤 드롭으로 생성된 서버',
                github_info: {
                  ownerAvatarUrl: 'https://github.com/github.png'
                }
              }
            },
          }),
        );
        return;
      }

      // 3. 기존 방식 (type 등)
      const draggedData = type || textData;
      if (!draggedData) {
        console.log('No data for drop - ignoring');
        return;
      }

      console.log('[onDrop] 일반 노드 드래그:', draggedData);

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 기본 노드 타입이면 그대로 사용, 아니면 service 타입으로 처리
      const isDefaultNodeType = DEFAULT_NODE_TYPES.includes(draggedData);

      let nodeType = isDefaultNodeType ? draggedData : 'service';
      let customData = null;

      // 기본 타입이 아니면 clients에서 서비스 찾기
      if (!isDefaultNodeType) {
        // clients에서, 이름이 일치하는 클라이언트 찾기
        const service = clients.find(item => item.name === draggedData);

        if (service) {
          console.log('Found service:', service.name);
          customData = {
            config: service,
          };
        } else {
          console.log('Service not found, using fallback');
          customData = {
          
          };
        }
      }

      // 노드 타입에 따른 적절한 데이터 구조 생성
      const nodeData = getNodeDefaultData(nodeType, customData);

      const newNode = {
        id: getId(nodeType),
        type: nodeType,
        position,
        data: nodeData,
      };

      console.log('Creating new node:', newNode);

      setNodes((nds: any) => nds.concat(newNode));
    },
    [screenToFlowPosition, type, clients],
  );

  return {
    onDragOver,
    onDrop,
  };
}
