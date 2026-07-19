import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { db } from "@workspace/db";

export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    message: "Express, cors, pino-http, and db module imported successfully!",
    dbType: typeof db,
  });
}
