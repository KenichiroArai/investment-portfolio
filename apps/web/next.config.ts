import type { NextConfig } from "next";

const repoBase = "/investment-portfolio";
const isProd = process.env.NODE_ENV === "production";

const result: NextConfig = {
  output: "export",
  basePath: isProd ? repoBase : "",
  assetPrefix: isProd ? repoBase : "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default result;
