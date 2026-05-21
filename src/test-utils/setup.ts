import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './msw/server';

/*
 * onUnhandledRequest: 'error' makes a missing mock fail loudly, instead of
 * letting a test quietly reach the real network.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
