import pg from "pg";
const { Pool } = pg;

const connectionString = "postgresql://neondb_owner:npg_9EDmOqw2ZYiQ@ep-polished-darkness-azqug7at-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function run() {
  const pool = new Pool({ connectionString });
  try {
    const res = await pool.query("SELECT id, name, email, role FROM users");
    console.log("SUCCESS! USERS IN DB:", res.rows);
  } catch (err) {
    console.error("ERROR QUERYING DATABASE:", err.message);
  } finally {
    await pool.end();
  }
}

run();
