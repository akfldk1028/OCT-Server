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
  return (
    <Link to={`/products/categories/${id}`} className="w-full h-full">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between h-full p-6">
          <CardTitle className="text-xl font-medium">
            {name}
          </CardTitle>
          <ChevronRightIcon className="size-6" />
          {/*<CardDescription className="text-base mt-2 line-clamp-3">{description}</CardDescription>*/}
        </CardHeader>
      </Card>
    </Link>
  );
}
