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
import FlowToolbar from '../components/Flow/FlowToolbar';
import { DnDProvider } from '../hook/DnDContext';
// Validation 및 Toast 추가
import { 
  isValidConnection, 
  getValidationErrorMessage 
} from '../utils/NodeValidation';
import { useToast } from '@/hooks/use-toast';

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
  // console.log('NodePage');

  const { servers, clients } = useOutletContext<ServerLayoutContext>();
  
  const { toast } = useToast();

  const dynamicInitNodes: MyNode[] = [
    { id: '1', type: 'trigger', data: { label: 'START TRIGGER' }, position: { x: 100, y: 50 } },
    clients && clients.length > 0 ?
      { id: '2', type: 'service', data: { config: clients[0] }, position: { x: 300, y: 50 } } : null,
    servers && servers.length > 0 ?
      { id: '3', type: 'server', data: servers[0], position: { x: 500, y: 50 } } : null,
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
  
  const { onDrop, onDragOver } = useDragAndDrop();

  const {
    onReconnectStart,
    onConnect,
    onReconnect,
    onConnectEnd,
    onReconnectEnd,
    resetEvents,
  } = useFlow();

  const hideContextMenu = useCallback(() => setMenu(null), []);
  useKeyboardShortcuts(nodes, edges, setNodes, setEdges, hideContextMenu);

  const handleDrop = useCallback((event: React.DragEvent) => {
    onDrop(event, setNodes);
  }, [onDrop, setNodes]);

  // 노드 연결 validation 및 Toast 알림
  const onConnectCallback: OnConnect = useCallback(
    (params) => {
      // 타입 validation 검사
      if (!isValidConnection(params, nodes)) {
        const errorMsg = getValidationErrorMessage(params, nodes);
        toast({
          title: errorMsg.title,
          description: errorMsg.description,
          variant: 'destructive',
        });
        return;
      }
      
      // 검사 통과하면 연결 추가
      toast({
        title: '✅ 연결 성공',
        description: '노드가 성공적으로 연결되었습니다!',
        variant: 'success',
      });
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, nodes, toast],
  );

  return (
    <DnDProvider>
      <div className="w-full h-full flex flex-col bg-background">
        {/* 상단 툴바 */}
        <FlowToolbar />
        
        {/* 메인 플로우 영역 */}
        <div className="flex-1 relative">
          <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnectCallback}
              nodeTypes={nodeTypes}
              connectionLineType={ConnectionLineType.SmoothStep}
              defaultEdgeOptions={defaultEdgeOptions}
              onReconnectStart={onReconnectStart}
              onReconnect={onReconnect}
              onReconnectEnd={onReconnectEnd}
              onConnectStart={onReconnectStart}
              onConnectEnd={onConnectEnd}
              onPaneClick={hideContextMenu}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                setMenu({
                  id: node.id,
                  top: event.clientY,
                  left: event.clientX,
                });
              }}
              onDrop={handleDrop}
              onDragOver={onDragOver}
              // 모든 연결 허용 (onConnect에서 실제 validation 처리)
              isValidConnection={() => true}
              fitView
              fitViewOptions={{ padding: 0.1, minZoom: 0.5, maxZoom: 2 }}
              style={{ backgroundColor: 'hsl(var(--background))', paddingRight: 0 }}
              attributionPosition="bottom-right"
              edgesReconnectable
              reconnectRadius={20}
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              <Controls position="bottom-left" />
              <Panel position="top-left">
                <div className="flex flex-col gap-2 p-2 bg-card border border-border rounded-lg shadow-sm">
                  <button
                    className="bg-card border border-border rounded px-4 py-2 cursor-pointer text-sm font-medium text-card-foreground transition-all duration-150 hover:bg-accent hover:border-accent active:bg-muted"
                    onClick={async () => {
                      const { nodes: layoutedNodes, edges: layoutedEdges } =
                        await getLayoutedElements(nodes, edges, {
                          ...elkOptions,
                          'elk.direction': 'DOWN',
                        });
                      setNodes(layoutedNodes as any);
                      setEdges(layoutedEdges as any);
                    }}
                  >
                    Vertical
                  </button>
                  <button
                    className="bg-card border border-border rounded px-4 py-2 cursor-pointer text-sm font-medium text-card-foreground transition-all duration-150 hover:bg-accent hover:border-accent active:bg-muted"
                    onClick={async () => {
                      const { nodes: layoutedNodes, edges: layoutedEdges } =
                        await getLayoutedElements(nodes, edges, {
                          ...elkOptions,
                          'elk.direction': 'RIGHT',
                        });
                      setNodes(layoutedNodes as any);
                      setEdges(layoutedEdges as any);
                    }}
                  >
                    Horizontal
                  </button>
                </div>
              </Panel>
            </ReactFlow>

            {menu && (
              <ContextMenu
                onClick={hideContextMenu}
                onDelete={(id) => {
                  setNodes((nodes) => nodes.filter((node) => node.id !== id));
                  setEdges((edges) =>
                    edges.filter((edge) => edge.source !== id && edge.target !== id),
                  );
                  setMenu(null);
                }}
                id={menu.id}
                top={menu.top}
                left={menu.left}
                right={menu.right}
                bottom={menu.bottom}
              />
            )}
          </div>

          {/* 단축키 안내 */}
          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-card/80 p-3 rounded-lg border shadow-sm">
            <div>Shift+D: Duplicate selected nodes</div>
            <div>Delete: Remove selected items</div>
            <div>Ctrl+A: Select all</div>
            <div>Esc: Close menu/deselect</div>
          </div>
        </div>
      </div>
    </DnDProvider>
  );
}
