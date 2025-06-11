import { JSX, useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import {
  Home,
  Folder,
  MessageSquare,
  CircleHelp,
  Github,
  Menu,
  BellIcon,
  BarChart3Icon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  Plus,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useTheme from '@/lib/useTheme';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/hooks/useStore';
import { ChatList } from '@/components/chat/index';
import { useChatCreation } from '@/components/chat/useChatCreation';
import { T } from 'python/libs/playwright/driver/package/lib/vite/traceViewer/assets/defaultSettingsView-5nVJRt0A';

interface SidebarProps {
  isLoggedIn: boolean;
  hasNotifications: boolean;
  hasMessages: boolean;
  username?: string;
  avatar?: string | null;
  name?: string;
  collapsed?: boolean;
  isChatView?: boolean; // ChatGPT 스타일로 표시할지 여부
}

export default function Sidebar({
  isLoggedIn,
  hasNotifications,
  hasMessages,
  username,
  avatar,
  name,
  collapsed: collapsedProp,
  isChatView = false,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(collapsedProp ?? true); // 🔥 기본값을 true로 변경 (ChatGPT/Claude 스타일)
  const [theme, setTheme] = useTheme();
  const navigate = useNavigate();
  const store = useStore();
  const { createNewChat } = useChatCreation();

  // 메뉴 배열
  const menus = [
    {
      name: 'Products',
      to: '/products',
      icon: <Folder className="w-4 h-4" />,
      items: [
        {
          name: 'Leaderboards',
          description: 'See the top performers in your community',
          to: '/products/leaderboards',
        },
        {
          name: 'Categories',
          description: 'See the top categories in your community',
          to: '/products/categories',
        },
        {
          name: 'Search',
          description: 'Search for a product',
          to: '/products/search',
        },
        {
          name: 'Submit a Product',
          description: 'Submit a product to our community',
          to: '/products/submit',
        },
        {
          name: 'Promote',
          description: 'Promote a product to our community',
          to: '/products/promote',
        },
      ],
    },
    {
      name: 'Server',
      to: '/jobs',
      icon: <Folder className="w-4 h-4" />,
      items: [
        {
          name: 'Inspector',
          description: 'Find a remote job in our community',
          to: '/jobs/inspector',
        },
        {
          name: 'Node',
          description: 'Find a full-time job in our community',
          to: '/jobs/node',
        },
        {
          name: 'New Chat',
          description: 'Start a new AI chat',
          action: () => createNewChat('test'),
        },
      ],
    },
    {
      name: 'Community',
      to: '/overlay',
      icon: <MessageSquare className="w-4 h-4" />,
      items: [
        {
          name: 'All Posts',
          description: 'See all posts in our community',
          to: '/overlay',
        },
        {
          name: 'Top Posts',
          description: 'See the top posts in our community',
          to: '/community?sorting=popular',
        },
        {
          name: 'New Posts',
          description: 'See the new posts in our community',
          to: '/community?sorting=newest',
        },
        {
          name: 'Create a Post',
          description: 'Create a post in our community',
          to: '/community/submit',
        },
      ],
    },
    {
      name: 'Tools',
      to: '/teams',
      icon: <Home className="w-4 h-4" />,
      items: [
        {
          name: 'All Teams',
          description: 'See all teams in our community',
          to: '/teams',
        },
        {
          name: 'Create a Team',
          description: 'Create a team in our community',
          to: '/teams/create',
        },
      ],
    },
  ];

  useEffect(() => {
    if (collapsedProp !== undefined) setCollapsed(collapsedProp);
  }, [collapsedProp]);

  // 🔥 창 크기 변화 감지해서 사이드바 자동 제어
  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      
      // 창이 작아지면 (600px 이하) 사이드바 자동 닫기
      if (windowWidth <= 600) {
        console.log('📥 [Sidebar] 창이 작아짐 - 사이드바 닫기 (width:', windowWidth, ')');
        setCollapsed(true);
      }
      // 창이 커지면 (800px 이상) 사이드바 자동 열기
      else if (windowWidth >= 800) {
        console.log('📥 [Sidebar] 창이 커짐 - 사이드바 열기 (width:', windowWidth, ')');
        setCollapsed(false);
      }
    };

    // 초기 크기 체크
    handleResize();
    
    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ChatGPT 스타일 뷰
  if (isChatView) {
    return (
      <aside
        className={cn(
          'flex flex-col h-full bg-background border-r transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <Button
              onClick={() => createNewChat()}
              className={cn("flex-1 justify-start gap-2", collapsed && "px-2")}
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              {!collapsed && "New Chat"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat List */}
        {!collapsed && <ChatList />}

        {/* Footer */}
        <div className="p-4 border-t">
          {/* 사용자 프로필 */}
          {isLoggedIn && !collapsed && (
            <div className="flex items-center mb-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="cursor-pointer">
                  <div className="flex items-center gap-2 w-full">
                    <Avatar>
                      {avatar ? (
                        <AvatarImage className="object-cover" src={avatar} />
                      ) : (
                        <AvatarFallback>{name?.[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col text-sm flex-1">
                      <span className="font-medium truncate">{name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        @{username}
                      </span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      @{username}
                    </span>
                  </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/dashboard">
                      <BarChart3Icon className="size-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/profile">
                      <UserIcon className="size-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/settings">
                      <SettingsIcon className="size-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/auth/logout">
                    <LogOutIcon className="size-4 mr-2" />
                    Logout
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* 테마 선택기 */}
        {!collapsed && (
          <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* 프로필 아이콘 (접힌 상태) */}
        {isLoggedIn && collapsed && (
          <div className="flex justify-center my-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="cursor-pointer">
                <Avatar>
                  {avatar ? (
                    <AvatarImage className="object-cover" src={avatar} />
                  ) : (
                    <AvatarFallback>{name?.[0]}</AvatarFallback>
                  )}
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    @{username}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/dashboard">
                      <BarChart3Icon className="size-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/profile">
                      <UserIcon className="size-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/settings">
                      <SettingsIcon className="size-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/auth/logout">
                    <LogOutIcon className="size-4 mr-2" />
                    Logout
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </aside>
  );
}

  // 기존 일반 사이드바 뷰
  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* 헤더 */}
      <div className="h-16 px-4 flex items-center justify-between border-b">
        <Link to="/">
          <span
            className={cn('font-bold text-lg truncate', collapsed && 'hidden')}
          >
            Contextor v0.0.1
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* 알림 영역 */}
      {isLoggedIn && !collapsed && (
        <div className="px-4 py-2 flex items-center gap-4">
          <Button size="icon" variant="ghost" asChild className="relative">
            <Link to="/my/notifications">
              <BellIcon className="size-4" />
              {hasNotifications && (
                <div className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
              )}
            </Link>
          </Button>
          <Button size="icon" variant="ghost" asChild className="relative">
            <Link to="/my/messages">
              <MessageSquare className="size-4" />
              {hasMessages && (
                <div className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
              )}
            </Link>
          </Button>
        </div>
      )}

      {isLoggedIn && !collapsed && <Separator className="my-2" />}

      {/* 메뉴 영역 */}
      <ScrollArea
        className="flex-1 px-2 space-y-1 overflow-y-auto"
        style={{
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-4 py-4">
            {menus.map((menu) => (
              <NavLink
                key={menu.name}
                to={menu.to}
                className={({ isActive }) =>
                  cn('p-2 rounded-md hover:bg-accent transition-colors', {
                    'bg-accent': isActive,
                  })
                }
                title={menu.name}
              >
                {menu.icon || <Folder className="w-4 h-4" />}
              </NavLink>
            ))}
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {menus.map((menu) => (
              <AccordionItem key={menu.name} value={menu.name}>
                {menu.items ? (
                  <>
                    <AccordionTrigger className="py-2 px-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        {menu.icon || <Folder className="w-4 h-4" />}
                        <span>{menu.name}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-8 flex flex-col gap-1">
                        {menu.items.map((item) =>
                          item.action ? (
                            <button
                              key={item.name}
                              onClick={item.action}
                              className="text-sm py-1 hover:text-primary text-left text-muted-foreground cursor-pointer transition-colors"
                            >
                              {item.name}
                            </button>
                          ) : (
                            <NavLink
                              key={item.name}
                              to={item.to}
                              className={({ isActive }) =>
                                cn('text-sm py-1 hover:text-primary', {
                                  'text-primary font-medium': isActive,
                                  'text-muted-foreground': !isActive,
                                })
                              }
                            >
                              {item.name}
                            </NavLink>
                          ),
                        )}
                      </div>
                    </AccordionContent>
                  </>
                ) : (
                  <NavLink
                    to={menu.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 py-2 px-2 rounded-md hover:bg-accent transition-colors',
                        {
                          'bg-accent': isActive,
                        },
                      )
                    }
                  >
                    {menu.icon || <Folder className="w-4 h-4" />}
                    <span>{menu.name}</span>
                  </NavLink>
                )}
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>

      {/* 로그인 하지 않은 경우 로그인/가입 버튼 */}
      {!isLoggedIn && !collapsed && (
        <div className="p-4 border-t space-y-2">
          <Button asChild variant="secondary" className="w-full">
            <Link to="/auth/login">로그인</Link>
          </Button>
          <Button asChild className="w-full">
            <Link to="/auth/join">회원가입</Link>
          </Button>
        </div>
      )}

      {/* 푸터 */}
      <div className="p-4 border-t space-y-3">
        {/* 사용자 프로필 영역 (푸터로 이동) */}
        {isLoggedIn && !collapsed && (
          <div className="flex items-center mb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="cursor-pointer">
                <div className="flex items-center gap-2 w-full">
                  <Avatar>
                    {avatar ? (
                      <AvatarImage className="object-cover" src={avatar} />
                    ) : (
                      <AvatarFallback>{name?.[0]}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col text-sm flex-1">
                    <span className="font-medium truncate">{name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      @{username}
                    </span>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    @{username}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/dashboard">
                      <BarChart3Icon className="size-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/profile">
                      <UserIcon className="size-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/settings">
                      <SettingsIcon className="size-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/auth/logout">
                    <LogOutIcon className="size-4 mr-2" />
                    Logout
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* 테마 선택기 */}
        {!collapsed && (
          <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* 프로필 아이콘 (접힌 상태) */}
        {isLoggedIn && collapsed && (
          <div className="flex justify-center my-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="cursor-pointer">
                <Avatar>
                  {avatar ? (
                    <AvatarImage className="object-cover" src={avatar} />
                  ) : (
                    <AvatarFallback>{name?.[0]}</AvatarFallback>
                  )}
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    @{username}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/dashboard">
                      <BarChart3Icon className="size-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/profile">
                      <UserIcon className="size-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/my/settings">
                      <SettingsIcon className="size-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/auth/logout">
                    <LogOutIcon className="size-4 mr-2" />
                    Logout
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </aside>
  );
}
