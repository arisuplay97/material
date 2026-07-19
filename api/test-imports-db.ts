import { db } from "@workspace/db";

export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    message: "Only db module imported successfully!",
    dbType: typeof db,
  });
}
