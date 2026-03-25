import postgres from "postgres";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(connectionString);

async function migrate() {
  // Create migrations tracking table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `;

  // If this is an existing DB (has tables) but no migration history,
  // seed the pre-existing migrations so we don't try to re-run them
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM _migrations`;
  if (count === 0) {
    const [{ has_pillars }] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'pillars'
      ) AS has_pillars
    `;
    if (has_pillars) {
      console.log("  existing DB detected — seeding migration history");
      const legacy = [
        "0000_cloudy_excalibur.sql",
        "0001_busy_scarlet_spider.sql",
        "0002_married_zarek.sql",
        "0003_opposite_adam_warlock.sql",
      ];
      for (const f of legacy) {
        await sql`INSERT INTO _migrations (name) VALUES (${f}) ON CONFLICT (name) DO NOTHING`;
      }
    }
  }

  // Get already-applied migrations
  const applied = await sql`SELECT name FROM _migrations ORDER BY id`;
  const appliedSet = new Set(applied.map((r) => r.name));

  // Read migration files in order
  const migrationsDir = join(__dirname, "../../drizzle");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  skip: ${file} (already applied)`);
      continue;
    }

    console.log(`  apply: ${file}`);
    const content = readFileSync(join(migrationsDir, file), "utf-8");

    // Split on statement-breakpoint markers and execute each statement
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (statements.length > 0) {
      for (const stmt of statements) {
        await sql.unsafe(stmt);
      }
    } else if (content.trim()) {
      await sql.unsafe(content);
    }

    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
  }

  console.log("  migrations complete");
  await sql.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
