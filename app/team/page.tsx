"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Button, LinkButton, Field, EmptyState, Section } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { TeamGrid } from "@/components/team/TeamGrid";
import { getTeam, saveTeam, saveProject } from "@/lib/storage";
import { createProject } from "@/lib/factory";
import { BATTLE_MODES } from "@/lib/constants";
import { selectableRegulations, getRegulation } from "@/lib/regulations";
import type { BattleMode, PokemonSet, SavedTeam } from "@/lib/types";

function TeamEditorInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";

  const [team, setTeam] = useState<SavedTeam | null>(null);
  const [notFound, setNotFound] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // シミュレーション作成モーダル
  const [simOpen, setSimOpen] = useState(false);
  const [simTitle, setSimTitle] = useState("");
  const [simMode, setSimMode] = useState<BattleMode>("single");

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    const t = getTeam(id);
    if (!t) {
      setNotFound(true);
      return;
    }
    setTeam(t);
  }, [id]);

  // デバウンス保存
  useEffect(() => {
    if (!team) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveTeam(team), 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [team]);

  useEffect(() => {
    return () => {
      if (team) saveTeam(team);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (p: Partial<SavedTeam>) => setTeam((prev) => (prev ? { ...prev, ...p } : prev));

  const openSim = () => {
    if (!team) return;
    setSimTitle(`${team.name} vs `);
    setSimMode(team.mode);
    setSimOpen(true);
  };

  const createSim = () => {
    if (!team) return;
    const proj = createProject(
      simTitle.trim() || `${team.name} のシミュレーション`,
      simMode,
      team.regulation,
      { myTeam: team.pokemon, sourceTeamId: team.id }
    );
    saveProject(proj);
    router.push(`/project/?id=${proj.id}`);
  };

  if (notFound) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-2xl px-4 py-16">
          <EmptyState
            title="マイ構築が見つかりません"
            description="URLが正しくないか、このブラウザのローカル保存に該当データがありません。"
            action={<LinkButton href="/" variant="primary">ダッシュボードへ戻る</LinkButton>}
          />
        </main>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <div className="p-8 text-sm text-slate-500">読み込み中…</div>
      </div>
    );
  }

  const setPokemon = (pokemon: PokemonSet[]) => patch({ pokemon });

  return (
    <div className="min-h-screen">
      <TopBar subtitle={<span>マイ構築 / {team.name}</span>}>
        <Button size="sm" variant="ghost" onClick={() => router.push("/")}>
          ← ダッシュボード
        </Button>
        <Button size="sm" variant="primary" onClick={openSim}>
          この構築でシミュレーション作成
        </Button>
      </TopBar>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Section title="マイ構築の情報">
            <div className="space-y-4">
              <Field label="マイ構築名">
                <input
                  value={team.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="例：メガガルーラ軸スタン"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="既定の対戦形式">
                  <select
                    value={team.mode}
                    onChange={(e) => patch({ mode: e.target.value as BattleMode })}
                  >
                    {BATTLE_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="レギュレーション">
                  <select
                    value={team.regulation}
                    onChange={(e) => patch({ regulation: e.target.value })}
                  >
                    {selectableRegulations().map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName}
                        {r.status === "upcoming" ? "（移行予定）" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </Section>
          <Section title="構築メモ">
            <textarea
              value={team.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="この構築の狙い・調整意図・基本選出などを記述します。"
              className="min-h-[140px]"
            />
          </Section>
        </div>

        <TeamGrid
          team={team.pokemon}
          onChange={setPokemon}
          side="my"
          title="構築（6体）"
        />

        <p className="mt-6 text-xs text-slate-500">
          {getRegulation(team.regulation).label} のマイ構築。「この構築でシミュレーション作成」で、
          この6体を入れたシミュレーション（プロジェクト）を新規作成できます。
        </p>
      </main>

      <Modal open={simOpen} onClose={() => setSimOpen(false)} title="この構築でシミュレーション作成">
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            「{team.name}」の6体を自分の構築としてコピーした新しいシミュレーションを作成します。
            相手の構築や対戦分岐は、作成後に入力します。
          </p>
          <Field label="シミュレーション名">
            <input
              autoFocus
              value={simTitle}
              onChange={(e) => setSimTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createSim();
              }}
              placeholder="例：メガガルーラ軸 vs 追い風スタン"
            />
          </Field>
          <Field label="対戦形式">
            <div className="flex gap-2">
              {BATTLE_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setSimMode(m.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    simMode === m.value
                      ? "border-blue-500 bg-blue-500/15 text-blue-200"
                      : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSimOpen(false)}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={createSim}>
              作成して開く
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">読み込み中…</div>}>
      <TeamEditorInner />
    </Suspense>
  );
}
