// アプリのバージョン。package.json を単一の真実とし、
// next.config.mjs 経由で NEXT_PUBLIC_APP_VERSION として公開する。
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
