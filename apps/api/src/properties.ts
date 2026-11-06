import dotenv from 'dotenv';

dotenv.config();

export const properties = {
  port: Number(process.env.PORT) || 4000,
  webOrigins: (process.env.WEB_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim()).filter(Boolean),
  databaseFile: process.env.DATABASE_FILE || './data/room-manager.db',
  /** IANA zone the reservation wall-clock times are in; used to decide what "in the past" means */
  timeZone: process.env.APP_TIMEZONE || 'America/Sao_Paulo',
};

export default properties;
