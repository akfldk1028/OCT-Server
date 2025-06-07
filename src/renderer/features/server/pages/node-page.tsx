import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
} from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type OnConnect,
  type Node,
  type XYPosition,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// import './components/dnd.css';
// 커스텀 CSS 스타일 추가
import './reactflow-edges.css';

// ELK는 React import 이후에
import ELK from 'elkjs/lib/elk.bundled.js';

// Custom components
import { Button } from '@/components/ui/button';
import TextNode from '../components/node/TextNode';
import ResultNode from '../components/node/ResultNode';
import ColorPickerNode from '../components/node/ColorPickerNode';
import ImageNode from '../components/node/ImageNode';
import CounterNode from '../components/node/CounterNode';
import ServiceNode from '../components/node/ServiceNode';
import ServerNode from '../components/node/ServerNode';
import TriggerNode from '../components/node/TriggerNode';
import Sidebar from '../components/Sidebar';
import ContextMenu from '../components/node/ContextMenu';
import { useFlow } from '../hook/useFlowEvents';
import { useDragAndDrop } from '../hook/useDragAndDrop';
import { useKeyboardShortcuts } from '../hook/useKeyboardShortcuts'; // 새로 추가
import { type MyNode } from '../components/initialElements';
import { useOutletContext } from 'react-router';
import type { ServerLayoutContext } from '../types/server-types';
import { config } from 'process';
import FlowToolbar from '../components/Flow/FlowToolbar';

// ResizeObserver 에러 무시 (ReactFlow의 알려진 무해한 에러)
const suppressResizeObserverError = () => {
  if (typeof window !== 'undefined') {
    const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/;
    const resizeObserverLoopErr = (e: ErrorEvent) => {
      if (e.message && e.message.match(resizeObserverLoopErrRe)) {
        const resizeObserverErrDiv = document.getElementById(
          'webpack-dev-server-client-overlay-div',
        );
        const resizeObserverErr = document.getElementById(
          'webpack-dev-server-client-overlay',
        );
        if (resizeObserverErr) {
          resizeObserverErr.style.display = 'none';
        }
        if (resizeObserverErrDiv) {
          resizeObserverErrDiv.style.display = 'none';
        }
      }
    };
    window.addEventListener('error', resizeObserverLoopErr);
  }
};

suppressResizeObserverError();

const nodeTypes = {
  text: TextNode,
  result: ResultNode,
  input: TextNode,
  output: ResultNode,
  color: ColorPickerNode,
  image: ImageNode,
  counter: CounterNode,
  service: ServiceNode,
  server: ServerNode,
  trigger: TriggerNode,
  default: (props: any) => (
    <div
      style={{
        padding: '12px',
        border: '2px solid #666',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        minWidth: '150px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div>{props.data.label || 'Default Node'}</div>
    </div>
  ),
} as const;

// 엣지 기본 스타일 정의
const defaultEdgeOptions = {
  style: { strokeWidth: 2 },
  type: 'smoothstep',
  animated: true,
};

const initNodes: MyNode[] = [
  { id: '1', type: 'trigger', data: { label: 'START TRIGGER' }, position: { x: 100, y: 50 } },
  { id: '2', type: 'service', data: { name: 'Service', icon: 'https://github.com/teslamotors.png', description: 'Service Node' }, position: { x: 300, y: 50 } },
  { id: '3', type: 'server', data: { name: 'Server', id: 'server-1', status: 'active', config: { name: 'Server', description: 'Server Node', github_info: { ownerAvatarUrl: 'https://github.com/github.png' } } }, position: { x: 500, y: 50 } },
];

const initEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { strokeWidth: 2 }, type: 'smoothstep' },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { strokeWidth: 2 }, type: 'smoothstep' },
];

// ELK layout setup
const elk = new ELK();
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '50',
} as const;

const getLayoutedElements = async (
  nodes: Node<any>[],
  edges: Edge[],
  options = {} as Record<string, any>,
) => {
  const isHorizontal = options['elk.direction'] === 'RIGHT';
  const graph = {
    id: 'root',
    layoutOptions: options,
    children: nodes.map((node) => ({
      ...node,
      width: 200,
      height: 80,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
    })),
    edges,
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    return {
      nodes: layoutedGraph.children.map((n) => ({
        ...n,
        position: { x: n.x, y: n.y },
      })),
      edges: layoutedGraph.edges,
    };
  } catch (error) {
    console.error('ELK layout error:', error);
    return { nodes, edges };
  }
};

