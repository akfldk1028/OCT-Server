import React, { memo, useRef } from 'react';
import { Handle, Position, useReactFlow, NodeProps } from '@xyflow/react';

export default memo(function ImageNode({ id, data }: NodeProps<{ imageUrl?: string; imageName?: string }>) {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        updateNodeData(id, { ...data, imageUrl: result, imageName: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-3 border-2 border-pink-500 rounded-lg bg-card min-w-[200px] shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-pink-500"
      />

      <div className="font-bold text-card-foreground mb-2 text-center">Image Node</div>

      <div className="w-full h-[120px] border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer bg-muted mb-2" onClick={handleImageClick}>
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.imageName || 'Uploaded image'}
            className="max-w-full max-h-full rounded"
          />
        ) : (
          <div className="text-center text-muted-foreground text-sm">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <div>Click to upload image</div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
        className="nodrag"
      />

      {data.imageName && (
        <div className="text-xs text-muted-foreground text-center mb-2">{data.imageName}</div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="image-output"
        className="!w-3 !h-3 !bg-pink-500"
      />
    </div>
  );
});
