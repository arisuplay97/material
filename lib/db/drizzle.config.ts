import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

// Manual .env parser to avoid external dependencies
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...valParts] = trimmed.split("=");
    if (key && valParts.length > 0) {
      const val = valParts.join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key.trim()] = val;
    }
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
