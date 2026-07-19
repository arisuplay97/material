export default function handler(req: any, res: any) {
  try {
    const keys = Object.keys(process.env).filter(key => {
      // Hide sensitive passwords, but keep names of keys
      return !key.toLowerCase().includes("key") && !key.toLowerCase().includes("secret") && !key.toLowerCase().includes("password");
    });

    res.status(200).json({
      status: "ok",
      nodeVersion: process.version,
      hasDatabaseUrl: typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0,
      databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      environmentKeys: keys,
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}
