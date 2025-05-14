import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow, NodeProps } from '@xyflow/react';

export default memo(function CounterNode({ id, data }: NodeProps<{ count?: number }>) {
  const { updateNodeData } = useReactFlow();
  const [count, setCount] = useState(data.count || 0);

  const handleIncrement = () => {
    const newCount = count + 1;
    setCount(newCount);
    updateNodeData(id, { ...data, count: newCount });
  };

  const handleDecrement = () => {
    const newCount = count - 1;
    setCount(newCount);
    updateNodeData(id, { ...data, count: newCount });
  };

  return (
    <div className="p-4 border-2 border-cyan-600 rounded-lg bg-card min-w-[180px] shadow-md text-center">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-600"
      />

      <div className="font-bold text-card-foreground mb-3 text-lg">Counter</div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={handleDecrement}
          className="w-8 h-8 rounded-full border border-border bg-muted cursor-pointer flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
        >
          -
        </button>

        <div className="text-2xl font-bold text-cyan-600 min-w-[50px]">{count}</div>

        <button
          onClick={handleIncrement}
          className="w-8 h-8 rounded-full border border-border bg-muted cursor-pointer flex items-center justify-center text-lg font-bold hover:bg-accent transition-colors"
        >
          +
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="count-output"
        className="!w-3 !h-3 !bg-cyan-600"
      />
    </div>
  );
});
