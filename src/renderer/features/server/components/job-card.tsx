import { Link } from 'react-router';
import { Card } from '../../../common/components/ui/card';
import { Button } from '../../../common/components/ui/button';
import { Badge } from '../../../common/components/ui/badge';

interface JobCardProps {
  id: number;
  company: string;
  companyLogoUrl: string;
  companyHq: string;
  title: string;
  postedAt: string;
  type: string;
  positionLocation: string;
  salary: string;
  className?: string;
}

export function JobCard({
  id,
  company,
  companyLogoUrl,
  companyHq,
  title,
  postedAt,
  type,
  positionLocation,
  salary,
  className,
}: JobCardProps) {
  return (
    <Card
      className={`flex flex-col items-center justify-center bg-transparent rounded-2xl shadow-lg w-full h-44 min-h-44 max-h-44 p-4 transition-colors hover:bg-card/90 ${className ?? ''}`}
    >
      <div className="flex flex-col items-center w-full">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-transparent shadow mb-2">
          <img
            src={companyLogoUrl}
            alt={`${company} Logo`}
            className="w-10 h-10 object-contain rounded-full"
          />
        </div>
        <span className="text-base font-semibold text-gray-900 dark:text-accent-foreground text-center truncate w-full">
          {company}
        </span>
    
      </div>
    </Card>
  );
}
