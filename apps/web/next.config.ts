import type { NextConfig } from "next";

const repoBase = "/investment-portfolio";
const isProd = process.env.NODE_ENV === "production";

const result: NextConfig = {
  output: "export",
  basePath: isProd ? repoBase : "",
  assetPrefix: isProd ? repoBase : "",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? repoBase : "",
    NEXT_PUBLIC_DATA_SOURCE: isProd ? "static" : "api",
  },
};

export default result;
