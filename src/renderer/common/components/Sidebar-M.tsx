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
  LogIn as LogInIcon,
  UserPlus as UserPlusIcon,
  Plus,
  Settings,
  Package,
  Server,
  Users,
  Wrench,
  Network,
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

interface SidebarProps {
  isLoggedIn: boolean;
  hasNotifications: boolean;
  hasMessages: boolean;
  username?: string;
  avatar?: string | null;
  name?: string;
  collapsed?: boolean;
  onMenuSelect?: (menuName: string) => void; // 🔥 메뉴 선택 핸들러
}

export default function Sidebar({
  isLoggedIn,
  hasNotifications,
  hasMessages,
  username,
  avatar,
  name,
  collapsed: collapsedProp,
  onMenuSelect,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true); // 🔥 항상 true로 고정 (Slack 스타일 - 아이콘만)
  const [theme, setTheme] = useTheme();
  const navigate = useNavigate();
  const store = useStore();
  const { createNewChat } = useChatCreation();

  // 메뉴 배열
  const menus = [

    {
      name: 'Products',
      to: '/products',
      icon: <Package className="w-4 h-4" />,
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
      icon: <Network className="w-4 h-4" />,
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
    // {
    //   name: 'Chat',
    //   to: '/chat',
    //   icon: <MessageSquare className="w-4 h-4" />,
    //   items: [
    //     {
    //       name: 'New Chat',
    //       description: 'Start a new conversation',
    //       action: () => createNewChat(),
    //     },
    //     {
    //       name: 'Chat History',
    //       description: 'View previous conversations',
    //       to: '/chat/history',
    //     },
    //     {
    //       name: 'AI Models',
    //       description: 'Configure AI models',
    //       to: '/chat/models',
    //     },
    //     {
    //       name: 'Settings',
    //       description: 'Chat settings and preferences',
    //       to: '/chat/settings',
    //     },
    //   ],
    // },
    {
      name: 'Community',
      to: '/overlay',
      icon: <Users className="w-4 h-4" />,
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
      icon: <Wrench className="w-4 h-4" />,
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

  // 기존 일반 사이드바 뷰
  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar-background border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* 헤더 */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          {collapsed ? (
            /* 🔥 접힌 상태: 로고 아이콘만 표시 */
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
          ) : (
            /* 🔥 펼친 상태: 전체 로고 텍스트 */
            <span className="font-bold text-lg truncate text-sidebar-foreground">
              Contextor v0.0.1
            </span>
          )}
        </Link>
        {/* Slack 스타일: 토글 버튼 비활성화 (항상 아이콘만) */}
        {/* <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="w-4 h-4" />
        </Button> */}
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
              <button
                key={menu.name}
                onClick={() => onMenuSelect?.(menu.name)} // 🔥 메뉴 선택 시 ChannelSidebar 업데이트
                className="p-2 rounded-md hover:bg-sidebar-accent transition-colors focus:outline-none focus:bg-sidebar-accent text-sidebar-foreground"
                title={menu.name}
              >
                {menu.icon || <Folder className="w-4 h-4" />}
              </button>
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
      {!isLoggedIn && (
        <div className="p-4 border-t space-y-2">
          {!collapsed ? (
            // 펼쳐진 상태: 전체 버튼
            <>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/auth/login">로그인</Link>
              </Button>
              <Button asChild className="w-full">
                <Link to="/auth/join">회원가입</Link>
              </Button>
            </>
          ) : (
            // 접힌 상태: 아이콘 버튼
            <div className="flex flex-col items-center space-y-2">
              <Button asChild variant="secondary" size="sm" className="w-8 h-8 p-0">
                <Link to="/auth/login" title="로그인">
                  <LogInIcon className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="sm" className="w-8 h-8 p-0">
                <Link to="/auth/join" title="회원가입">
                  <UserPlusIcon className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 푸터 */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
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
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <div className="px-2 py-1">
                      <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                        <SelectTrigger className="w-full h-8">
                          <SelectValue placeholder="테마 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">SYSTEM</SelectItem>
                          <SelectItem value="light">LIGHT</SelectItem>
                          <SelectItem value="dark">DARK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
