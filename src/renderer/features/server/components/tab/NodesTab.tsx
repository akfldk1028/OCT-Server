import React from 'react';
import { FaPlay, FaFont, FaCheckCircle, FaPalette, FaImage, FaHashtag } from 'react-icons/fa';

const nodes = [
  {
    type: 'trigger',
    label: 'START TRIGGER',
    color: 'bg-primary',
    icon: <FaPlay size={32} />,
  },
  {
    type: 'text',
    label: 'Text Node',
    color: 'bg-chart-1',
    icon: <FaFont size={32} />,
  },
  {
    type: 'result',
    label: 'Result Node',
    color: 'bg-chart-2',
    icon: <FaCheckCircle size={32} />,
  },
  {
    type: 'color',
    label: 'Color Picker',
    color: 'bg-chart-3',
    icon: <FaPalette size={32} />,
  },
  {
    type: 'image',
    label: 'Image Node',
    color: 'bg-chart-4',
    icon: <FaImage size={32} />,
  },
  {
    type: 'counter',
    label: 'Counter Node',
    color: 'bg-chart-5',
    icon: <FaHashtag size={32} />,
  },
];

interface NodesTabProps {
  collapsed: boolean;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export default function NodesTab({ collapsed, onDragStart }: NodesTabProps) {
  if (collapsed) {
    // 접힘: 아이콘만, 중앙 정렬
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        {nodes.map((node) => (
          <div
            key={node.type}
            className={`flex items-center justify-center rounded-xl shadow-md transition-all duration-200 select-none cursor-grab ${node.color} hover:shadow-lg active:scale-95 active:cursor-grabbing w-10 h-10`}
            onDragStart={(event) => onDragStart(event, node.type)}
            draggable
            data-node-type={node.type}
            title={node.label}
          >
            <span className="text-white flex items-center justify-center">
              {React.cloneElement(node.icon, { size: 20 })}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // 펼침: 아이콘+라벨
  return (
    <div className="grid grid-cols-2 gap-4 p-2">
      {nodes.map((node) => (
        <div
          key={node.type}
          className={`flex flex-col items-center justify-center rounded-xl shadow-md transition-all duration-200 select-none cursor-grab ${node.color} hover:shadow-lg active:scale-95 active:cursor-grabbing py-4`}
          onDragStart={(event) => onDragStart(event, node.type)}
          draggable
          data-node-type={node.type}
          title={node.label}
        >
          <div className="flex items-center justify-center mb-2 text-white">
            {node.icon}
          </div>
          <span className="text-xs text-white font-medium text-center leading-tight truncate w-full px-1">
            {node.label}
          </span>
        </div>
      ))}
    </div>
  );
}
