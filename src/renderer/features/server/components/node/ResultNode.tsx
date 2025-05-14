import { memo } from 'react';
import {
  Handle,
  Position,
  useNodeConnections,
  useNodesData,
} from '@xyflow/react';
import { isTextNode, type MyNode } from '../../components/initialElements';

function ResultNode() {
  const connections = useNodeConnections({
    handleType: 'target',
  });
  const nodesData = useNodesData<MyNode>(
    connections.map((connection) => connection.source),
  );
  const textNodes = nodesData.filter(isTextNode);

  return (
    <div className="p-3 border-2 border-purple-500 rounded-lg bg-card min-w-[200px] shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-500"
      />
      <div className="font-bold text-card-foreground mb-2 text-center">Result</div>
      <div className="text-sm text-muted-foreground">
        <span className="font-semibold">incoming texts:</span>
        {textNodes.length > 0 ? (
          <div className="mt-2 p-2 bg-muted rounded">
            {textNodes.map(({ data }, i) => (
              <div
                key={i}
                className={`py-1 ${i < textNodes.length - 1 ? 'border-b border-border' : ''}`}
              >
                "{data.text}"
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-muted-foreground italic text-center">none</div>
        )}
      </div>
    </div>
  );
}

export default memo(ResultNode);
