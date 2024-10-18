import pg from "pg";

const connectionString = process.env.SUPABASE_URL;

export const dbPool = new pg.Pool(
  process.env.DB_ONLINE_MODE != "true"
    ? {
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        port: Number(process.env.DB_PORT),
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
    : {
        connectionString,
      }
);
