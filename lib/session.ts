import { randomBytes } from "crypto";

/**
 * Generate a random session ID for anonymous users
 */
export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

