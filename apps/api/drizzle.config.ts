import { defineConfig } from 'drizzle-kit';
import properties from './src/properties';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: properties.databaseFile },
});
