
console.log('📍 Loaded renderer entry index.tsx');

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router';
import { Root, ErrorBoundary } from './root';
import './tailwind.css';
import { Toaster } from './common/components/ui/toaster';
import { TooltipProvider } from './common/components/ui/tooltip';
import './App.css';

const router = createHashRouter([
  {
    path: '/',
    element: < Root/>,
    errorElement: <ErrorBoundary error={undefined} />,
    // children: [...]  // 하위 라우트가 있으면 여기에
  },
]);

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
    <Toaster />
  </React.StrictMode>,
);
window.electron.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
