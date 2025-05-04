import { Outlet } from 'react-router';
import FlickeringGrid from '../../../common/components/ui/flickering-grid';

export default function AuthLayout() {
  return (
  <div className="grid grid-cols-1 md:grid-cols-2 h-screen">
      <div className="hidden md:block">
        <FlickeringGrid
          squareSize={4}
          gridGap={5}
          maxOpacity={0.5}
          flickerChance={0.2}
          color="#E11D49"
        />
      </div>
      <div className="px-5 py-10 md:p-0">
        <Outlet />
      </div>
    </div>
  );
}
