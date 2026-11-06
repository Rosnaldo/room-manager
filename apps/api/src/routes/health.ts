import { Router } from 'express';

import { isDatabaseReady, type DB } from '../db/connection';

export function createHealthRouter(db: DB): Router {
  const router = Router();

  router.get('/liveness', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/readiness', (req, res) => {
    const checks = { database: isDatabaseReady(db) };
    const ready = Object.values(checks).every(Boolean);

    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'not ready', checks });
  });

  return router;
}
