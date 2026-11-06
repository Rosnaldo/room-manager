import { afterEach, beforeEach } from 'vitest';
import supertest from 'supertest';

import { createApp, type AppOptions } from '../../src/app';
import type { DB } from '../../src/db/connection';
import { createTestDb } from './db';

export interface TestContext {
  db: DB;
  api: ReturnType<typeof supertest>;
}

/**
 * Registers hooks giving every test its own in-memory database + app.
 * Usage: `const ctx = useTestApp();` then `ctx.api.get(...)` / `ctx.db` inside tests.
 * Pass `{ now }` to pin the clock the app uses for "in the past" checks.
 */
export function useTestApp(options: AppOptions = {}): TestContext {
  const ctx = {} as TestContext;

  beforeEach(() => {
    ctx.db = createTestDb();
    ctx.api = supertest(createApp(ctx.db, options));
  });

  afterEach(() => {
    ctx.db.$client.close();
  });

  return ctx;
}
