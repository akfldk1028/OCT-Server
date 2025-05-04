// import React from 'react';
// import { createHashRouter } from 'react-router-dom';

// // Import your components
// import ProductsPage from './features/products/pages/products-page';
// import LeaderboardLayout from './features/products/layouts/leaderboard-layout';
// import LeaderboardPage from './features/products/pages/leaderboard-page';
// import YearlyLeaderboardPage from './features/products/pages/yearly-leaderboard-page';
// import MonthlyLeaderboardPage from './features/products/pages/monthly-leaderboard-page';
// import DailyLeaderboardPage from './features/products/pages/daily-leaderboard-page';
// import WeeklyLeaderboardPage from './features/products/pages/weekly-leaderboard-page';
// import LeaderboardsRedirectionPage from './features/products/pages/leaderboards-redirection-page';
// import CategoriesPage from './features/products/pages/categories-page';
// import CategoryPage from './features/products/pages/category-page';
// import SearchPage from './features/products/pages/search-page';
// import SubmitProductPage from './features/products/pages/submit-product-page';
// import PromotePage from './features/products/pages/promote-page';
// import PromoteSuccessPage from './features/products/pages/promote-success-page';
// import PromoteFailPage from './features/products/pages/promote-fail-page';
// import ProductRedirectPage from './features/products/pages/product-redirect-page';
// import ProductOverviewLayout from './features/products/layouts/product-overview-layout';
// import ProductOverviewPage from './features/products/pages/product-overview-page';
// import ProductReviewsPage from './features/products/pages/product-reviews-page';
// import ProductVisitPage from './features/products/pages/product-visit-page';
// import ProductUpvotePage from './features/products/pages/product-upvote-page';

// // ... other imports

// const router = createHashRouter([
//   {
//     path: '/',
//     element: <Root />,
//     errorElement: <ErrorBoundary error={undefined} />,
//     children: [
//       // ... existing routes
      
//       {
//         path: 'products',
//         children: [
//           {
//             index: true,
//             element: <ProductsPage />,
//           },
//           {
//             path: 'leaderboards',
//             element: <LeaderboardLayout />,
//             children: [
//               {
//                 index: true,
//                 element: <LeaderboardPage />,
//               },
//               {
//                 path: 'yearly/:year',
//                 element: <YearlyLeaderboardPage />,
//               },
//               {
//                 path: 'monthly/:year/:month',
//                 element: <MonthlyLeaderboardPage />,
//               },
//               {
//                 path: 'daily/:year/:month/:day',
//                 element: <DailyLeaderboardPage />,
//               },
//               {
//                 path: 'weekly/:year/:week',
//                 element: <WeeklyLeaderboardPage />,
//               },
//               {
//                 path: ':period',
//                 element: <LeaderboardsRedirectionPage />,
//               },
//             ],
//           },
//           {
//             path: 'categories',
//             children: [
//               {
//                 index: true,
//                 element: <CategoriesPage />,
//               },
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
//           {
//             path: ':productId',
//             children: [
//               {
//                 index: true,
//                 element: <ProductRedirectPage />,
//               },
//               {
//                 element: <ProductOverviewLayout />,
//                 children: [
//                   {
//                     path: 'overview',
//                     element: <ProductOverviewPage />,
//                   },
//                   {
//                     path: 'reviews',
//                     children: [
//                       {
//                         index: true,
//                         element: <ProductReviewsPage />,
//                       },
//                     ],
//                   },
//                 ],
//               },
//               {
//                 path: 'visit',
//                 element: <ProductVisitPage />,
//               },
//               {
//                 path: 'upvote',
//                 element: <ProductUpvotePage />,
//               },
//             ],
//           },
//         ],
//       },
      
//       // ... other routes
//     ],
//   },
// ]);

// // ... rest of your code