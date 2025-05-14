import { memo } from 'react';
import {
  Position,
  Handle,
  useReactFlow,
  type NodeProps,
  type Node,
} from '@xyflow/react';

function TextNode({
  id,
  data,
}: NodeProps<Node<{ text: string; label?: string }>>) {
  const { updateNodeData } = useReactFlow();

  // data.text가 undefined일 수 있으므로 기본값 설정
  const currentText = data.text || '';

  return (
    <div className="p-3 border-2 border-blue-500 rounded-lg bg-card min-w-[150px] shadow-md">
      <div className="font-bold text-card-foreground mb-2 text-center">
        {data.label || `node ${id}`}
      </div>
      <div>
        <input
          onChange={(evt) =>
            updateNodeData(id, { ...data, text: evt.target.value })
          }
          value={currentText}
          className="w-full p-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card text-card-foreground"
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500"
      />
    </div>
  );
}

export default memo(TextNode);
