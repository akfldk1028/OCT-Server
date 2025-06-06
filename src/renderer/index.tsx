import React, {
  createContext,
  useContext,
  useCallback,
  useReducer,
} from 'react';

import { createRoot } from 'react-dom/client';
import { createHashRouter, createBrowserRouter, Outlet, redirect, RouterProvider } from 'react-router';
import './tailwind.css';
import { TooltipProvider } from './common/components/ui/tooltip';
import { Toaster } from './common/components/ui/toaster';
import { Root, ErrorBoundary, loader as rootLoader } from './root';
import HomePage, { loader as homePageLoader } from './common/pages/home-page';
import AuthLayout from "@/renderer/features/auth/layouts/auth-layout";
import JoinPage, { joinLoader, joinAction } from "./features/auth/pages/join-page";
import LoginPage, { loginAction } from "./features/auth/pages/login-page";
import { loader as LogoutLoader } from "./features/auth/pages/logout-page";

import { loader as productsloader } from './features/products/pages/products-page';
import LeaderboardLayout, { loader as leaderboardLoader } from './features/products/layouts/leaderboard-layout';
import LeaderboardPage, { loader as LeaderboardPageLoader } from './features/products/pages/leaderboard-page';
import { loader as productRedirectPageLoader } from './features/products/pages/product-redirect-page';
import ProductOverviewLayout from './features/products/layouts/product-overview-layout';
import ProductOverviewPage from './features/products/pages/product-overview-page';
import DailyLeaderboardPage from "@/renderer/features/products/pages/daily-leaderboard-page";
import CategoriesPage, { loader as CategoriesPageLoader } from "@/renderer/features/products/pages/categories-page";

import { loader as socialStartPageLoader } from "./features/auth/pages/social-start-page";
import SocialCompletePage, { loader as socialCompletePageLoader } from "./features/auth/pages/social-complete-page";

import PricingLayout, { loader as  pricingLoader} from "./features/price/layouts/pricing-layout";

import JobPage from "./features/server/pages/job-page";
import NodePage from "./features/server/pages/node-page";
import {
  ReactFlowProvider,
} from '@xyflow/react'

import { DnDProvider } from './features/server/components/DnDContext';
import { FlowProvider, useFlow } from './features/server/components/useFlowEvents';
import ServerLayout, { loader as serverLayoutLoader } from './features/server/layout/server-layout';
import { isElectron } from './utils/environment';
import PricePage, { loader as priceLoader } from './features/price/pages/price-page';
import OverlayHome from './features/guide/pages/overlayHome-page';

import AntropicComputer from './features/guide/pages/AntropicComputer';
import ChatWrapper from './features/server/pages/ChatWrapper';
import ProductDetailLayout ,{ loader as ProductDetailLayoutLoader } from './features/products/layouts/product-detail-layout';
import ProductDetailsPage from './features/products/pages/ProductDetailsPage';
import ProductToolsPage from './features/products/pages/ProductToolsPage';

console.log('📍 Loaded renderer entry index.tsx');

// 일렉트론용 라우터 (HashRouter)
const electronRouter = createHashRouter(
  [
    {
      path: '/',
      element: <Root />,
      loader: rootLoader,
      errorElement: <ErrorBoundary error={undefined} />,
      children: [
        {
          index: true,
          element: <HomePage />,
          loader: homePageLoader,
        },
        {
          path: 'overlay',
          // element: <OverlayHome />,
        },
        {
          path: 'auth',
          children: [
            {
              element: <AuthLayout />,
              children: [
                {
                  path: 'login',
                  element: <LoginPage />,
                  action: loginAction,
                },
                {
                  path: 'join',
                  element: <JoinPage />,
                  loader: joinLoader,
                  action: joinAction
                },

                {
                  path: 'social/:provider',
                  children: [
                    {
                      path: 'start',
                      loader: socialStartPageLoader,
                    },
                    {
                      path: 'complete',
                      element: <SocialCompletePage />, // 추가!
                      loader: socialCompletePageLoader,
                    }
                  ]
                },

              ]
            },
            {
              path: 'logout',
              loader: LogoutLoader,
            }
          ],
        },
        {
          path: 'products',
          children: [
            { index: true, loader: () => redirect('/products/leaderboards') },
            {
              path: ':id',
              element: <ProductDetailLayout />,
              loader: ProductDetailLayoutLoader,
              children: [
                {
                  index: true,
                  loader: () => redirect('overview')
                },
                {
                  path: 'overview',
                  element: <ProductOverviewLayout />,
                  children: [
                    {
                      index: true,
                      element: <ProductOverviewPage />
                    },
                    {
                      path: 'details',
                      element: <ProductDetailsPage />,
                    },
                    {
                      path: 'tools',
                      element: <ProductToolsPage />,
                    },
                  ]
                },
          
              ]
            },
            {
              path: 'leaderboards',
              element: <LeaderboardLayout />,
              loader: leaderboardLoader,
              children: [
                {
                  index: true,
                  element: <LeaderboardPage />,
                  loader: LeaderboardPageLoader,
                },
                {
                  path: 'daily/:year/:month/:day',
                  element: <DailyLeaderboardPage />,
                },
              ],
            },
            {
              path: 'categories',
              children: [
                {
                  index: true,
                  element: <CategoriesPage />,
                  loader: CategoriesPageLoader,
                }
              ]
            }
          ],
        },
        {
          path: 'jobs',
          element: <ServerLayout />,
          loader: serverLayoutLoader,
          children: [
            {
              index: true,
              path: 'inspector',
              element: <JobPage />,
            },
            {
              path: 'node',
              element: <NodePage />,
            },
            {
              path: 'chat',
              children: [
                {
                  path: ':sessionId',
                  element: <ChatWrapper />, // RealtimeChat 대신 ChatWrapper 사용
                }
              ]
            }
          ]
        }
      ],
    },
  ],
  { basename: '/' },
);

