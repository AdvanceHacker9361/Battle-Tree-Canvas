"use client";

import { Field, Badge } from "@/components/ui";
import {
  STATUSES,
  STATUS_MAP,
  COMMON_WEATHERS,
  COMMON_TERRAINS,
  COMMON_HAZARDS,
  COMMON_SCREENS,
} from "@/lib/constants";
import { updateNode } from "@/lib/tree";
import type {
  ActivePokemon,
  BoardState,
  FieldState,
  PokemonSet,
  TurnNode,
} from "@/lib/types";
import { useEditor, useSelectedNode } from "./EditorContext";

function hpBarColor(hp: number): string {
  if (hp <= 0) return "bg-slate-600";
  if (hp <= 25) return "bg-rose-500";
  if (hp <= 50) return "bg-amber-400";
  return "bg-emerald-500";
}

function HpBar({ hp }: { hp: number }) {
  const clamped = Math.max(0, Math.min(100, hp));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className={`h-full rounded-full transition-all ${hpBarColor(clamped)}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function ActiveSlot({
  node,
  side,
  index,
  team,
}: {
  node: TurnNode;
  side: "myActive" | "opponentActive";
  index: number;
  team: PokemonSet[];
}) {
  const { mutate, readOnly } = useEditor();
  const slot = node.boardState[side][index];
  const selectedMon = team.find((m) => m.id === slot.pokemonSetId);

  const patchSlot = (patch: Partial<ActivePokemon>) => {
    mutate((p) => {
      const current = p.nodes[node.id];
      const arr = [...current.boardState[side]];
      arr[index] = { ...arr[index], ...patch };
      return updateNode(p, node.id, {
        boardState: { ...current.boardState, [side]: arr },
      });
    });
  };

  const namedTeam = team.filter((m) => m.species.trim());

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
      <div className="flex items-center gap-2">
        <select
          value={slot.pokemonSetId}
          disabled={readOnly}
          onChange={(e) => patchSlot({ pokemonSetId: e.target.value })}
          className="!py-1 !text-xs"
        >
          <option value="">— 未選択 —</option>
          {namedTeam.map((m) => (
            <option key={m.id} value={m.id}>
              {m.species}
              {m.isMegaCandidate ? "（メガ候補）" : ""}
            </option>
          ))}
        </select>
        {selectedMon?.isMegaCandidate && (
          <label
            title="メガ進化済み"
            className={`flex cursor-pointer items-center gap-1 whitespace-nowrap rounded px-1.5 py-1 text-[11px] ${
              slot.isMegaEvolved
                ? "bg-violet-500/20 text-violet-200"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            <input
              type="checkbox"
              disabled={readOnly}
              checked={!!slot.isMegaEvolved}
              onChange={(e) => patchSlot({ isMegaEvolved: e.target.checked })}
              className="!h-3.5 !w-3.5 accent-violet-500"
            />
            メガ
          </label>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <HpBar hp={slot.hpPercent} />
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            disabled={readOnly}
            value={slot.hpPercent}
            onChange={(e) =>
              patchSlot({ hpPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
            }
            className="!w-14 !py-0.5 !text-right !text-xs"
          />
          <span className="text-[11px] text-slate-500">%</span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <select
          value={slot.status ?? "none"}
          disabled={readOnly}
          onChange={(e) => patchSlot({ status: e.target.value as ActivePokemon["status"] })}
          className="!py-0.5 !text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {slot.status && slot.status !== "none" && (
          <Badge className={`shrink-0 border-transparent ${STATUS_MAP[slot.status].chip}`}>
            {STATUS_MAP[slot.status].short}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ChipToggleGroup({
  options,
  selected,
  onChange,
  readOnly,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  readOnly: boolean;
}) {
  const toggle = (opt: string) => {
    if (readOnly) return;
    onChange(
      selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]
    );
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            disabled={readOnly}
            className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
              on
                ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
                : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FieldEditor({ node }: { node: TurnNode }) {
  const { mutate, readOnly } = useEditor();
  const field = node.boardState.field;

  const patchField = (patch: Partial<FieldState>) => {
    mutate((p) => {
      const current = p.nodes[node.id];
      const board: BoardState = {
        ...current.boardState,
        field: { ...current.boardState.field, ...patch },
      };
      return updateNode(p, node.id, { boardState: board });
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="天候">
          <select
            value={field.weather ?? ""}
            disabled={readOnly}
            onChange={(e) => patchField({ weather: e.target.value })}
            className="!py-1 !text-xs"
          >
            <option value="">なし</option>
            {COMMON_WEATHERS.filter((w) => w !== "なし").map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
        <Field label="フィールド">
          <select
            value={field.terrain ?? ""}
            disabled={readOnly}
            onChange={(e) => patchField({ terrain: e.target.value })}
            className="!py-1 !text-xs"
          >
            <option value="">なし</option>
            {COMMON_TERRAINS.filter((t) => t !== "なし").map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="トリル残り">
          <input
            type="number"
            min={0}
            disabled={readOnly}
            value={field.trickRoomTurns ?? 0}
            onChange={(e) => patchField({ trickRoomTurns: Number(e.target.value) || 0 })}
            className="!py-1 !text-xs"
          />
        </Field>
        <Field label="追い風(自分)">
          <input
            type="number"
            min={0}
            disabled={readOnly}
            value={field.tailwindMyTurns ?? 0}
            onChange={(e) => patchField({ tailwindMyTurns: Number(e.target.value) || 0 })}
            className="!py-1 !text-xs"
          />
        </Field>
        <Field label="追い風(相手)">
          <input
            type="number"
            min={0}
            disabled={readOnly}
            value={field.tailwindOpponentTurns ?? 0}
            onChange={(e) =>
              patchField({ tailwindOpponentTurns: Number(e.target.value) || 0 })
            }
            className="!py-1 !text-xs"
          />
        </Field>
      </div>

      <Field label="壁（自分）">
        <ChipToggleGroup
          options={COMMON_SCREENS}
          selected={field.screensMy ?? []}
          onChange={(v) => patchField({ screensMy: v })}
          readOnly={readOnly}
        />
      </Field>
      <Field label="壁（相手）">
        <ChipToggleGroup
          options={COMMON_SCREENS}
          selected={field.screensOpponent ?? []}
          onChange={(v) => patchField({ screensOpponent: v })}
          readOnly={readOnly}
        />
      </Field>
      <Field label="設置（自分側）">
        <ChipToggleGroup
          options={COMMON_HAZARDS}
          selected={field.hazardsMy ?? []}
          onChange={(v) => patchField({ hazardsMy: v })}
          readOnly={readOnly}
        />
      </Field>
      <Field label="設置（相手側）">
        <ChipToggleGroup
          options={COMMON_HAZARDS}
          selected={field.hazardsOpponent ?? []}
          onChange={(v) => patchField({ hazardsOpponent: v })}
          readOnly={readOnly}
        />
      </Field>
    </div>
  );
}

export function BoardEditor() {
  const { project } = useEditor();
  const node = useSelectedNode();
  if (!node) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          盤面（{node.title}）
        </h3>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div>
          <div className="mb-1.5 text-xs font-semibold text-rose-300">相手の場</div>
          <div className="space-y-2">
            {node.boardState.opponentActive.map((_, i) => (
              <ActiveSlot
                key={i}
                node={node}
                side="opponentActive"
                index={i}
                team={project.opponentTeam}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[10px] uppercase tracking-widest text-slate-600">vs</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold text-sky-300">自分の場</div>
          <div className="space-y-2">
            {node.boardState.myActive.map((_, i) => (
              <ActiveSlot
                key={i}
                node={node}
                side="myActive"
                index={i}
                team={project.myTeam}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3">
          <div className="mb-2 text-xs font-semibold text-slate-400">場の状態</div>
          <FieldEditor node={node} />
        </div>
      </div>
    </div>
  );
}
