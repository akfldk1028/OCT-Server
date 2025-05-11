import React from 'react';
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
import JobPage, {loader as JobPageLoader} from "./features/server/pages/job-page";

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
          children: [
            {
              index: true,
              element: <JobPage/>,
              // loader: JobPageLoader,
            }, // /products 경로 접근 시 바로 리다이렉트

            ],
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
    <TooltipProvider>
      <RouterProvider router={router} />
      <Toaster />
    </TooltipProvider>
  </React.StrictMode>,
);

window.electron.ipcRenderer.once('ipc-example', (arg: any) => {
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
