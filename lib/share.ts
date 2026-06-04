// 共有URL用のエンコード/デコード。
// バックエンドが無いため、プロジェクトJSONをURLセーフなbase64に詰める。
import type { ReviewProject } from "./types";
import { normalizeProject } from "./storage";

// UTF-8文字列 → URLセーフbase64
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeProjectToParam(project: ReviewProject): string {
  return toBase64Url(JSON.stringify(project));
}

export function decodeProjectFromParam(param: string): ReviewProject {
  const json = fromBase64Url(param);
  const parsed = JSON.parse(json);
  return normalizeProject(parsed);
}

export function buildShareUrl(project: ReviewProject): string {
  const param = encodeProjectToParam(project);
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname.replace(/\/$/, "")}`
      : "";
  // basePath を考慮し、現在のオリジン基準で /share へ向ける。
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const prefix = process.env.NEXT_PUBLIC_BASE_PATH || "";
  void base;
  return `${origin}${prefix}/share/?d=${param}`;
}
