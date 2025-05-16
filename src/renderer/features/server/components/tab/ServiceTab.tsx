import React from 'react';
import { JobCard } from '../job-card';
import type { ClientRow } from '../../../../types';
import { Item } from '@radix-ui/react-accordion';

export default function ServiceTab({ collapsed = false, onDragStart, clients = [] }: {
  collapsed?: boolean;
  onDragStart?: (event: React.DragEvent, nodeType: string) => void;
  clients?: ClientRow[];
}) {
  console.log(clients);
  if (collapsed) {
    // 접힘: 로고만 카드 (가운데 정렬, 드래그 지원)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 p-2 justify-items-center">
        {clients.map((item) => (
          <div
            key={item.client_id}
            className="w-15 h-15 sm:w-32 bg-card rounded-xl shadow-md flex items-center justify-center hover:bg-card/80 transition-all duration-200 cursor-grab active:cursor-grabbing"
            title={item.name}
            draggable
            onDragStart={event => {
              if (onDragStart) {
                onDragStart(event, item.name);
              } else {
                event.dataTransfer.setData('text/plain', JSON.stringify(item));
              }
            }}
          >
            <img
              src={item.icon}
              alt={item.name}
              className="w-6 h-6 sm:w-6 sm:h-6 object-contain"
            />
          </div>
        ))}
      </div>
    );
  }

  // 펼침: 직접 데이터 렌더링
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 p-2 overflow-y-auto items-stretch">
      {clients.map((item) => (
        <div
          key={item.client_id}
          className="cursor-grab active:cursor-grabbing"
          draggable
          onDragStart={event => {
            if (onDragStart) {
              onDragStart(event, item.name);
            } else {
              event.dataTransfer.setData('text/plain', item.name);
            }
          }}
        >
          <JobCard
            id={item.client_id}
            company={item.name}
            companyLogoUrl={item.icon}
            companyHq={item.tagline}
            title={item.description}
            postedAt={item.created_at}
            type="AI 서비스"
            positionLocation={item.tagline}
            salary={item.url}
            className="h-full"
          />
        </div>
      ))}
    </div>
  );
}
