let app: any;
let initError: Error | null = null;

try {
  const mod = await import("../artifacts/api-server/src/app");
  app = mod.default;
} catch (err: any) {
  initError = err;
  console.error("INITIALIZATION ERROR:", err);
}

export default function handler(req: any, res: any) {
  if (initError) {
    res.status(500).json({
      error: "Server initialization failed",
      message: initError.message,
      stack: initError.stack,
      name: initError.name,
    });
    return;
  }
  return app(req, res);
}
