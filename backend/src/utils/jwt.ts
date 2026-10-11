import "dotenv/config";
import jwt, { SignOptions } from "jsonwebtoken";

import { JwtPayload } from "../types/auth.types";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET as string;
const ACCESS_TOKEN_EXPIRES_IN =
  (process.env.JWT_EXPIRES_IN || "30m") as SignOptions["expiresIn"];

const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET as string;
const REFRESH_TOKEN_EXPIRES_IN =
  (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as SignOptions["expiresIn"];

if (!ACCESS_TOKEN_SECRET) {
  throw new Error("JWT_SECRET is not set. Check your .env file.");
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  if (!REFRESH_TOKEN_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not set. Check your .env file.");
  }

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  if (!REFRESH_TOKEN_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not set. Check your .env file.");
  }

  return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
}