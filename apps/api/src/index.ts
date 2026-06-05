import { serve } from "@hono/node-server";

import { createApp } from "./app";
import { initDatabase } from "./db";

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "127.0.0.1";

async function main() {
  let result: void = undefined;

  await initDatabase();
  const app = createApp();

  serve({ fetch: app.fetch, port, hostname }, (info) => {
    let result: void = undefined;
    console.log(`API http://${info.address}:${info.port}`);
    return result;
  });

  return result;
}

void main();
