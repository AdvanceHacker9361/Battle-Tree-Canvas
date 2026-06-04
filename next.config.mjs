import { createRequire } from "module";

// package.json を単一の真実とし、アプリのバージョンをクライアントへ公開する。
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 完全クライアントサイド (localStorage) アプリのため静的書き出しに対応。
  // GitHub Pages / Vercel / 任意の静的ホスティングへデプロイ可能。
  output: "export",
  images: { unoptimized: true },
  // GitHub Pages のサブパス配信に対応する場合は環境変数で basePath を設定。
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

export default nextConfig;
