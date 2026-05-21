import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { createQueryClient } from './data/queryClient.ts';
import { ROUTER_FUTURE_FLAGS } from './routerFutureFlags.ts';
import { Dashboard } from './routes/Dashboard.tsx';
import { Root } from './routes/Root.tsx';

import './index.css';

/*
 * The #root element is declared in index.html, so the "!" (which tells
 * TypeScript the value is not null) is safe here.
 */
const rootElement = document.getElementById('root')!;
const queryClient = createQueryClient();

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={ROUTER_FUTURE_FLAGS}>
        <Routes>
          <Route path="/" element={<Root />}>
            <Route path="users/:userId" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
);
