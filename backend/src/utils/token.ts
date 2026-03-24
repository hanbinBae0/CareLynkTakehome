import crypto from "crypto";

import { UserRole } from "../types/domain";
import { AppError } from "./errors";

interface TokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  exp: number;
}

const HEADER = { alg: "HS256", typ: "JWT" };

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function sign(input: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(input)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createToken(data: Omit<TokenPayload, "exp">, secret: string, ttlSeconds = 60 * 60 * 24 * 7): string {
  const payload: TokenPayload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(HEADER));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    throw new AppError("Invalid token", 401);
  }

  const expectedSignature = sign(`${header}.${payload}`, secret);
  const actualSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    actualSignature.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignatureBuffer)
  ) {
    throw new AppError("Invalid token signature", 401);
  }

  const parsedPayload = JSON.parse(base64UrlDecode(payload)) as TokenPayload;

  if (parsedPayload.exp <= Math.floor(Date.now() / 1000)) {
    throw new AppError("Token expired", 401);
  }

  return parsedPayload;
}

