"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Button, LinkButton, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { EditorProvider } from "@/components/editor/EditorContext";
import { OverviewEditor } from "@/components/editor/OverviewEditor";
import { TeamEditor } from "@/components/editor/TeamEditor";
import { TreeView } from "@/components/editor/TreeView";
import { BoardEditor } from "@/components/editor/BoardEditor";
import { NodeDetail } from "@/components/editor/NodeDetail";
import { RouteCompare } from "@/components/editor/RouteCompare";
import { getProject, saveProject } from "@/lib/storage";
import { exportProjectToFile } from "@/lib/io";
import { buildShareUrl } from "@/lib/share";
import type { ReviewProject } from "@/lib/types";

type Tab = "overview" | "tree" | "compare";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "概要・構築" },
  { value: "tree", label: "ツリー編集" },
  { value: "compare", label: "ルート比較" },
];

function ProjectEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";

  const [project, setProject] = useState<ReviewProject | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初期ロード
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    const p = getProject(id);
    if (!p) {
      setNotFound(true);
      return;
    }
    setProject(p);
    setSelectedId(p.rootNodeId);
  }, [id]);

  // デバウンス保存
  useEffect(() => {
    if (!project) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(project);
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [project]);

  // ページ離脱時に確実に保存
  useEffect(() => {
    return () => {
      if (project) saveProject(project);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutate = useCallback((fn: (p: ReviewProject) => ReviewProject) => {
    setProject((prev) => (prev ? fn(prev) : prev));
  }, []);

  const handleShare = () => {
    if (!project) return;
    saveProject(project);
    setShareUrl(buildShareUrl(project));
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-2xl px-4 py-16">
          <EmptyState
            title="プロジェクトが見つかりません"
            description="URLが正しくないか、このブラウザのローカル保存に該当データがありません。"
            action={<LinkButton href="/" variant="primary">ダッシュボードへ戻る</LinkButton>}
          />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <div className="p-8 text-sm text-slate-500">読み込み中…</div>
      </div>
    );
  }

  const ctx = {
    project,
    mutate,
    selectedId,
    select: setSelectedId,
    readOnly: false,
  };

  return (
    <EditorProvider value={ctx}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar subtitle={project.title}>
          <Button size="sm" variant="ghost" onClick={() => router.push("/")}>
            ← 一覧
          </Button>
          <Button size="sm" variant="secondary" onClick={() => exportProjectToFile(project)}>
            JSON書き出し
          </Button>
          <Button size="sm" variant="primary" onClick={handleShare}>
            共有
          </Button>
        </TopBar>

        {/* タブ */}
        <nav className="flex shrink-0 items-center gap-1 border-b border-slate-800 bg-slate-950/60 px-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`relative px-3 py-2.5 text-sm transition-colors ${
                tab === t.value
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
              {tab === t.value && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-500" />
              )}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "overview" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-6xl space-y-8">
                <OverviewEditor />
                <TeamEditor />
              </div>
            </div>
          )}

          {tab === "tree" && (
            <div className="flex h-full min-w-0 divide-x divide-slate-800 overflow-x-auto">
              <div className="w-[300px] shrink-0 bg-slate-950/30">
                <TreeView />
              </div>
              <div className="w-[340px] shrink-0">
                <BoardEditor />
              </div>
              <div className="w-[400px] shrink-0 flex-1">
                <NodeDetail />
              </div>
            </div>
          )}

          {tab === "compare" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-6xl">
                <RouteCompare
                  onSelectNode={(nid) => {
                    setSelectedId(nid);
                    setTab("tree");
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!shareUrl} onClose={() => setShareUrl(null)} title="共有URL">
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            このURLには現在のプロジェクト内容がすべて埋め込まれています（サーバー保存はされません）。
            受け取った人は読み取り専用ビューで閲覧でき、自分のプロジェクトとして複製できます。
          </p>
          <div className="flex gap-2">
            <input readOnly value={shareUrl ?? ""} onFocus={(e) => e.target.select()} />
            <Button variant="primary" onClick={handleCopy} className="shrink-0">
              {copied ? "コピー済" : "コピー"}
            </Button>
          </div>
          {shareUrl && (
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-blue-400 hover:underline"
            >
              共有ビューを開く ↗
            </a>
          )}
          <p className="text-[11px] text-slate-600">
            ※ プロジェクトが大きいとURLが長くなります。長すぎる場合はJSON書き出しでの共有を推奨します。
          </p>
        </div>
      </Modal>
    </EditorProvider>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">読み込み中…</div>}>
      <ProjectEditor />
    </Suspense>
  );
}
