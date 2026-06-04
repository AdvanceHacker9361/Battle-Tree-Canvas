"use client";

import { useState } from "react";
import { Section, Field, Badge, Button } from "@/components/ui";
import { BATTLE_MODES } from "@/lib/constants";
import { selectableRegulations, getRegulation } from "@/lib/regulations";
import { useEditor } from "./EditorContext";

function TagEditor() {
  const { project, mutate, readOnly } = useEditor();
  const [input, setInput] = useState("");

  const addTag = () => {
    const t = input.trim().replace(/^#/, "");
    if (!t) return;
    if (project.tags.includes(t)) {
      setInput("");
      return;
    }
    mutate((p) => ({ ...p, tags: [...p.tags, t] }));
    setInput("");
  };

  const removeTag = (tag: string) => {
    mutate((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {project.tags.length === 0 && (
          <span className="text-xs text-slate-600">タグ未設定</span>
        )}
        {project.tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-xs text-sky-300"
          >
            #{t}
            {!readOnly && (
              <button
                onClick={() => removeTag(t)}
                className="text-sky-400/60 hover:text-sky-200"
                aria-label="タグ削除"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="例：対面 / 受け / 追い風 / トリル"
          />
          <Button size="sm" variant="secondary" onClick={addTag}>
            追加
          </Button>
        </div>
      )}
    </div>
  );
}

export function OverviewEditor() {
  const { project, mutate, readOnly } = useEditor();
  const mode = BATTLE_MODES.find((m) => m.value === project.mode);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Section title="プロジェクト情報">
        <div className="space-y-4">
          <Field label="タイトル">
            <input
              value={project.title}
              disabled={readOnly}
              onChange={(e) => mutate((p) => ({ ...p, title: e.target.value }))}
              placeholder="例：メガガルーラ軸 vs 追い風スタン"
            />
          </Field>
          <Field label="対象ルール">
            <div className="flex items-center gap-2">
              <Badge className="border-slate-700 bg-slate-800 text-slate-200">
                {mode?.label}（{mode?.slots}体場）
              </Badge>
              <span className="text-xs text-slate-600">
                作成後の変更不可（盤面スロット数に影響するため）
              </span>
            </div>
          </Field>
          <Field label="レギュレーション" hint="（環境移行時に切り替え可）">
            <select
              value={project.regulation}
              disabled={readOnly}
              onChange={(e) => mutate((p) => ({ ...p, regulation: e.target.value }))}
            >
              {selectableRegulations().map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                  {r.status === "upcoming" ? "（移行予定）" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              {getRegulation(project.regulation).focusNote}
            </p>
          </Field>
          <Field label="タグ" hint="（対面・受け・追い風・トリル など）">
            <TagEditor />
          </Field>
        </div>
      </Section>

      <Section title="構築意図・検討目的メモ">
        <textarea
          value={project.projectNotes ?? ""}
          disabled={readOnly}
          onChange={(e) => mutate((p) => ({ ...p, projectNotes: e.target.value }))}
          placeholder="この構築の狙い、検討したい相手、確認したい分岐などを自由に記述します。"
          className="min-h-[200px]"
        />
      </Section>
    </div>
  );
}
