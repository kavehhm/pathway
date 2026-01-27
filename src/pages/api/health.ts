import type { NextApiRequest, NextApiResponse } from "next";

// Simple health check endpoint to keep functions warm
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
}
