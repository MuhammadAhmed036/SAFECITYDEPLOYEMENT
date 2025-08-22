import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // ✅ Load your environment variables

import { pool } from "./lib/db.js"; // ✅ Include .js extension

async function test() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Connected:", res.rows);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

test();
