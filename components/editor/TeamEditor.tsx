"use client";

import { Field, Badge } from "@/components/ui";
import { MEGA_ROLES } from "@/lib/constants";
import type { PokemonSet } from "@/lib/types";
import { useEditor } from "./EditorContext";

function PokemonCard({
  side,
  index,
  mon,
}: {
  side: "my" | "opp";
  index: number;
  mon: PokemonSet;
}) {
  const { mutate, readOnly } = useEditor();

  const update = (patch: Partial<PokemonSet>) => {
    mutate((p) => {
      const key = side === "my" ? "myTeam" : "opponentTeam";
      const team = [...p[key]];
      team[index] = { ...team[index], ...patch };
      return { ...p, [key]: team };
    });
  };

  const updateMove = (mi: number, value: string) => {
    const moves = [...mon.moves];
    while (moves.length < 4) moves.push("");
    moves[mi] = value;
    update({ moves });
  };

  const itemPlaceholder = side === "my" ? "持ち物" : "持ち物予想";

  return (
    <div
      className={`rounded-xl border bg-slate-900/40 p-3 ${
        mon.isMegaCandidate ? "border-violet-500/40" : "border-slate-800"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[11px] text-slate-400">
          {index + 1}
        </span>
        <input
          value={mon.species}
          disabled={readOnly}
          onChange={(e) => update({ species: e.target.value })}
          placeholder="ポケモン名"
          className="!py-1 font-medium"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          value={mon.item ?? ""}
          disabled={readOnly}
          onChange={(e) => update({ item: e.target.value })}
          placeholder={itemPlaceholder}
          className="!py-1 !text-xs"
        />
        <input
          value={mon.ability ?? ""}
          disabled={readOnly}
          onChange={(e) => update({ ability: e.target.value })}
          placeholder="特性"
          className="!py-1 !text-xs"
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((mi) => (
          <input
            key={mi}
            value={mon.moves[mi] ?? ""}
            disabled={readOnly}
            onChange={(e) => updateMove(mi, e.target.value)}
            placeholder={`技${mi + 1}`}
            className="!py-1 !text-xs"
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <input
          value={mon.notes ?? ""}
          disabled={readOnly}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="HPメモ"
          className="!py-1 !text-xs"
        />
        <input
          value={mon.speedNote ?? ""}
          disabled={readOnly}
          onChange={(e) => update({ speedNote: e.target.value })}
          placeholder="素早さメモ"
          className="!py-1 !text-xs"
        />
        <input
          value={mon.setNote ?? ""}
          disabled={readOnly}
          onChange={(e) => update({ setNote: e.target.value })}
          placeholder="型メモ"
          className="!py-1 !text-xs"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={mon.isMegaCandidate}
            onChange={(e) =>
              update({
                isMegaCandidate: e.target.checked,
                megaRole: e.target.checked ? mon.megaRole ?? "immediate_mega" : undefined,
              })
            }
            className="!h-4 !w-4 accent-violet-500"
          />
          <span className={mon.isMegaCandidate ? "text-violet-300" : ""}>メガ候補</span>
        </label>
        {mon.isMegaCandidate && (
          <select
            value={mon.megaRole ?? "immediate_mega"}
            disabled={readOnly}
            onChange={(e) => update({ megaRole: e.target.value as PokemonSet["megaRole"] })}
            className="!w-auto !py-1 !text-xs"
          >
            {MEGA_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function TeamColumn({ side, title }: { side: "my" | "opp"; title: string }) {
  const { project } = useEditor();
  const team = side === "my" ? project.myTeam : project.opponentTeam;
  const megaCount = team.filter((m) => m.isMegaCandidate).length;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {megaCount > 0 && (
          <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">
            メガ候補 {megaCount}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {team.map((mon, i) => (
          <PokemonCard key={mon.id} side={side} index={i} mon={mon} />
        ))}
      </div>
    </section>
  );
}

export function TeamEditor() {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <TeamColumn side="my" title="自分の構築（6体）" />
      <TeamColumn side="opp" title="相手の想定構築（6体）" />
    </div>
  );
}
