"use client";

import { useState } from "react";
import { Field, Button, Badge } from "@/components/ui";
import {
  LINE_TAGS,
  RISK_COLORS,
  ACTION_TYPES,
  INFO_NOTE_TYPES,
  MEGA_ROLE_MAP,
  MEGA_DEPENDENCY_OPTIONS,
  NON_MEGA_AUTONOMY_OPTIONS,
} from "@/lib/constants";
import { emptyDamageNote, uid } from "@/lib/factory";
import { updateNode } from "@/lib/tree";
import { parseDamageText, matchRosterId, type ParsedDamage } from "@/lib/damageParse";
import type {
  ActionRecord,
  DamageNote,
  InformationNote,
  PokemonSet,
  RouteEvaluation,
  TurnNode,
} from "@/lib/types";
import { useEditor, useSelectedNode } from "./EditorContext";

function Collapsible({
  title,
  defaultOpen = true,
  right,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-slate-800/40"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
          <span className={`text-slate-600 transition-transform ${open ? "rotate-90" : ""}`}>
            ▶
          </span>
          {title}
        </span>
        {right}
      </button>
      {open && <div className="px-3 pb-4">{children}</div>}
    </div>
  );
}

function ActionEditor({
  node,
  side,
  team,
}: {
  node: TurnNode;
  side: "myAction" | "opponentAction";
  team: PokemonSet[];
}) {
  const { mutate, readOnly } = useEditor();
  const action = node[side];
  const named = team.filter((m) => m.species.trim());

  const patch = (p: Partial<ActionRecord>) => {
    mutate((proj) => {
      const current = proj.nodes[node.id][side] ?? {
        side: side === "myAction" ? "me" : "opponent",
        actionType: "move",
      };
      return updateNode(proj, node.id, { [side]: { ...current, ...p } } as Partial<TurnNode>);
    });
  };

  const a: ActionRecord =
    action ?? { side: side === "myAction" ? "me" : "opponent", actionType: "move" };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={a.pokemonSetId ?? ""}
          disabled={readOnly}
          onChange={(e) => patch({ pokemonSetId: e.target.value })}
          className="!py-1 !text-xs"
        >
          <option value="">— 行動するポケモン —</option>
          {named.map((m) => (
            <option key={m.id} value={m.id}>
              {m.species}
            </option>
          ))}
        </select>
        <select
          value={a.actionType}
          disabled={readOnly}
          onChange={(e) => patch({ actionType: e.target.value as ActionRecord["actionType"] })}
          className="!py-1 !text-xs"
        >
          {ACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {a.actionType === "switch" ? (
        <select
          value={a.switchToPokemonSetId ?? ""}
          disabled={readOnly}
          onChange={(e) => patch({ switchToPokemonSetId: e.target.value })}
          className="!py-1 !text-xs"
        >
          <option value="">— 交代先 —</option>
          {named.map((m) => (
            <option key={m.id} value={m.id}>
              {m.species}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={a.moveName ?? ""}
          disabled={readOnly}
          onChange={(e) => patch({ moveName: e.target.value })}
          placeholder="技名 / 行動内容"
          className="!py-1 !text-xs"
        />
      )}
      <input
        value={a.note ?? ""}
        disabled={readOnly}
        onChange={(e) => patch({ note: e.target.value })}
        placeholder="補足（対象・読みなど）"
        className="!py-1 !text-xs"
      />
    </div>
  );
}

// 盤面上で指定ポケモンが立っているスロットを探す。
function findActiveSlot(
  node: TurnNode,
  setId: string
): { side: "myActive" | "opponentActive"; index: number } | null {
  if (!setId) return null;
  const sides: ("myActive" | "opponentActive")[] = ["myActive", "opponentActive"];
  for (const side of sides) {
    const idx = node.boardState[side].findIndex((a) => a.pokemonSetId === setId);
    if (idx >= 0) return { side, index: idx };
  }
  return null;
}

function clampHp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

// Phase 4: ダメ計コピペ解析パネル
function DamagePastePanel({ node }: { node: TurnNode }) {
  const { project, mutate } = useEditor();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedDamage[] | null>(null);
  const roster = [...project.myTeam, ...project.opponentTeam];
  const nameOf = (id: string) => roster.find((m) => m.id === id)?.species ?? "";

  const resolved = (parsed ?? []).map((p) => ({
    p,
    attackerId: matchRosterId(p.attackerName, roster) ?? "",
    defenderId: matchRosterId(p.defenderName, roster) ?? "",
  }));

  const handleParse = () => setParsed(parseDamageText(text));

  const addAll = () => {
    if (!resolved.length) return;
    const newNotes: DamageNote[] = resolved.map(({ p, attackerId, defenderId }) => {
      const note = emptyDamageNote();
      note.attackerId = attackerId;
      note.defenderId = defenderId;
      note.moveName = p.moveName ?? "";
      note.damageMinPercent = p.damageMinPercent;
      note.damageMaxPercent = p.damageMaxPercent;
      note.koText = p.koText ?? "";
      if (p.inPriorityRange) note.inPriorityRange = true;
      if (p.inScarfRange) note.inScarfRange = true;
      note.calcText = p.raw;
      return note;
    });
    mutate((pj) =>
      updateNode(pj, node.id, {
        damageNotes: [...pj.nodes[node.id].damageNotes, ...newNotes],
      })
    );
    setText("");
    setParsed(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        📋 ダメ計を貼り付けて解析
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-blue-200">ダメ計コピペ解析</span>
        <button
          onClick={() => {
            setOpen(false);
            setParsed(null);
          }}
          className="text-[11px] text-slate-500 hover:text-slate-300"
        >
          閉じる
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "外部ダメ計の結果を貼り付け（複数行可）。例：\nサンダー@チョッキ 10まんボルト → メガガルーラ 50.8〜60.1% 確定2発\nすてみタックル → HBサンダー 42.3〜50.8% 乱数2発"
        }
        className="min-h-[72px] !text-xs"
      />
      <div className="mt-1.5 flex gap-2">
        <Button size="sm" variant="secondary" onClick={handleParse} disabled={!text.trim()}>
          解析
        </Button>
        {parsed && resolved.length > 0 && (
          <Button size="sm" variant="primary" onClick={addAll}>
            {resolved.length}件をメモに追加
          </Button>
        )}
      </div>

      {parsed && (
        <div className="mt-2 space-y-1.5">
          {resolved.length === 0 ? (
            <p className="text-[11px] text-amber-300">
              %範囲を検出できませんでした。テキストを確認してください。
            </p>
          ) : (
            resolved.map(({ p, attackerId, defenderId }, i) => (
              <div
                key={i}
                className="rounded bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-300"
              >
                <div className="flex flex-wrap items-center gap-x-1.5">
                  <span className={attackerId ? "text-sky-300" : "text-slate-500"}>
                    {attackerId ? nameOf(attackerId) : p.attackerName ?? "攻撃側?"}
                  </span>
                  {p.moveName && <span className="text-slate-400">{p.moveName}</span>}
                  <span className="text-slate-600">→</span>
                  <span className={defenderId ? "text-rose-300" : "text-slate-500"}>
                    {defenderId ? nameOf(defenderId) : p.defenderName ?? "防御側?"}
                  </span>
                  {p.damageMinPercent != null && (
                    <span className="font-medium text-slate-200">
                      {p.damageMinPercent}〜{p.damageMaxPercent}%
                    </span>
                  )}
                  {p.koText && <span className="text-amber-300">{p.koText}</span>}
                  {p.inPriorityRange && <span className="text-violet-300">先制圏内</span>}
                  {p.inScarfRange && <span className="text-violet-300">スカーフ圏内</span>}
                </div>
                {((p.attackerName && !attackerId) ||
                  (p.defenderName && !defenderId)) && (
                  <div className="mt-0.5 text-[10px] text-slate-600">
                    ※ 構築と自動照合できなかった名前は、追加後にメモ内のプルダウンで指定してください。
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DamageNoteCard({ node, d }: { node: TurnNode; d: DamageNote }) {
  const { project, mutate, readOnly } = useEditor();
  const allMons = [...project.myTeam, ...project.opponentTeam].filter((m) =>
    m.species.trim()
  );
  const nameOf = (id: string) => allMons.find((m) => m.id === id)?.species ?? "";

  const patch = (dp: Partial<DamageNote>) => {
    mutate((p) =>
      updateNode(p, node.id, {
        damageNotes: p.nodes[node.id].damageNotes.map((x) =>
          x.id === d.id ? { ...x, ...dp } : x
        ),
      })
    );
  };
  const remove = () => {
    mutate((p) =>
      updateNode(p, node.id, {
        damageNotes: p.nodes[node.id].damageNotes.filter((x) => x.id !== d.id),
      })
    );
  };

  // HP%半自動反映: 防御側が盤面にいれば、現在HPからダメージ%を引く。
  const slot = findActiveSlot(node, d.defenderId);
  const applyDamage = (percent?: number) => {
    if (percent == null || !slot) return;
    mutate((p) => {
      const cur = p.nodes[node.id];
      const arr = [...cur.boardState[slot.side]];
      arr[slot.index] = {
        ...arr[slot.index],
        hpPercent: clampHp(arr[slot.index].hpPercent - percent),
      };
      const notes = cur.damageNotes.map((x) =>
        x.id === d.id ? { ...x, actualDamagePercent: percent } : x
      );
      return updateNode(p, node.id, {
        boardState: { ...cur.boardState, [slot.side]: arr },
        damageNotes: notes,
      });
    });
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs">
        <select
          value={d.attackerId}
          disabled={readOnly}
          onChange={(e) => patch({ attackerId: e.target.value })}
          className="!py-0.5 !text-xs"
        >
          <option value="">攻撃側</option>
          {allMons.map((m) => (
            <option key={m.id} value={m.id}>
              {m.species}
            </option>
          ))}
        </select>
        <span className="text-slate-600">→</span>
        <select
          value={d.defenderId}
          disabled={readOnly}
          onChange={(e) => patch({ defenderId: e.target.value })}
          className="!py-0.5 !text-xs"
        >
          <option value="">防御側</option>
          {allMons.map((m) => (
            <option key={m.id} value={m.id}>
              {m.species}
            </option>
          ))}
        </select>
      </div>
      <input
        value={d.moveName}
        disabled={readOnly}
        onChange={(e) => patch({ moveName: e.target.value })}
        placeholder="技名"
        className="mb-1.5 !py-0.5 !text-xs"
      />
      <div className="mb-1.5 grid grid-cols-3 gap-1.5">
        <NumPercent label="最小%" value={d.damageMinPercent} readOnly={readOnly} onChange={(v) => patch({ damageMinPercent: v })} />
        <NumPercent label="最大%" value={d.damageMaxPercent} readOnly={readOnly} onChange={(v) => patch({ damageMaxPercent: v })} />
        <NumPercent label="想定%" value={d.actualDamagePercent} readOnly={readOnly} onChange={(v) => patch({ actualDamagePercent: v })} />
      </div>

      {/* HP%半自動反映 */}
      {!readOnly && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500">HPに反映:</span>
          <button
            disabled={!slot || d.damageMinPercent == null}
            onClick={() => applyDamage(d.damageMinPercent)}
            title={slot ? `防御側のHPから ${d.damageMinPercent}% を引く` : "防御側が盤面にいません"}
            className="rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-[11px] text-slate-300 hover:border-slate-600 disabled:opacity-30"
          >
            最小
          </button>
          <button
            disabled={!slot || d.damageMaxPercent == null}
            onClick={() => applyDamage(d.damageMaxPercent)}
            title={slot ? `防御側のHPから ${d.damageMaxPercent}% を引く` : "防御側が盤面にいません"}
            className="rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-[11px] text-slate-300 hover:border-slate-600 disabled:opacity-30"
          >
            最大
          </button>
          {slot && (
            <span className="text-[10px] text-slate-600">
              現在 {node.boardState[slot.side][slot.index].hpPercent}%
            </span>
          )}
        </div>
      )}

      {/* 確定数メモ + 圏内フラグ */}
      <input
        value={d.koText ?? ""}
        disabled={readOnly}
        onChange={(e) => patch({ koText: e.target.value })}
        placeholder="確定数（例：確定2発 / 乱数1発 (87.5%)）"
        className="mb-1.5 !py-0.5 !text-xs"
      />
      {!readOnly ? (
        <div className="mb-1.5 flex gap-1.5">
          <button
            onClick={() => patch({ inPriorityRange: !d.inPriorityRange })}
            className={`rounded border px-2 py-0.5 text-[11px] ${
              d.inPriorityRange
                ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
            }`}
          >
            先制技圏内
          </button>
          <button
            onClick={() => patch({ inScarfRange: !d.inScarfRange })}
            className={`rounded border px-2 py-0.5 text-[11px] ${
              d.inScarfRange
                ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
            }`}
          >
            スカーフ圏内
          </button>
        </div>
      ) : (
        (d.inPriorityRange || d.inScarfRange) && (
          <div className="mb-1.5 flex gap-1.5">
            {d.inPriorityRange && (
              <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">先制技圏内</Badge>
            )}
            {d.inScarfRange && (
              <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">スカーフ圏内</Badge>
            )}
          </div>
        )
      )}

      <textarea
        value={d.calcText ?? ""}
        disabled={readOnly}
        onChange={(e) => patch({ calcText: e.target.value })}
        placeholder="ダメ計結果の貼り付け（例：すてみタックル → HBサンダー 42.3〜50.8%）"
        className="mb-1.5 min-h-[40px] !text-xs"
      />
      <input
        value={d.note ?? ""}
        disabled={readOnly}
        onChange={(e) => patch({ note: e.target.value })}
        placeholder="備考（反動・急所・補正など）"
        className="!py-0.5 !text-xs"
      />
      {(d.attackerId || d.defenderId) && (
        <div className="mt-1.5 text-[11px] text-slate-500">
          {nameOf(d.attackerId)} → {nameOf(d.defenderId)}
          {d.damageMinPercent != null && d.damageMaxPercent != null && (
            <span className="ml-1 text-slate-400">
              {d.damageMinPercent}〜{d.damageMaxPercent}%
            </span>
          )}
          {d.koText && <span className="ml-1 text-amber-300/80">{d.koText}</span>}
        </div>
      )}
      {!readOnly && (
        <div className="mt-2 flex justify-end">
          <button onClick={remove} className="text-[11px] text-slate-500 hover:text-rose-400">
            このダメージメモを削除
          </button>
        </div>
      )}
    </div>
  );
}

function DamageNotesEditor({ node }: { node: TurnNode }) {
  const { mutate, readOnly } = useEditor();

  const add = () => {
    mutate((p) =>
      updateNode(p, node.id, {
        damageNotes: [...p.nodes[node.id].damageNotes, emptyDamageNote()],
      })
    );
  };

  return (
    <div className="space-y-3">
      {!readOnly && <DamagePastePanel node={node} />}
      {node.damageNotes.length === 0 && (
        <p className="text-xs text-slate-600">
          外部ダメージ計算ツールの結果を貼り付けて解析するか、手入力で記録できます。
        </p>
      )}
      {node.damageNotes.map((d) => (
        <DamageNoteCard key={d.id} node={node} d={d} />
      ))}
      {!readOnly && (
        <Button size="sm" variant="secondary" className="w-full" onClick={add}>
          + 空のダメージメモを追加
        </Button>
      )}
    </div>
  );
}

function NumPercent({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  readOnly: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-slate-500">{label}</span>
      <input
        type="number"
        min={0}
        disabled={readOnly}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="!py-0.5 !text-right !text-xs"
      />
    </label>
  );
}

function InfoNotesEditor({ node }: { node: TurnNode }) {
  const { mutate, readOnly } = useEditor();
  const add = () => {
    const note: InformationNote = { id: uid("i"), type: "other", note: "" };
    mutate((p) =>
      updateNode(p, node.id, {
        informationNotes: [...p.nodes[node.id].informationNotes, note],
      })
    );
  };
  const patch = (id: string, ip: Partial<InformationNote>) => {
    mutate((p) =>
      updateNode(p, node.id, {
        informationNotes: p.nodes[node.id].informationNotes.map((n) =>
          n.id === id ? { ...n, ...ip } : n
        ),
      })
    );
  };
  const remove = (id: string) => {
    mutate((p) =>
      updateNode(p, node.id, {
        informationNotes: p.nodes[node.id].informationNotes.filter((n) => n.id !== id),
      })
    );
  };
  return (
    <div className="space-y-2">
      {node.informationNotes.length === 0 && (
        <p className="text-xs text-slate-600">
          持ち物判明・S関係・こだわり拘束などの判明情報を記録します。
        </p>
      )}
      {node.informationNotes.map((n) => (
        <div key={n.id} className="flex items-start gap-1.5">
          <select
            value={n.type}
            disabled={readOnly}
            onChange={(e) => patch(n.id, { type: e.target.value as InformationNote["type"] })}
            className="!w-28 shrink-0 !py-1 !text-xs"
          >
            {INFO_NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            value={n.note}
            disabled={readOnly}
            onChange={(e) => patch(n.id, { note: e.target.value })}
            placeholder="内容"
            className="!py-1 !text-xs"
          />
          {!readOnly && (
            <button
              onClick={() => remove(n.id)}
              className="shrink-0 px-1 py-1 text-slate-500 hover:text-rose-400"
              aria-label="削除"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button size="sm" variant="secondary" className="w-full" onClick={add}>
          + 判明情報メモを追加
        </Button>
      )}
    </div>
  );
}

function RouteEvalEditor({ node }: { node: TurnNode }) {
  const { mutate, readOnly } = useEditor();
  const ev = node.routeEvaluation;

  const patch = (p: Partial<RouteEvaluation>) => {
    mutate((proj) => {
      const current = proj.nodes[node.id].routeEvaluation ?? {};
      return updateNode(proj, node.id, { routeEvaluation: { ...current, ...p } });
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="メガ依存度">
          <select
            value={ev?.megaDependency ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              patch({ megaDependency: (e.target.value || undefined) as RouteEvaluation["megaDependency"] })
            }
            className="!py-1 !text-xs"
          >
            <option value="">—</option>
            {MEGA_DEPENDENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="非メガ自立性">
          <select
            value={ev?.nonMegaAutonomy ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              patch({ nonMegaAutonomy: (e.target.value || undefined) as RouteEvaluation["nonMegaAutonomy"] })
            }
            className="!py-1 !text-xs"
          >
            <option value="">—</option>
            {NON_MEGA_AUTONOMY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          disabled={readOnly}
          checked={!!ev?.secondLineExists}
          onChange={(e) => patch({ secondLineExists: e.target.checked })}
          className="!h-4 !w-4 accent-blue-500"
        />
        第2軸あり
      </label>
      <Field label="メガ不選出時の勝ち筋">
        <textarea
          value={ev?.nonMegaWinCondition ?? ""}
          disabled={readOnly}
          onChange={(e) => patch({ nonMegaWinCondition: e.target.value })}
          className="min-h-[40px] !text-xs"
        />
      </Field>
      <Field label="メガが止まる負け筋">
        <textarea
          value={ev?.collapseReason ?? ""}
          disabled={readOnly}
          onChange={(e) => patch({ collapseReason: e.target.value })}
          className="min-h-[40px] !text-xs"
        />
      </Field>
    </div>
  );
}

export function NodeDetail() {
  const { project, mutate, readOnly } = useEditor();
  const node = useSelectedNode();
  if (!node) return null;

  const patch = (p: Partial<TurnNode>) => mutate((proj) => updateNode(proj, node.id, p));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          詳細編集
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* 基本 */}
        <div className="space-y-3 border-b border-slate-800 px-3 py-3">
          <Field label="ノード名">
            <input
              value={node.title}
              disabled={readOnly}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="例：初手とんぼ返り / 中盤の詰め"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="ターン番号">
              <input
                type="number"
                min={1}
                disabled={readOnly}
                value={node.turnNumber}
                onChange={(e) => patch({ turnNumber: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Field>
          </div>

          <Field label="勝ち筋ラベル">
            <div className="flex flex-wrap gap-1">
              {LINE_TAGS.map((t) => (
                <button
                  key={t.value}
                  disabled={readOnly}
                  title={t.meaning}
                  onClick={() => patch({ lineTag: t.value })}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    node.lineTag === t.value
                      ? "border-blue-500 bg-blue-500/15 text-blue-200"
                      : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="リスク色">
            <div className="flex flex-wrap gap-1.5">
              {RISK_COLORS.map((c) => (
                <button
                  key={c.value}
                  disabled={readOnly}
                  title={c.meaning}
                  onClick={() => patch({ riskColor: c.value })}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    node.riskColor === c.value
                      ? "border-slate-500 bg-slate-800 text-slate-100"
                      : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* 行動 */}
        <Collapsible title="想定行動">
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-sky-300">自分の想定行動</div>
              <ActionEditor node={node} side="myAction" team={project.myTeam} />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-rose-300">相手の想定行動</div>
              <ActionEditor node={node} side="opponentAction" team={project.opponentTeam} />
            </div>
          </div>
        </Collapsible>

        {/* ダメージメモ */}
        <Collapsible
          title="ダメージメモ"
          right={
            node.damageNotes.length > 0 ? (
              <Badge className="border-slate-700 bg-slate-800 text-slate-300">
                {node.damageNotes.length}
              </Badge>
            ) : null
          }
        >
          <DamageNotesEditor node={node} />
        </Collapsible>

        {/* ルート評価 */}
        <Collapsible title="ルート評価（メガ依存度）" defaultOpen={false}>
          <RouteEvalEditor node={node} />
        </Collapsible>

        {/* 判明情報 */}
        <Collapsible
          title="判明情報メモ"
          defaultOpen={false}
          right={
            node.informationNotes.length > 0 ? (
              <Badge className="border-slate-700 bg-slate-800 text-slate-300">
                {node.informationNotes.length}
              </Badge>
            ) : null
          }
        >
          <InfoNotesEditor node={node} />
        </Collapsible>

        {/* 自由コメント */}
        <Collapsible title="自由コメント">
          <textarea
            value={node.comment ?? ""}
            disabled={readOnly}
            onChange={(e) => patch({ comment: e.target.value })}
            placeholder="この局面の自由メモ"
            className="min-h-[80px] !text-sm"
          />
        </Collapsible>

        <MegaRoleHint />
      </div>
    </div>
  );
}

function MegaRoleHint() {
  const { project } = useEditor();
  const megas = project.myTeam.filter((m) => m.isMegaCandidate && m.megaRole);
  if (megas.length === 0) return null;
  return (
    <div className="px-3 py-3">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        メガ運用分類
      </div>
      <div className="space-y-1">
        {megas.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-xs">
            <span className="text-slate-300">{m.species}</span>
            <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">
              {MEGA_ROLE_MAP[m.megaRole!].label}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
