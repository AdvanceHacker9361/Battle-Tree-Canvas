"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Button, Field, Badge, EmptyState, confirmAction } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { BATTLE_MODES } from "@/lib/constants";
import { createProject, createSavedTeam } from "@/lib/factory";
import {
  selectableRegulations,
  getRegulation,
  DEFAULT_REGULATION_ID,
} from "@/lib/regulations";
import {
  listProjects,
  saveProject,
  deleteProject,
  upsertImported,
  listTeams,
  saveTeam,
  deleteTeam,
} from "@/lib/storage";
import { importProjectFromFile } from "@/lib/io";
import { PRESET_OPPONENT_TEAMS } from "@/lib/presetTemplates";
import type {
  BattleMode,
  RegulationId,
  ReviewProject,
  SavedTeam,
  TeamKind,
} from "@/lib/types";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

function TeamIcons({ team }: { team: ReviewProject["myTeam"] }) {
  const named = team.filter((p) => p.species.trim());
  if (named.length === 0)
    return <span className="text-xs text-slate-600">未入力</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {named.map((p) => (
        <span
          key={p.id}
          className={`rounded px-1.5 py-0.5 text-[11px] leading-none ${
            p.isMegaCandidate
              ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40"
              : "bg-slate-800 text-slate-300"
          }`}
          title={p.isMegaCandidate ? "メガ候補" : undefined}
        >
          {p.species}
        </span>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [teams, setTeams] = useState<SavedTeam[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMode, setNewMode] = useState<BattleMode>("single");
  const [newRegulation, setNewRegulation] = useState<RegulationId>(DEFAULT_REGULATION_ID);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setProjects(listProjects());
    setTeams(listTeams());
  };

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, []);

  const teamName = (teamId?: string) =>
    teamId ? teams.find((t) => t.id === teamId)?.name : undefined;

  const myTeams = teams.filter((t) => t.kind === "my");
  const opponentTeams = teams.filter((t) => t.kind === "opponent");

  // ---- マイ構築 / 相手テンプレート ----
  const handleCreateTeam = (kind: TeamKind) => {
    const name = kind === "opponent" ? "新しい相手テンプレート" : "新しいマイ構築";
    const team = createSavedTeam(name, newMode, newRegulation, undefined, kind);
    saveTeam(team);
    router.push(`/team/?id=${team.id}`);
  };

  const handleDuplicateTeam = (t: SavedTeam) => {
    const copy = createSavedTeam(`${t.name} のコピー`, t.mode, t.regulation, t.pokemon, t.kind);
    saveTeam(copy);
    refresh();
  };

  // プリセット(読み取り専用)を編集可能な相手テンプレートとして複製し、編集画面へ。
  const handleDuplicatePresetToLibrary = (t: SavedTeam) => {
    const copy = createSavedTeam(t.name, t.mode, t.regulation, t.pokemon, "opponent");
    saveTeam(copy);
    router.push(`/team/?id=${copy.id}`);
  };

  const handleDeleteTeam = (t: SavedTeam) => {
    const label = t.kind === "opponent" ? "相手テンプレート" : "マイ構築";
    if (!confirmAction(`${label}「${t.name}」を削除します。よろしいですか？（作成済みのシミュレーションは残ります）`))
      return;
    deleteTeam(t.id);
    refresh();
  };

  const handleCreateSimFromTeam = (t: SavedTeam) => {
    const proj = createProject(`${t.name} のシミュレーション`, t.mode, t.regulation, {
      myTeam: t.pokemon,
      sourceTeamId: t.id,
    });
    saveProject(proj);
    router.push(`/project/?id=${proj.id}`);
  };

  const handleCreate = () => {
    const project = createProject(
      newTitle.trim() || "無題のプロジェクト",
      newMode,
      newRegulation
    );
    saveProject(project);
    router.push(`/project/?id=${project.id}`);
  };

  const handleDuplicate = (p: ReviewProject) => {
    const copy = createProject(`${p.title} のコピー`, p.mode);
    // 構築・ツリーをそのまま引き継ぐ (IDは新規)。
    const cloned: ReviewProject = {
      ...JSON.parse(JSON.stringify(p)),
      id: copy.id,
      title: `${p.title} のコピー`,
      createdAt: copy.createdAt,
      updatedAt: copy.updatedAt,
    };
    saveProject(cloned);
    refresh();
  };

  const handleDelete = (p: ReviewProject) => {
    if (!confirmAction(`「${p.title}」を削除します。よろしいですか？`)) return;
    deleteProject(p.id);
    refresh();
  };

  const handleImportFile = async (file: File) => {
    setError(null);
    try {
      const parsed = await importProjectFromFile(file);
      // 衝突を避けるため新IDを振り直してインポート。
      const imported = upsertImported({
        ...parsed,
        id: `proj_${crypto.randomUUID()}`,
      });
      refresh();
      router.push(`/project/?id=${imported.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "インポートに失敗しました。");
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImportFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          JSONインポート
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleCreateTeam("my")}>
          + マイ構築
        </Button>
        <Button variant="secondary" size="sm" onClick={() => handleCreateTeam("opponent")}>
          + 相手テンプレート
        </Button>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          + 新規プロジェクト
        </Button>
      </TopBar>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">
            競技ポケモンの対戦分岐をツリーで整理・保存・共有する検討ノート。AI分析は行いません。
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* マイ構築セクション */}
        {loaded && myTeams.length > 0 && (
          <section className="mb-10">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-200">マイ構築</h2>
              <span className="text-xs text-slate-600">
                保存した自分の構築。ここから何度でもシミュレーションを作成できます。
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myTeams.map((t) => {
                const tMode = BATTLE_MODES.find((m) => m.value === t.mode);
                const simCount = projects.filter((p) => p.sourceTeamId === t.id).length;
                return (
                  <div
                    key={t.id}
                    className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700"
                  >
                    <button onClick={() => router.push(`/team/?id=${t.id}`)} className="flex-1 text-left">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 font-semibold text-slate-100 group-hover:text-white">
                          {t.name}
                        </h3>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge className="border-slate-700 bg-slate-800 text-slate-300">
                            {tMode?.label}
                          </Badge>
                          <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                            {getRegulation(t.regulation).label}
                          </Badge>
                        </div>
                      </div>
                      <TeamIcons team={t.pokemon} />
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                        <span>シミュレーション {simCount}</span>
                        <span>更新 {formatDate(t.updatedAt)}</span>
                      </div>
                    </button>
                    <div className="mt-3 flex items-center gap-1 border-t border-slate-800 pt-3">
                      <Button size="sm" variant="primary" onClick={() => handleCreateSimFromTeam(t)}>
                        シミュレーション作成
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/team/?id=${t.id}`)}>
                        編集
                      </Button>
                      <div className="flex-1" />
                      <Button size="sm" variant="ghost" onClick={() => handleDuplicateTeam(t)}>
                        複製
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteTeam(t)}>
                        <span className="text-rose-400">削除</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 相手テンプレートセクション (プリセット + 保存済み) */}
        {loaded && (
          <section className="mb-10">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-200">相手テンプレート</h2>
              <span className="text-xs text-slate-600">
                想定相手の構築。プロジェクトの相手構築欄に「テンプレート読込」で適用できます。
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...PRESET_OPPONENT_TEAMS, ...opponentTeams].map((t) => {
                const tMode = BATTLE_MODES.find((m) => m.value === t.mode);
                const isPreset = t.id.startsWith("preset_");
                return (
                  <div
                    key={t.id}
                    className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700"
                  >
                    <button
                      onClick={() =>
                        isPreset
                          ? handleDuplicatePresetToLibrary(t)
                          : router.push(`/team/?id=${t.id}`)
                      }
                      className="flex-1 text-left"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 font-semibold text-slate-100 group-hover:text-white">
                          {t.name}
                        </h3>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {isPreset && (
                            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                              プリセット
                            </Badge>
                          )}
                          <Badge className="border-slate-700 bg-slate-800 text-slate-300">
                            {tMode?.label}
                          </Badge>
                          <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                            {getRegulation(t.regulation).label}
                          </Badge>
                        </div>
                      </div>
                      <TeamIcons team={t.pokemon} />
                      {!isPreset && (
                        <div className="mt-3 text-[11px] text-slate-500">
                          更新 {formatDate(t.updatedAt)}
                        </div>
                      )}
                    </button>
                    <div className="mt-3 flex items-center gap-1 border-t border-slate-800 pt-3">
                      {isPreset ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDuplicatePresetToLibrary(t)}
                        >
                          複製して編集
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => router.push(`/team/?id=${t.id}`)}>
                            編集
                          </Button>
                          <div className="flex-1" />
                          <Button size="sm" variant="ghost" onClick={() => handleDuplicateTeam(t)}>
                            複製
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTeam(t)}>
                            <span className="text-rose-400">削除</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {loaded && (projects.length > 0 || teams.length > 0) && (
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-200">シミュレーション</h2>
            <span className="text-xs text-slate-600">対戦分岐ツリーの検討（プロジェクト）</span>
          </div>
        )}

        {!loaded ? null : projects.length === 0 ? (
          <EmptyState
            title="まだプロジェクトがありません"
            description="「新規プロジェクト」から検討単位を作成し、構築6体と対戦分岐ツリーを記録できます。「マイ構築」を保存しておくと、同じ構築で複数のシミュレーションを素早く作れます。"
            action={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                + 最初のプロジェクトを作成
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const mode = BATTLE_MODES.find((m) => m.value === p.mode);
              const nodeCount = Object.keys(p.nodes).length;
              return (
                <div
                  key={p.id}
                  className="group flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700"
                >
                  <button
                    onClick={() => router.push(`/project/?id=${p.id}`)}
                    className="flex-1 text-left"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-semibold text-slate-100 group-hover:text-white">
                        {p.title}
                      </h3>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge className="border-slate-700 bg-slate-800 text-slate-300">
                          {mode?.label}
                        </Badge>
                        <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                          {getRegulation(p.regulation).label}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="mb-1 block text-[11px] text-slate-500">自分の構築</span>
                        <TeamIcons team={p.myTeam} />
                      </div>
                      <div>
                        <span className="mb-1 block text-[11px] text-slate-500">相手の想定構築</span>
                        <TeamIcons team={p.opponentTeam} />
                      </div>
                    </div>

                    {p.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <Badge key={t} className="border-sky-500/30 bg-sky-500/10 text-sky-300">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>ノード {nodeCount}</span>
                      <span>更新 {formatDate(p.updatedAt)}</span>
                      {teamName(p.sourceTeamId) && (
                        <span className="text-slate-600">元: {teamName(p.sourceTeamId)}</span>
                      )}
                    </div>
                  </button>

                  <div className="mt-3 flex items-center gap-1 border-t border-slate-800 pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/project/?id=${p.id}`)}
                    >
                      開く
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDuplicate(p)}>
                      複製
                    </Button>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(p)}>
                      <span className="text-rose-400">削除</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新規プロジェクト">
        <div className="space-y-4">
          <Field label="プロジェクト名" hint="（検討名）">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="例：メガガルーラ軸 vs 追い風スタン"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </Field>
          <Field label="対象ルール">
            <div className="flex gap-2">
              {BATTLE_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setNewMode(m.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    newMode === m.value
                      ? "border-blue-500 bg-blue-500/15 text-blue-200"
                      : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {m.label}
                  <span className="ml-1 text-xs text-slate-500">（{m.slots}体場）</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="レギュレーション">
            <div className="flex gap-2">
              {selectableRegulations().map((r) => (
                <button
                  key={r.id}
                  onClick={() => setNewRegulation(r.id)}
                  title={r.description}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    newRegulation === r.id
                      ? "border-blue-500 bg-blue-500/15 text-blue-200"
                      : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {r.label}
                  {r.status === "upcoming" && (
                    <span className="ml-1 text-xs text-amber-400/80">移行予定</span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {getRegulation(newRegulation).description}
            </p>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              作成して開く
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
