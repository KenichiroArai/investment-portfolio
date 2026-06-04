import { serve } from "@hono/node-server";

import { createApp } from "./app";
import { initDatabase } from "./db";

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "127.0.0.1";

async function main() {
  await initDatabase();
  const app = createApp();

  serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.log(`API http://${info.address}:${info.port}`);
  });
}

void main();
