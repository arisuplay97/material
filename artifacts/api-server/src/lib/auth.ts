import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.SESSION_SECRET ?? "pdam-access-secret-dev";
const REFRESH_SECRET = process.env.SESSION_SECRET + "-refresh" ?? "pdam-refresh-secret-dev";
const ACCESS_EXPIRES = "1h";
const REFRESH_EXPIRES = "7d";

export interface TokenPayload {
  userId: string;
  role: string;
  branchId: string | null;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
