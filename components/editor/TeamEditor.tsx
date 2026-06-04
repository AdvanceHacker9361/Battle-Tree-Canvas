"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Badge } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { TeamGrid } from "@/components/team/TeamGrid";
import { createSavedTeam, clonePokemonTeam } from "@/lib/factory";
import { saveTeam, listTeams } from "@/lib/storage";
import { PRESET_OPPONENT_TEAMS } from "@/lib/presetTemplates";
import { getRegulation } from "@/lib/regulations";
import { BATTLE_MODES } from "@/lib/constants";
import type { PokemonSet, SavedTeam } from "@/lib/types";
import { useEditor } from "./EditorContext";

function SaveAsTeamButton() {
  const { project } = useEditor();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const openModal = () => {
    setName(project.title || "マイ構築");
    setSavedId(null);
    setOpen(true);
  };

  const handleSave = () => {
    const team = createSavedTeam(
      name.trim() || "無題のマイ構築",
      project.mode,
      project.regulation,
      project.myTeam
    );
    saveTeam(team);
    setSavedId(team.id);
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={openModal}>
        マイ構築として保存
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="マイ構築として保存">
        {savedId ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              現在の自分の構築を「マイ構築」として保存しました。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                閉じる
              </Button>
              <Button variant="primary" onClick={() => router.push(`/team/?id=${savedId}`)}>
                マイ構築を開く
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              現在の自分の構築6体を再利用可能な「マイ構築」として保存します。
              保存した構築からは、いつでも新しいシミュレーションを作成できます。
            </p>
            <Field label="マイ構築名">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                placeholder="例：メガガルーラ軸スタン"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={handleSave}>
                保存
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function LoadOpponentTemplateButton({
  onApply,
}: {
  onApply: (team: PokemonSet[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const saved = open ? listTeams().filter((t) => t.kind === "opponent") : [];
  const templates: SavedTeam[] = [...PRESET_OPPONENT_TEAMS, ...saved];

  const apply = (t: SavedTeam) => {
    onApply(clonePokemonTeam(t.pokemon));
    setOpen(false);
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        テンプレート読込
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="相手テンプレートを読み込む" width="max-w-xl">
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            選んだテンプレートの6体を、相手の想定構築としてコピーします（現在の相手構築は置き換わります）。
          </p>
          {templates.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-600">
              利用できる相手テンプレートがありません。
            </p>
          ) : (
            <ul className="space-y-1.5">
              {templates.map((t) => {
                const isPreset = t.id.startsWith("preset_");
                const mons = t.pokemon.filter((m) => m.species.trim()).map((m) => m.species);
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-slate-200">{t.name}</span>
                        {isPreset && (
                          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                            プリセット
                          </Badge>
                        )}
                        <Badge className="border-slate-700 bg-slate-800 text-slate-400">
                          {BATTLE_MODES.find((m) => m.value === t.mode)?.label}
                        </Badge>
                        <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                          {getRegulation(t.regulation).label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">
                        {mons.join(" / ") || "（未入力）"}
                      </div>
                    </div>
                    <Button size="sm" variant="primary" onClick={() => apply(t)}>
                      読み込む
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}

export function TeamEditor() {
  const { project, mutate, readOnly } = useEditor();

  const setMyTeam = (team: PokemonSet[]) =>
    mutate((p) => ({ ...p, myTeam: team }));
  const setOppTeam = (team: PokemonSet[]) =>
    mutate((p) => ({ ...p, opponentTeam: team }));

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <TeamGrid
        team={project.myTeam}
        onChange={setMyTeam}
        readOnly={readOnly}
        side="my"
        title="自分の構築（6体）"
        headerRight={!readOnly ? <SaveAsTeamButton /> : undefined}
      />
      <TeamGrid
        team={project.opponentTeam}
        onChange={setOppTeam}
        readOnly={readOnly}
        side="opp"
        title="相手の想定構築（6体）"
        headerRight={
          !readOnly ? <LoadOpponentTemplateButton onApply={setOppTeam} /> : undefined
        }
      />
    </div>
  );
}
