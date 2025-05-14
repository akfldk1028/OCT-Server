import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

interface ContextMenuProps {
  id: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  onClick?: () => void;
}

export default function ContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  onClick,
  ...props
}: ContextMenuProps) {
  const { getNode, setNodes, addNodes, setEdges } = useReactFlow();

  const duplicateNode = useCallback(() => {
    const node = getNode(id);
    if (!node) return;

    const position = {
      x: node.position.x + 50,
      y: node.position.y + 50,
    };

    addNodes({
      ...node,
      selected: false,
      dragging: false,
      id: `${node.id}-copy-${Date.now()}`,
      position,
    });

    onClick?.();
  }, [id, getNode, addNodes, onClick]);

  const deleteNode = useCallback(() => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));

    onClick?.();
  }, [id, setNodes, setEdges, onClick]);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
      }}
      className="bg-card border border-border rounded-md p-2 shadow-lg z-[1000] min-w-[150px]"
      {...props}
    >
      <p className="m-0 mb-2 text-xs text-muted-foreground font-medium">
        Node: {id}
      </p>
      <button
        onClick={duplicateNode}
        className="block w-full p-1.5 my-1 border border-border rounded cursor-pointer text-sm bg-muted transition-colors duration-150 hover:bg-accent"
      >
        Duplicate
      </button>
      <button
        onClick={deleteNode}
        className="block w-full p-1.5 my-1 border border-border rounded cursor-pointer text-sm bg-destructive text-destructive-foreground transition-colors duration-150 hover:bg-red-600 hover:text-white"
      >
        Delete
      </button>
    </div>
  );
}
