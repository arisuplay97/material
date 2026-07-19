export default async function handler(req: any, res: any) {
  try {
    const mod = await import("../artifacts/api-server/src/app");
    const app = mod.default;
    return app(req, res);
  } catch (err: any) {
    res.status(500).json({
      error: "Vercel Serverless Function Crash during import",
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
  }
}
