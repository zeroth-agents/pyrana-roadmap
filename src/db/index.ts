import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient: Sql };

const client =
  globalForDb.pgClient ?? postgres(process.env.DATABASE_URL!);

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle({ client, schema });
