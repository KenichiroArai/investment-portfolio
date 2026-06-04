import { randomUUID } from "node:crypto";

export function newId(): string {
  const result = randomUUID();
  return result;
}

export function nowIso(): string {
  const result = new Date().toISOString();
  return result;
}
