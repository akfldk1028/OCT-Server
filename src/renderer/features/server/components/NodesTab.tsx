import React from 'react';

const nodes = [
  { type: 'trigger', label: 'START TRIGGER', color: 'bg-emerald-600', icon: <span className="w-6 h-6 rounded bg-emerald-600 inline-block" /> },
  { type: 'text', label: 'Text Node', color: 'bg-blue-500', icon: <span className="w-6 h-6 rounded bg-blue-500 inline-block" /> },
  { type: 'result', label: 'Result Node', color: 'bg-purple-500', icon: <span className="w-6 h-6 rounded bg-purple-500 inline-block" /> },
  { type: 'color', label: 'Color Picker', color: 'bg-orange-400', icon: <span className="w-6 h-6 rounded bg-orange-400 inline-block" /> },
  { type: 'image', label: 'Image Node', color: 'bg-pink-500', icon: <span className="w-6 h-6 rounded bg-pink-500 inline-block" /> },
  { type: 'counter', label: 'Counter Node', color: 'bg-cyan-600', icon: <span className="w-6 h-6 rounded bg-cyan-600 inline-block" /> },
];

interface NodesTabProps {
  collapsed: boolean;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export default function NodesTab({ collapsed, onDragStart }: NodesTabProps) {
  return (
    <>
      {nodes.map((node) => (
        <div
          key={node.type}
          className={`transition-all duration-200 select-none cursor-grab rounded-lg shadow-md ${collapsed ? 'w-10 h-10 flex items-center justify-center' : `p-3 text-center font-medium text-white ${node.color} hover:shadow-lg active:scale-95 active:cursor-grabbing`}`}
          onDragStart={(event) => onDragStart(event, node.type)}
          draggable
          data-node-type={node.type}
          title={node.label}
        >
          {collapsed ? node.icon : node.label}
        </div>
      ))}
    </>
  );
} 