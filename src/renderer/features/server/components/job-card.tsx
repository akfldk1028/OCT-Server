import { Link } from 'react-router';
import { DateTime } from 'luxon';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../common/components/ui/card';
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
    <Link to={`/jobs/${id}`} className="block w-full h-full">
      <Card
        className={`flex flex-col items-center justify-between bg-transparent w-full h-full transition-colors hover:bg-card/50 ${className ?? ''}`}
      >
        <CardHeader className="flex flex-col items-center pb-0">
          <img
            src={companyLogoUrl}
            alt={`${company} Logo`}
            className="size-14 rounded-full mb-2 object-contain"
          />
          <span className="text-accent-foreground font-bold text-center text-base break-words w-full">
            {company}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 w-full px-2 py-0">
          <Badge variant="outline" className="capitalize mb-2">
            {type}
          </Badge>
          {/* <span className="text-sm text-muted-foreground text-center line-clamp-3 break-words w-full" style={{display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden'}}>{title}</span> */}
        </CardContent>
        <CardFooter className="flex justify-center w-full mt-auto pt-0 pb-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-full max-w-[120px]"
          >
            Apply now
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
