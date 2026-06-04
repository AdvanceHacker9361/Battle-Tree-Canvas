"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Button, LinkButton, EmptyState, Badge } from "@/components/ui";
import { EditorProvider } from "@/components/editor/EditorContext";
import { OverviewEditor } from "@/components/editor/OverviewEditor";
import { TeamEditor } from "@/components/editor/TeamEditor";
import { TreeView } from "@/components/editor/TreeView";
import { BoardEditor } from "@/components/editor/BoardEditor";
import { NodeDetail } from "@/components/editor/NodeDetail";
import { RouteCompare } from "@/components/editor/RouteCompare";
import { decodeProjectFromParam } from "@/lib/share";
import { saveProject } from "@/lib/storage";
import { createProject } from "@/lib/factory";
import type { ReviewProject } from "@/lib/types";

type Tab = "overview" | "tree" | "compare";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "概要・構築" },
  { value: "tree", label: "ツリー編集" },
  { value: "compare", label: "比較・レビュー" },
];

function ShareView() {
  const params = useSearchParams();
  const router = useRouter();
  const data = params.get("d") ?? "";

  const [project, setProject] = useState<ReviewProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<Tab>("tree");

  useEffect(() => {
    if (!data) {
      setError("共有データが指定されていません。");
      return;
    }
    try {
      const p = decodeProjectFromParam(data);
      setProject(p);
      setSelectedId(p.rootNodeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "共有データの読み込みに失敗しました。");
    }
  }, [data]);

  const handleDuplicate = () => {
    if (!project) return;
    const fresh = createProject(`${project.title}（共有から複製）`, project.mode);
    const cloned: ReviewProject = {
      ...JSON.parse(JSON.stringify(project)),
      id: fresh.id,
      title: `${project.title}（共有から複製）`,
      createdAt: fresh.createdAt,
      updatedAt: fresh.updatedAt,
    };
    saveProject(cloned);
    router.push(`/project/?id=${cloned.id}`);
  };

  if (error) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-2xl px-4 py-16">
          <EmptyState
            title="共有ビューを表示できません"
            description={error}
            action={<LinkButton href="/" variant="primary">トップへ</LinkButton>}
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
    mutate: () => {}, // 読み取り専用
    selectedId,
    select: setSelectedId,
    readOnly: true,
  };

  return (
    <EditorProvider value={ctx}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar
          subtitle={
            <span className="flex items-center gap-2">
              {project.title}
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                読み取り専用
              </Badge>
            </span>
          }
        >
          <Button size="sm" variant="primary" onClick={handleDuplicate}>
            自分のプロジェクトに複製
          </Button>
        </TopBar>

        <nav className="flex shrink-0 items-center gap-1 border-b border-slate-800 bg-slate-950/60 px-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`relative px-3 py-2.5 text-sm transition-colors ${
                tab === t.value ? "text-white" : "text-slate-400 hover:text-slate-200"
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
    </EditorProvider>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">読み込み中…</div>}>
      <ShareView />
    </Suspense>
  );
}
