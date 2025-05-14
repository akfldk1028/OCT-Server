import React, {
  createContext,
  useContext,
  useCallback,
  useReducer,
} from 'react';

import { createRoot } from 'react-dom/client';
import {createHashRouter, Outlet, redirect, RouterProvider} from 'react-router';
import './tailwind.css';
import { TooltipProvider } from './common/components/ui/tooltip';
import { Toaster } from './common/components/ui/toaster';
import { Root, ErrorBoundary } from './root';
import HomePage, {  loader as homePageLoader } from './common/pages/home-page';
import AuthLayout from "@/renderer/features/auth/layouts/auth-layout";
import JoinPage, { joinLoader, joinAction } from "./features/auth/pages/join-page";
import LoginPage, { loginAction } from "./features/auth/pages/login-page";
import { loader as productsloader } from './features/products/pages/products-page';
import LeaderboardLayout, { loader as leaderboardLoader } from './features/products/layouts/leaderboard-layout';
import LeaderboardPage, {loader as LeaderboardPageLoader} from './features/products/pages/leaderboard-page';
import { loader as productRedirectPageLoader } from './features/products/pages/product-redirect-page';
import ProductOverviewLayout, {loader as ProductOverviewLayoutLoader} from './features/products/layouts/product-overview-layout';
import ProductOverviewPage from './features/products/pages/product-overview-page';
import DailyLeaderboardPage from "@/renderer/features/products/pages/daily-leaderboard-page";
import CategoriesPage, {loader as CategoriesPageLoader} from "@/renderer/features/products/pages/categories-page";
import JobPage from "./features/server/pages/job-page";
import NodePage from "./features/server/pages/node-page";
import {
  ReactFlowProvider,
} from '@xyflow/react'

import { DnDProvider } from './features/server/components/DnDContext';
import { FlowProvider, useFlow } from './features/server/components/useFlowEvents';
import ServerLayout, { loader as serverLayoutLoader } from './features/server/layout/server-layout';



console.log('📍 Loaded renderer entry index.tsx');

const router = createHashRouter(
  [
    {
      path: '/',
      element: <Root />,
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
              element: <AuthLayout/>,
              children: [
                {
                  path: 'login',
                  element: <LoginPage />,
                },
                {
                  path: 'join',
                  element: <JoinPage />,
                  loader: joinLoader,
                  action: joinAction
                },
                    // 소셜 로그인 경로 추가
                {
                  path: 'social/kakao/start',
                  // 여기에 적절한 소셜 로그인 핸들러 컴포넌트 추가 필요
                  // element: <SocialAuthRedirect provider="kakao" />,
                },
                {
                  path: 'social/github/start',
                  // 여기에 적절한 소셜 로그인 핸들러 컴포넌트 추가 필요
                  // element: <SocialAuthRedirect provider="github" />,
                }
              ]
            },
          ],
        },
        {
          path: 'products',
          children: [
            { index: true, loader: () => redirect('/products/leaderboards') }, // /products 경로 접근 시 바로 리다이렉트
            {
              path: ':id',
              children: [
                {
                  index: true, // /products/:id
                  loader: ({ params }) => {
                    console.log(`Redirecting from /products/:id to /products/${params.id}/overview`);
                    return redirect(`/products/${params.id}/overview`);
                  }
                },
                {
                  path: 'overview', // /products/:id/overview
                  element: <ProductOverviewLayout />,
                  loader: ProductOverviewLayoutLoader,
                  children: [
                    {
                      index: true,
                      element: <ProductOverviewPage />
                    }
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
                  loader : LeaderboardPageLoader,
                },
                {
                path: 'daily/:year/:month/:day',
                element: <DailyLeaderboardPage />,
                },

//               {
//                 path: ':period',
//                 element: <LeaderboardsRedirectionPage />,
//               },
              ],
            },
            {
              path: 'categories',
                children: [
                {
                  index: true,
                  element: <CategoriesPage />,
                  loader : CategoriesPageLoader,
                }
                ]
            }

//               {
//                 path: ':category',
//                 element: <CategoryPage />,
//               },
//             ],
//           },
//           {
//             path: 'search',
//             element: <SearchPage />,
//           },
//           {
//             path: 'submit',
//             element: <SubmitProductPage />,
//           },
//           {
//             path: 'promote',
//             children: [
//               {
//                 index: true,
//                 element: <PromotePage />,
//               },
//               {
//                 path: 'success',
//                 element: <PromoteSuccessPage />,
//               },
//               {
//                 path: 'fail',
//                 element: <PromoteFailPage />,
//               },
//             ],
//           },

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
              element: <JobPage />, // 탭 공통 레이아웃(탭 바 + Outlet)
            },
            {
              path: 'node',
              element: <NodePage/>, // 탭 공통 레이아웃(탭 바 + Outlet)

            }

            ]
          // children: [
          //   { index: true, loader: () => redirect('/jobs/tools') },
          //   { path: 'resources', element: <ResourcesTab /> },
          //   { path: 'prompts', element: <PromptsTab /> },
          //   { path: 'tools', element: <ToolsTab/> },
          //   // ... (필요한 탭 추가)
          // ]
        }

      ],
    },
  ],
  { basename: '/' },
);




const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
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
  </React.StrictMode>,
);

window.electron.ipcRenderer.once('ipc-example', (arg: any) => {
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
