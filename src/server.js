require("dotenv").config();
const app = require("./app");
const { connectPostgres, bindPostgresLogs } = require("./db/postgres");

const PORT = process.env.PORT || 4000;

(async () => {
  bindPostgresLogs();
  await connectPostgres();
  app.listen(PORT, () => {
    console.log(`BTCK API listening at http://localhost:${PORT}`);
  });
})();
