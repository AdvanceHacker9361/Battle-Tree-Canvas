"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { TeamGrid } from "@/components/team/TeamGrid";
import { createSavedTeam } from "@/lib/factory";
import { saveTeam } from "@/lib/storage";
import type { PokemonSet } from "@/lib/types";
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
      />
    </div>
  );
}
