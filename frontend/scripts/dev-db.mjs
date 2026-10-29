// Local development PostgreSQL, run from the project folder (no system install).
// Data lives in ./.pgdata; delete it to start over. Production uses a managed Postgres via DATABASE_URL.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const DATA_DIR = "./.pgdata";
const DB_NAME = "fasopay";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "fasopay",
  password: "fasopay-dev",
  port: 5433,
  persistent: true,
});

const firstRun = !existsSync(DATA_DIR);
if (firstRun) await pg.initialise();
await pg.start();
if (firstRun) await pg.createDatabase(DB_NAME);

console.log(`PostgreSQL ready on postgresql://localhost:5433/${DB_NAME}`);

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