export default function NodePage() {
  // 실제 데이터 context에서 받아오기
  const { servers, clients } = useOutletContext<ServerLayoutContext>();

  
    // console.log("[node-page] ✅✅")
    // console.log(servers)
    // console.log( clients)
    // console.log("[node-page] ✅✅")

  const dynamicInitNodes: MyNode[] = [
    { id: '1', type: 'trigger', data: { label: 'START TRIGGER' }, position: { x: 100, y: 50 } },
    clients && clients.length > 0 ?
      { id: '2', type: 'service', data: { config: clients[0] }, position: { x: 300, y: 50 } } : null,
    servers && servers.allServers && servers.allServers.length > 0 ?
      { id: '3', type: 'server', data: servers.allServers[0], position: { x: 500, y: 50 } } : null,
  ].filter(Boolean) as MyNode[];

  const dynamicInitEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { strokeWidth: 2 }, type: 'smoothstep' },
    { id: 'e2-3', source: '2', target: '3', animated: true, style: { strokeWidth: 2 }, type: 'smoothstep' },
  ];




  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(dynamicInitNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(dynamicInitEdges);
  const { fitView } = useReactFlow();
  const [menu, setMenu] = useState<{
    id: string;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  } | null>(null);

  // 사이드바 토글 상태 추가
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    events,
    onReconnectStart,
    onConnectStart,
    onConnect,
    onReconnect,
    onConnectEnd,
    onReconnectEnd,
    resetEvents,
  } = useFlow();

  const { onDragOver, onDrop } = useDragAndDrop();
  const hideContextMenu = useCallback(() => setMenu(null), []);
  useKeyboardShortcuts(nodes, edges, setNodes, setEdges, hideContextMenu);

  useEffect(() => {
    if (!events.onReconnectEnd && !events.onConnectEnd) return;

    const timer = setTimeout(() => {
      resetEvents();
    }, 500);

    return () => clearTimeout(timer);
  }, [events.onReconnectEnd, events.onConnectEnd, resetEvents]);

  const onConnectHandler: OnConnect = useCallback(
    (conn) => {
      // 새 연결에 애니메이션과 스타일 적용
      setEdges((eds) => addEdge({
        ...conn,
        animated: true, 
        // @ts-ignore - style 속성은 실제로 작동하지만 타입 정의가 안되어 있음
        style: { strokeWidth: 2 },
        type: 'smoothstep'
      }, eds));
      onConnect();
    },
    [setEdges, onConnect],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      onDrop(event, setNodes);
    },
    [onDrop, setNodes],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();

      const pane = reactFlowWrapper.current?.getBoundingClientRect();
      if (!pane) return;

      setMenu({
        id: node.id,
        top: event.clientY < pane.height - 200 ? event.clientY : undefined,
        left: event.clientX < pane.width - 200 ? event.clientX : undefined,
        right:
          event.clientX >= pane.width - 200
            ? pane.width - event.clientX
            : undefined,
        bottom:
          event.clientY >= pane.height - 200
            ? pane.height - event.clientY
            : undefined,
      });
    },
    [setMenu],
  );

  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  const applyLayout = useCallback(
    async (direction: 'DOWN' | 'RIGHT' = 'DOWN') => {
      try {
        const { nodes: ln, edges: le } = await getLayoutedElements(
          nodes,
          edges,
          {
            ...elkOptions,
            'elk.direction': direction,
          },
        );
        setNodes(ln);
        setEdges(le);
        setTimeout(() => {
          fitView({
            padding: 0.1,
            duration: 300,
          });
        }, 150);
      } catch (error) {
        console.error('Layout application error:', error);
      }
    },
    [nodes, edges, setNodes, setEdges, fitView],
  );

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyLayout('DOWN');
      });
    });
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" ref={reactFlowWrapper}>
      {/* Toolbar 추가 */}
      <FlowToolbar />
      
      {/* 메인 Flow 영역 */}
      <div className="flex-1 h-full bg-background text-foreground relative transition-all duration-300 flex flex-row">
        <div className="flex-1 h-full bg-background text-foreground relative transition-all duration-300">
          <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnectHandler}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onReconnectStart={onReconnectStart}
          onReconnect={onReconnect}
          onReconnectEnd={onReconnectEnd}
          onDrop={handleDrop}
          onDragOver={onDragOver}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ strokeWidth: 2, stroke: 'hsl(var(--primary))' }}
          fitView
          fitViewOptions={{ padding: 0.1, minZoom: 0.5, maxZoom: 2 }}
          style={{ backgroundColor: 'hsl(var(--background))', paddingRight: sidebarOpen ? 320 : 0 }}
          attributionPosition="bottom-right"
          edgesReconnectable
        >
          <Panel position="top-left" >
            <div className="flex gap-2 ">
              <button
                className="bg-card border border-border rounded px-4 py-2 cursor-pointer text-sm font-medium text-card-foreground transition-all duration-150 hover:bg-accent hover:border-accent active:bg-muted"
                onClick={() => applyLayout('DOWN')}
              >
                Vertical
              </button>
              <button
                className="bg-card border border-border rounded px-4 py-2 cursor-pointer text-sm font-medium text-card-foreground transition-all duration-150 hover:bg-accent hover:border-accent active:bg-muted"
                onClick={() => applyLayout('RIGHT')}
              >
                Horizontal
              </button>
              {/* 사이드바 토글 버튼 */}
              <button
                className="bg-card border border-border rounded px-4 py-2 cursor-pointer text-sm font-medium text-card-foreground transition-all duration-150 hover:bg-accent hover:border-accent active:bg-muted"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? '◀ Hide' : '▶ Show'}
              </button>
            </div>
          </Panel>
          <Controls />
          <Background />
          {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
        </ReactFlow>


        {/* 키보드 단축키 안내 */}
        <div className="absolute bottom-2.5 left-12 bg-card text-card-foreground border border-border p-2.5 rounded-lg shadow-md text-xs opacity-80 z-10">
          <div className="font-semibold">
            Keyboard Shortcuts:
          </div>
          <div>Delete/Backspace: Delete selected</div>
          <div>Ctrl+S: Save (coming soon)</div>
          <div>Ctrl+Z: Undo (coming soon)</div>
          <div>Esc: Close menu/deselect</div>
        </div>

        {/* 오른쪽 사이드바 */}
        {sidebarOpen && (
          <div
            className="absolute top-1 right-12 h-[calc(100%)] z-30"
            style={{
              width: sidebarOpen ? 350 : 64,
              minWidth: sidebarOpen ? 350 : 64,
              maxWidth: sidebarOpen ? 350 : 64,
              transition: 'width 0.3s',
            }}
          >
            <aside
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
