import { Link, useFetcher, useNavigate, useOutletContext } from 'react-router';
import {
  ChevronUpIcon,
  EyeIcon,
  MessageCircleIcon,
  StarIcon,
  GitForkIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../common/components/ui/card';
import { Button } from '../../../common/components/ui/button';
import { cn } from '../../../lib/utils';
import { NeonGradientCard } from '../../../common/components/ui/neon-gradient-card';
import { Badge } from '../../../common/components/ui/badge';
import { InitialAvatar } from '../../../common/components/ui/initial-avatar';
import { useState } from 'react';

interface ProductCardProps {
  id: number | string | null;
  uniqueId: string | null;
  name?: string | null;
  description?: string | null;
  reviewsCount?: string | number | null;
  viewsCount?: string | number | null;
  votesCount?: string | number | null;
  isUpvoted?: boolean | null;
  promotedFrom?: string | null;
  stars?: number | null;
  forks?: number | null;
  githubUrl?: string | null;
  owner?: string | null;
  repoName?: string | null;
  localImagePath?: string | null; // 🔥 이미지 경로 추가
}

export function ProductCard({
  id,
  uniqueId,
  name,
  description,
  reviewsCount,
  viewsCount,
  votesCount,
  isUpvoted,
  promotedFrom,
  stars,
  forks,
  githubUrl,
  owner,
  repoName,
  localImagePath,
}: ProductCardProps) {

  const fetcher = useFetcher();
  const { isLoggedIn } = useOutletContext<{
    isLoggedIn: boolean;
  }>();
  const navigate = useNavigate();
  
  // 🔥 이미지 에러 처리
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };

  const optimisitcVotesCount =
    fetcher.state === 'idle'
      ? votesCount
      : isUpvoted
        ? Number(votesCount) - 1
        : Number(votesCount) + 1;
  const optimisitcIsUpvoted = fetcher.state === 'idle' ? isUpvoted : !isUpvoted;
  const absorbClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert('Please log in first!');
      // navigate("/auth/login");
      // return;
    }
    fetcher.submit(null, {
      method: 'POST',
      action: `/products/${uniqueId}/upvote`,
    });
  };
  // 링크 클릭 핸들러 추가

  const content = (
    <Link to={`/products/${id}`} className="block relative z-10 h-full">

      <Card
        className={cn(
          'w-full h-full flex flex-col justify-between',
          promotedFrom
            ? 'bg-transparent hover:bg-card/50'
            : 'bg-transparent hover:bg-card/50',
        )}
      >
        <div className="flex-grow">
          <CardHeader className="w-full pb-2">
            {/* 🔥 제목과 이미지를 함께 표시 */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* 🔥 이미지/아바타 */}
                <div className="flex-shrink-0">
                  {localImagePath && !imageError ? (
                    <img
                      src={localImagePath}
                      alt={name || 'Product'}
                      className="w-10 h-10 rounded-lg object-cover border border-border"
                      onError={handleImageError}
                    />
                  ) : (
                    <InitialAvatar
                      initials={name?.slice(0, 2) || 'P'}
                      size={40}
                      className="rounded-lg"
                    />
                  )}
                </div>
                
                {/* 🔥 제목 */}
                <CardTitle className="text-xl font-semibold leading-snug tracking-tight line-clamp-1 flex-1 min-w-0">
                  {name ?? 'Unnamed Product'}
                </CardTitle>
              </div>
              
              {/* 🔥 프로모션 배지 */}
              {promotedFrom ? (
                <Badge variant="outline" className="flex-shrink-0">
                  Promoted
                </Badge>
              ) : null}
            </div>
            
            <CardDescription className="text-muted-foreground mt-3 line-clamp-2 h-[3em]">
              {description ?? githubUrl ?? 'No description available'}
            </CardDescription>
          </CardHeader>
        </div>
        <CardFooter className="pt-2 pb-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0 overflow-hidden">
            {stars !== null && stars !== undefined && (
              <div className="flex items-center gap-px" title="Stars">
                <StarIcon className="w-3.5 h-3.5" />
                <span>{stars}</span>
              </div>
            )}
            {forks !== null && forks !== undefined && (
              <div className="flex items-center gap-px" title="Forks">
                <GitForkIcon className="w-3.5 h-3.5" />
                <span>{forks}</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            {votesCount !== null && votesCount !== undefined && !stars && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  optimisitcIsUpvoted && 'border-primary text-primary',
                  'flex flex-col h-12 w-12',
                )}
                onClick={absorbClick}
                title="Upvote"
              >
                <ChevronUpIcon className="size-4 shrink-0" />
                <span className="text-xs">{optimisitcVotesCount}</span>
              </Button>
            )}
            {stars !== null && stars !== undefined && githubUrl && (
              <Button
                variant="outline"
                size="icon"
                title="View on GitHub"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(githubUrl, '_blank');
                }}
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
  return promotedFrom ? (
    <NeonGradientCard
      borderRadius={12}
      className="dark"
      borderSize={1}
      neonColors={{
        firstColor: '#fc4a1a',
        secondColor: '#f7b733',
      }}
    >
      {content}
    </NeonGradientCard>
  ) : (
    content
  );
}
