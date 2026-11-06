import properties from './properties';
import logger from './logger';
import { createDatabase, runMigrations } from './db/connection';
import { createApp } from './app';

function main() {
  const db = createDatabase();
  runMigrations(db);

  createApp(db).listen(properties.port, () => logger.info(`api listening on ${properties.port}`));
}

main();
