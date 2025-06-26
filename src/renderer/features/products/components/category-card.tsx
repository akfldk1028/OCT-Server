import { ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../common/components/ui/card';

interface CategoryCardProps {
  id: number | null;
  name: string | null;
  description: string | null;
}

// eslint-disable-next-line import/prefer-default-export
export function CategoryCard({ id, name, description }: CategoryCardProps) {
  // 🔥 카테고리 이름으로 MCP 서버 목록 페이지로 링크
  const categoryPath = `/products/category/${encodeURIComponent(name || '')}`;
  
  return (
    <Link to={categoryPath} className="w-full h-full">
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between h-full p-6">
          <div className="flex-1">
            <CardTitle className="text-xl font-medium mb-2">
              {name}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </CardDescription>
          </div>
          <ChevronRightIcon className="size-6 text-muted-foreground" />
        </CardHeader>
      </Card>
    </Link>
  );
}
