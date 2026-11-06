import { afterEach, beforeEach } from 'vitest';
import supertest from 'supertest';

import { createApp } from '../../src/app';
import type { DB } from '../../src/db/connection';
import { createTestDb } from './db';

export interface TestContext {
  db: DB;
  api: ReturnType<typeof supertest>;
}

/**
 * Registers hooks giving every test its own in-memory database + app.
 * Usage: `const ctx = useTestApp();` then `ctx.api.get(...)` / `ctx.db` inside tests.
 */
export function useTestApp(): TestContext {
  const ctx = {} as TestContext;

  beforeEach(() => {
    ctx.db = createTestDb();
    ctx.api = supertest(createApp(ctx.db));
  });

  afterEach(() => {
    ctx.db.$client.close();
  });

  return ctx;
}