// 웹용 라우터 (BrowserRouter)
const webRouter = createBrowserRouter(
  [
    {
      path: '/',
      element: <Root />,
      loader: rootLoader,
      errorElement: <ErrorBoundary error={undefined} />,
      children: [
        {
          index: true,
          element: <HomePage />,
          loader: homePageLoader,
        },

        {
          path: 'auth',
          children: [
            {
              element: <AuthLayout />,
              children: [
                {
                  path: 'login',
                  element: <LoginPage />,
                  action: loginAction,
                },
                {
                  path: 'join',
                  element: <JoinPage />,
                  loader: joinLoader,
                  action: joinAction
                },

                {
                  path: 'social/:provider',
                  children: [
                    {
                      path: 'start',
                      loader: socialStartPageLoader,
                    },
                    {
                      path: 'complete',
                      element: <SocialCompletePage />, // 추가!
                      loader: socialCompletePageLoader,
                    }
                  ]
                },

              ]
            },
            {
              path: 'logout',
              loader: LogoutLoader,
            }
          ],
        },
        {
          path: 'products',
          children: [
            { index: true, loader: () => redirect('/products/leaderboards') },
            {
              path: ':id',
              element: <ProductDetailLayout />,
              loader: ProductDetailLayoutLoader,
              children: [
                {
                  index: true,
                  loader: () => redirect('overview')
                },
                {
                  path: 'overview',
                  element: <ProductOverviewLayout />,
                  children: [
                    {
                      index: true,
                      element: <ProductOverviewPage />
                    }
                  ]
                },
                {
                  path: 'details',
                  element: <ProductDetailsPage />,
                },
                {
                  path: 'tools',
                  element: <ProductToolsPage />,
                },
              ]
            },
            {
              path: 'leaderboards',
              element: <LeaderboardLayout />,
              loader: leaderboardLoader,
              children: [
                {
                  index: true,
                  element: <LeaderboardPage />,
                  loader: LeaderboardPageLoader,
                },
                {
                  path: 'daily/:year/:month/:day',
                  element: <DailyLeaderboardPage />,
                },
              ],
            },
            {
              path: 'categories',
              children: [
                {
                  index: true,
                  element: <CategoriesPage />,
                  loader: CategoriesPageLoader,
                }
              ]
            }
          ],
        },
        {
          path: 'jobs',
          element: <ServerLayout />,
          // loader: serverLayoutLoader,
          children: [
            {
              index: true,
              path: 'inspector',
              element: <JobPage />,
            },
            {
              path: 'node',
              element: <NodePage />,
            }
          ]
        },
        {
          path: 'pricing',
          element: <PricingLayout/>,
          loader: pricingLoader,
          children: [
            {
              index: true,
              element: <PricePage />,
              loader: priceLoader,
            }
          ]
        }
      ],
    },
  ],
  { basename: '/' },
);
import { ToastProvider } from "./hooks/toast-context"; // 경로 맞게 조정

// 환경에 따라 적절한 라우터 선택
const router = isElectron() ? electronRouter : webRouter;

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ToastProvider>
      <ReactFlowProvider>
        <FlowProvider>
          <DnDProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
              <Toaster />
            </TooltipProvider>
          </DnDProvider>
        </FlowProvider>
      </ReactFlowProvider>
    </ToastProvider>
  </React.StrictMode>,
);

// 일렉트론 환경에서만 IPC 관련 코드 실행
if (isElectron() && window.electron) {
  window.electron.ipcRenderer.once('ipc-example', (arg: any) => {
    console.log(arg);
  });
  window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
}
