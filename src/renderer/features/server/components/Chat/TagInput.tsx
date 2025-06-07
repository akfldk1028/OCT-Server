import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export interface Tag {
  type: 'tool' | 'prompt' | 'resource';
  name: string;
  description?: string;
  serverId?: string;
  serverName?: string;
  // 도구/프롬프트 파라미터 스키마 정보
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface TagInputProps {
  tags: Tag[];
  onTagRemove: (type: string, name: string) => void;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({ tags, onTagRemove, className = '' }) => {
  const getTagIcon = (type: string) => {
    switch (type) {
      case 'tool': return '🔧';
      case 'prompt': return '📝';
      case 'resource': return '📄';
      default: return '🏷️';
    }
  };

  const getTagColor = (type: string) => {
    switch (type) {
      case 'tool': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'prompt': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'resource': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 mb-2 ${className}`}>
      {tags.map((tag) => (
        <div
          key={`${tag.type}-${tag.name}`}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getTagColor(tag.type)}`}
          title={tag.description}
        >
          <span>{getTagIcon(tag.type)}</span>
          <span className="font-medium">{tag.name}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onTagRemove(tag.type, tag.name)}
            className="h-4 w-4 p-0 hover:bg-transparent"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default TagInput; 