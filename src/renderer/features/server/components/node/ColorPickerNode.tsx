import React, { memo } from 'react';
import { Handle, Position, useReactFlow, NodeProps } from '@xyflow/react';

export default memo(function ColorPickerNode({ id, data }: NodeProps<{ color?: string }>) {
  const { updateNodeData } = useReactFlow();

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { ...data, color: event.target.value });
  };

  return (
    <div className="p-3 border-2 border-orange-500 rounded-lg bg-card min-w-[200px] shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-500"
      />

      <div className="font-bold text-card-foreground mb-2 text-center">
        Color Picker
      </div>

      <div className="mb-2">
        <strong>Selected Color: {data.color || '#000000'}</strong>
      </div>

      <input
        className="nodrag w-full h-10 border-none rounded cursor-pointer"
        type="color"
        onChange={handleColorChange}
        value={data.color || '#000000'}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="color-output"
        className="!w-3 !h-3 !bg-orange-500"
      />
    </div>
  );
});
