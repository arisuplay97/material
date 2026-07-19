import pg from "pg";

export default function handler(req: any, res: any) {
  try {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    res.status(200).json({
      status: "ok",
      message: "pg module imported and Pool instantiated successfully!",
      poolType: typeof pool,
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}
