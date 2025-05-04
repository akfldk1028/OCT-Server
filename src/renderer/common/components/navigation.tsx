import { Link, NavLink } from 'react-router';
import {
  BarChart3Icon,
  BellIcon,
  LogOutIcon,
  MenuIcon,
  MessageCircleIcon,
  SettingsIcon,
  UserIcon,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // 경로는 실제로 맞게
import { Separator } from './ui/separator';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from './ui/navigation-menu';
import { cn } from '../../lib/utils';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Sheet,
  SheetFooter,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
} from './ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import useTheme from '../../lib/useTheme';

const menus = [
  {
    name: 'Products',
    to: '/products',
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
    name: 'Jobs',
    to: '/jobs',
    items: [
      {
        name: 'Remote Jobs',
        description: 'Find a remote job in our community',
        to: '/jobs?location=remote',
      },
      {
        name: 'Full-Time Jobs',
        description: 'Find a full-time job in our community',
        to: '/jobs?type=full-time',
      },
      {
        name: 'Freelance Jobs',
        description: 'Find a freelance job in our community',
        to: '/jobs?type=freelance',
      },
      {
        name: 'Internships',
        description: 'Find an internship in our community',
        to: '/jobs?type=internship',
      },
      {
        name: 'Post a Job',
        description: 'Post a job to our community',
        to: '/jobs/submit',
      },
    ],
  },
  {
    name: 'Community',
    to: '/community',
    items: [
      {
        name: 'All Posts',
        description: 'See all posts in our community',
        to: '/community',
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
    name: 'IdeasGPT',
    to: '/ideas',
  },
  {
    name: 'Teams',
    to: '/teams',
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

export default function Navigation({
  isLoggedIn,
  hasNotifications,
  hasMessages,
  username,
  avatar,
  name,
}: {
  isLoggedIn: boolean;
  hasNotifications: boolean;
  hasMessages: boolean;
  username?: string;
  avatar?: string | null;
  name?: string;
}) {
  const [theme, setTheme] = useTheme();
  return (
    <Sheet>
      <nav className="flex flex-col fixed top-0 left-0 right-0 z-50">
        <div className="flex md:px-20 px-5 h-16 items-center justify-between backdrop-blur bg-background/50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <Link to="/" className="font-bold tracking-tighter text-lg">
                MCP
              </Link>
              <Separator
                orientation="vertical"
                className="h-6 hidden md:block mx-4"
              />
              <NavigationMenu className="hidden md:block">
                <NavigationMenuList>
                  {menus.map((menu) => (
                    <NavigationMenuItem key={menu.name}>
                      {menu.items ? (
                        <>
                          <NavigationMenuTrigger>
                            <NavLink
                              className={({ isActive }) =>
                                cn(
                                  isActive
                                    ? 'opacity-100'
                                    : 'opacity-85 hover:text-opacity-100',
                                )
                              }
                              to={menu.to}
                            >
                              {menu.name}
                            </NavLink>
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <ul className="grid w-[600px] font-light gap-3 p-4 grid-cols-2">
                              {menu.items?.map((item) => (
                                <NavigationMenuItem
                                  key={item.name}
                                  className={cn([
                                    'select-none rounded-md transition-colors focus:bg-accent  hover:bg-accent',
                                    (item.to === '/products/promote' ||
                                      item.to === '/jobs/submit') &&
                                      'col-span-2 bg-primary/10 hover:bg-primary/20 focus:bg-primary/20',
                                  ])}
                                >
                                  <NavigationMenuLink asChild>
                                    <Link
                                      className="p-3 space-y-1 block leading-none no-underline outline-none"
                                      to={item.to}
                                    >
                                      <span className="text-sm font-medium leading-none">
                                        {item.name}
                                      </span>
                                      <p className="text-sm leading-snug text-muted-foreground">
                                        {item.description}
                                      </p>
                                    </Link>
                                  </NavigationMenuLink>
                                </NavigationMenuItem>
                              ))}
                            </ul>
                          </NavigationMenuContent>
                        </>
                      ) : (
                        <NavLink
                          className={({ isActive }) =>
                            cn(
                              isActive
                                ? 'opacity-100'
                                : 'opacity-85 hover:text-opacity-100',
                              navigationMenuTriggerStyle(),
                            )
                          }
                          to={menu.to}
                        >
                          {menu.name}
                        </NavLink>
                      )}
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
            {isLoggedIn ? (
              <div className="md:flex hidden items-center gap-4">
                <Button
                  size="icon"
                  variant="ghost"
                  asChild
                  className="relative"
                >
                  <Link to="/my/notifications">
                    <BellIcon className="size-4" />
                    {hasNotifications && (
                      <div className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  asChild
                  className="relative"
                >
                  <Link to="/my/messages">
                    <MessageCircleIcon className="size-4" />
                    {hasMessages && (
                      <div className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                </Button>
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
                      <Select
                        value={theme}
                        onValueChange={(value: string) =>
                          setTheme(value as 'system' | 'light' | 'dark')
                        }
                      >
                        <SelectTrigger className="w-[100px]" id="theme-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
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
            ) : (
              <div className="md:flex hidden items-center gap-4">
                <Button asChild variant="secondary">
                  <Link to="/auth/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth/join">Join</Link>
                </Button>
              </div>
            )}
          </div>
          <SheetTrigger className="md:hidden size-6">
            <MenuIcon />
          </SheetTrigger>
          <SheetContent className="flex flex-col justify-between">
            <SheetHeader>
              {' '}
              <Accordion type="single" collapsible>
                {menus.map((menu) => (
                  <AccordionItem key={menu.name} value={menu.name}>
                    <AccordionTrigger>{menu.name}</AccordionTrigger>
                    <AccordionContent>
                      <ul>
                        {menu.items ? (
                          menu.items.map((item) => (
                            <li key={item.name}>
                              <SheetClose asChild>
                                <Button variant="link" asChild>
                                  <Link to={item.to}>{item.name} &rarr;</Link>
                                </Button>
                              </SheetClose>
                            </li>
                          ))
                        ) : (
                          <li key={menu.name}>
                            <SheetClose asChild>
                              <Button variant="link" asChild>
                                <Link to={menu.to}>{menu.name} &rarr;</Link>
                              </Button>
                            </SheetClose>
                          </li>
                        )}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </SheetHeader>
            <SheetFooter className="mt-10">
              {isLoggedIn ? (
                <div className="flex justify-between items-center gap-4">
                  <SheetClose asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                      className="relative"
                    >
                      <Link to="/my/notifications">
                        <BellIcon className="size-4" />
                        {hasNotifications && (
                          <div className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
                        )}
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                      className="relative"
                    >
                      <Link to="/my/messages">
                        <MessageCircleIcon className="size-4" />
                        {hasMessages && (
                          <div className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
                        )}
                      </Link>
                    </Button>
                  </SheetClose>
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
                        <SheetClose asChild>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to="/my/dashboard">
                              <BarChart3Icon className="size-4 mr-2" />
                              Dashboard
                            </Link>
                          </DropdownMenuItem>
                        </SheetClose>
                        <SheetClose asChild>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to="/my/profile">
                              <UserIcon className="size-4 mr-2" />
                              Profile
                            </Link>
                          </DropdownMenuItem>
                        </SheetClose>
                        <SheetClose asChild>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to="/my/settings">
                              <SettingsIcon className="size-4 mr-2" />
                              Settings
                            </Link>
                          </DropdownMenuItem>
                        </SheetClose>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <SheetClose asChild>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to="/auth/logout">
                            <LogOutIcon className="size-4 mr-2" />
                            Logout
                          </Link>
                        </DropdownMenuItem>
                      </SheetClose>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <SheetClose asChild>
                    <Button asChild variant="secondary" className="w-full">
                      <Link to="/auth/login">Login</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link to="/auth/join">Join</Link>
                    </Button>
                  </SheetClose>
                </div>
              )}
            </SheetFooter>
          </SheetContent>
        </div>
      </nav>
    </Sheet>
  );
}
