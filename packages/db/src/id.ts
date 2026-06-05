import { randomUUID } from "node:crypto";

export function newId(): string {
  let result = randomUUID();
  return result;
}

export function nowIso(): string {
  let result = new Date().toISOString();
  return result;
}
