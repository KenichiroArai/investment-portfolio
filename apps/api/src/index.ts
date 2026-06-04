import { serve } from "@hono/node-server";

import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "127.0.0.1";
const app = createApp();

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`API http://${info.address}:${info.port}`);
});
