require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { connectPostgres, query } = require("../db/postgres");

async function run() {
  await connectPostgres();
  const schemaPath = path.resolve(__dirname, "../../postgres.schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await query(sql);
  console.log("PostgreSQL schema initialized.");
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
