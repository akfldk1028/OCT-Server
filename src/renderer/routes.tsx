// import { HashRouter, Routes, Route } from 'react-router-dom';
// import { Root, ErrorBoundary } from './root';
//
// function Router() {
//   return (
//     <HashRouter>
//       <Routes>
//         <Route
//           path="/"
//           element={<Root />}
//           errorElement={<ErrorBoundary error={new Error('Unknown Error')} />}
//         />
//       </Routes>
//     </HashRouter>
//   );
// }
//
// export default Router;

// import { createHashRouter, RouterProvider } from 'react-router-dom';
// import { Root, ErrorBoundary } from './root';
//
// const router = createHashRouter([
//   {
//     path: '/',
//     element: <Root />,
//     errorElement: <ErrorBoundary />,
//   },
// ]);
//
// function Router() {
//   // 이 방식은 Root 컴포넌트가 Router 컨텍스트 내부에 있게 해줍니다
//   return <RouterProvider router={router} />;
// }
//
// export default Router;
/// //////////////

// routes.tsx
// import React from 'react';
// import { createRoot } from 'react-dom/client';
// import { createHashRouter, RouterProvider } from 'react-router-dom';
// import { Root, ErrorBoundary } from './root';
//
// const router = createHashRouter([
//   {
//     path: '/',
//     element: <Root />,
//     errorElement: <ErrorBoundary error={undefined} />,
//     // children: [...]  // 하위 라우트가 있으면 여기에
//   },
// ]);
//
// const container = document.getElementById('root')!;
// const root = createRoot(container);
// root.render(
//   <React.StrictMode>
//     <RouterProvider router={router} />
//   </React.StrictMode>
// );
