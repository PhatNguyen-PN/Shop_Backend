require("dotenv").config();
const { connectPostgres } = require("../db/postgres");
const { User } = require("../models/user.model");

async function run() {
  await connectPostgres();
  const email = "admin@btck.local";
  const exists = await User.findOne({ email });
  if (exists) {
    console.log("Admin existed");
    process.exit(0);
  }

  const user = await User.create({ name: "Admin", email, passwordHash: "admin123", role: "admin" });
  console.log("Created admin:", user.email);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
