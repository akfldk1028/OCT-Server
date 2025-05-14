// src/components/TabsContainer.tsx
import React from 'react';
import {
  Bell,
  Files,
  FolderTree,
  Hammer,
  Hash,
  MessageSquare,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

type TabsContainerProps = {
  serverCapabilities: any;
  pendingRequestsCount: number;
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
};

function TabsContainer({
  serverCapabilities,
  pendingRequestsCount,
  children,
  value,
  onValueChange,
}: TabsContainerProps) {
  // 탭 값 상태를 해시와 동기화
  const validTabs = [
    'resources',
    'prompts',
    'tools',
    'ping',
    'sampling',
    'roots',
  ];
  const getInitialTab = () => {
    const hash = window.location.hash.slice(1);
    return validTabs.includes(hash)
      ? hash
      : serverCapabilities?.resources
        ? 'resources'
        : serverCapabilities?.prompts
          ? 'prompts'
          : serverCapabilities?.tools
            ? 'tools'
            : 'ping';
  };
  const [tabValue, setTabValue] = React.useState(getInitialTab);

  React.useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      setTabValue(validTabs.includes(hash) ? hash : getInitialTab());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverCapabilities]);

  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      className="w-full p-4"
    >
      <TabsList className="mb-4 p-0">
        <TabsTrigger
          value="resources"
        >
          <Files className="w-4 h-4 mr-2" />
          Resources
        </TabsTrigger>
        <TabsTrigger value="prompts">
          <MessageSquare className="w-4 h-4 mr-2" />
          Prompts
        </TabsTrigger>
        <TabsTrigger value="tools">
          <Hammer className="w-4 h-4 mr-2" />
          Tools
        </TabsTrigger>
        <TabsTrigger value="ping">
          <Bell className="w-4 h-4 mr-2" />
          Ping
        </TabsTrigger>
        <TabsTrigger value="sampling" className="relative">
          <Hash className="w-4 h-4 mr-2" />
          Sampling
          {pendingRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {pendingRequestsCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="roots">
          <FolderTree className="w-4 h-4 mr-2" />
          Roots
        </TabsTrigger>
      </TabsList>

      <div className="w-full">
        {!serverCapabilities?.resources &&
        !serverCapabilities?.prompts &&
        !serverCapabilities?.tools ? (
          <div className="flex items-center justify-center p-4">
            <p className="text-lg text-gray-500">
              The connected server does not support any MCP capabilities
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </Tabs>
  );
}

export default TabsContainer;
