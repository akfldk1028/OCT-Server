import React from 'react';
import { JobCard } from './job-card';
import tempData from '../Temp/temp.json';

export default function SettingsTab({ collapsed = false, onDragStart }: { collapsed?: boolean; onDragStart?: (event: React.DragEvent, nodeType: string) => void }) {
  if (collapsed) {
    // 접힘: 로고만 카드 (가운데 정렬, 드래그 지원)
    return (
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 p-2 justify-items-center">
        {tempData.map((item, idx) => (
          <div
            key={idx}
            className="w-15 h-15 sm:w-32 bg-card rounded-xl shadow-md flex items-center justify-center hover:bg-card/80 transition-all duration-200 cursor-grab active:cursor-grabbing"
            title={item.name}
            draggable
            onDragStart={event => {
              if (onDragStart) {
                onDragStart(event, item.name);
              } else {
                event.dataTransfer.setData('text/plain', item.name);
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

  // 펼침: JobCard로 전체 정보
  const jobs = tempData.map((item, idx) => ({
    id: idx + 1,
    company: item.name,
    companyLogoUrl: item.icon,
    companyHq: item.tagline,
    title: item.description,
    postedAt: item.created_at,
    type: item.category_id ? `Category ${item.category_id}` : '기타',
    positionLocation: item.tagline,
    salary: item.url,
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 p-2 overflow-y-auto items-stretch">
      {jobs.map((job) => (
        <div 
          key={job.id} 
          className="cursor-grab active:cursor-grabbing" 
          draggable 
          onDragStart={event => {
            if (onDragStart) {
              // tempData에서 원본 데이터 찾기
              const originalItem = tempData.find(item => item.name === job.company);
              onDragStart(event, originalItem?.name || job.company);
            } else {
              event.dataTransfer.setData('text/plain', job.company);
            }
          }}
        >
          <JobCard {...job} className="h-full" />
        </div>
      ))}
    </div>
  );
} 