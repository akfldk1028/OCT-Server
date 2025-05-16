import { GithubIcon, LockIcon, MessageCircleIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../../common/components/ui/button';
import { Separator } from '../../../common/components/ui/separator';

export default function AuthButtons() {
  return (
    <div className="w-full flex flex-col items-center gap-10">

      <div className="w-full flex flex-col gap-2">
        <Button variant="outline" className="w-full" asChild>
          <Link to="/auth/social/kakao/start">
            <MessageCircleIcon className="w-4 h-4" />
            Kakao Talk
          </Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link to="/auth/social/github/start">
            <GithubIcon className="w-4 h-4" />
            Github
          </Link>
        </Button>

      </div>
    </div>
  );
}
