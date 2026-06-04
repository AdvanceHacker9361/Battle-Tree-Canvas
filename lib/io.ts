// JSONエクスポート / インポートのブラウザI/Oユーティリティ。
import type { ReviewProject } from "./types";
import { normalizeProject } from "./storage";

function safeFilename(title: string): string {
  const base = (title || "battle-tree-canvas")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 60)
    .trim();
  return `${base || "project"}.btc.json`;
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProjectToFile(project: ReviewProject): void {
  triggerDownload(
    JSON.stringify(project, null, 2),
    safeFilename(project.title),
    "application/json"
  );
}

export function exportMarkdownToFile(title: string, markdown: string): void {
  const base = (title || "battle-tree-canvas")
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 60)
    .trim();
  triggerDownload(markdown, `${base || "project"}.md`, "text/markdown");
}

export function importProjectFromFile(file: File): Promise<ReviewProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        resolve(normalizeProject(parsed));
      } catch (e) {
        reject(
          e instanceof Error ? e : new Error("JSONの解析に失敗しました。")
        );
      }
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました。"));
    reader.readAsText(file);
  });
}
