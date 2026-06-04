// localStorage 永続化レイヤ。
import type { ReviewProject, TurnNode, ActionRecord } from "./types";
import { SCHEMA_VERSION } from "./constants";
import { DEFAULT_REGULATION_ID } from "./regulations";

const STORAGE_KEY = "btc.projects.v1";

type Store = Record<string, ReviewProject>;

// 「メガ着地」概念の削除に伴う旧データ移行。
// 廃止した値 (lineTag: mega_landing_candidate / actionType: mega_landing /
// フィールド: megaLandingCheck) を安全な状態へ正規化する。
function migrateNode(node: TurnNode): TurnNode {
  const next = { ...(node as TurnNode & { megaLandingCheck?: unknown }) };
  delete (next as { megaLandingCheck?: unknown }).megaLandingCheck;
  if ((next.lineTag as string) === "mega_landing_candidate") next.lineTag = "pending";
  const fixAction = (a?: ActionRecord): ActionRecord | undefined =>
    a && (a.actionType as string) === "mega_landing"
      ? { ...a, actionType: "other" }
      : a;
  next.myAction = fixAction(next.myAction);
  next.opponentAction = fixAction(next.opponentAction);
  // Pokémon Champions に「霰」は無いため旧データの天候を「雪」に寄せる。
  if (next.boardState?.field?.weather === "霰/雪" || next.boardState?.field?.weather === "霰") {
    next.boardState = {
      ...next.boardState,
      field: { ...next.boardState.field, weather: "雪" },
    };
  }
  return next;
}

export function migrateProject(project: ReviewProject): ReviewProject {
  const nodes: Record<string, TurnNode> = {};
  for (const [id, n] of Object.entries(project.nodes)) nodes[id] = migrateNode(n);
  return {
    ...project,
    // 旧データ (regulation 無し) は既定の M-A に寄せる。
    regulation: project.regulation || DEFAULT_REGULATION_ID,
    nodes,
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readStore(): Store {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.error("Battle Tree Canvas: ストアの読み込みに失敗しました", e);
    return {};
  }
}

function writeStore(store: Store): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("Battle Tree Canvas: ストアの保存に失敗しました", e);
    throw e;
  }
}

export function listProjects(): ReviewProject[] {
  return Object.values(readStore())
    .map(migrateProject)
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
}

export function getProject(id: string): ReviewProject | null {
  const p = readStore()[id];
  return p ? migrateProject(p) : null;
}

export function saveProject(project: ReviewProject): void {
  const store = readStore();
  store[project.id] = { ...project, updatedAt: new Date().toISOString() };
  writeStore(store);
}

export function deleteProject(id: string): void {
  const store = readStore();
  delete store[id];
  writeStore(store);
}

export function upsertImported(project: ReviewProject): ReviewProject {
  // インポートされたプロジェクトを正規化して保存する。
  const normalized = normalizeProject(project);
  const store = readStore();
  store[normalized.id] = normalized;
  writeStore(store);
  return normalized;
}

// 外部JSON / 共有データを最小限バリデートして整える。
export function normalizeProject(input: unknown): ReviewProject {
  if (!input || typeof input !== "object") {
    throw new Error("プロジェクトデータが不正です。");
  }
  const p = input as Partial<ReviewProject>;
  if (!p.nodes || !p.rootNodeId || !p.nodes[p.rootNodeId]) {
    throw new Error("ツリーのルートノードが見つかりません。");
  }
  const ts = new Date().toISOString();
  return migrateProject({
    id: p.id || `proj_${Math.random().toString(36).slice(2)}`,
    title: p.title || "無題のプロジェクト",
    mode: p.mode === "double" ? "double" : "single",
    // 旧データ (regulation 無し) は既定の M-A として扱う。
    regulation: p.regulation || DEFAULT_REGULATION_ID,
    myTeam: Array.isArray(p.myTeam) ? p.myTeam : [],
    opponentTeam: Array.isArray(p.opponentTeam) ? p.opponentTeam : [],
    rootNodeId: p.rootNodeId,
    nodes: p.nodes,
    projectNotes: p.projectNotes ?? "",
    tags: Array.isArray(p.tags) ? p.tags : [],
    schemaVersion: p.schemaVersion ?? SCHEMA_VERSION,
    createdAt: p.createdAt || ts,
    updatedAt: ts,
  });
}

export const PROJECT_FILE_VERSION = SCHEMA_VERSION;
