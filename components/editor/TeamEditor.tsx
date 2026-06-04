"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { MEGA_ROLES } from "@/lib/constants";
import { parsePokesolText } from "@/lib/pokesolParse";
import { emptyPokemon } from "@/lib/factory";
import type { PokemonSet, StatName } from "@/lib/types";
import { useEditor } from "./EditorContext";

const STAT_COLS: { key: StatName; label: string }[] = [
  { key: "hp", label: "H" },
  { key: "atk", label: "A" },
  { key: "def", label: "B" },
  { key: "spa", label: "C" },
  { key: "spd", label: "D" },
  { key: "spe", label: "S" },
];

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

  const updateStat = (
    field: "stats" | "evs",
    key: StatName,
    value: string
  ) => {
    const next = { ...(mon[field] ?? {}) };
    if (value === "") delete next[key];
    else next[key] = Number(value);
    update({ [field]: next } as Partial<PokemonSet>);
  };

  const itemPlaceholder = side === "my" ? "持ち物" : "持ち物予想";
  const hasStats =
    (mon.stats && Object.keys(mon.stats).length > 0) ||
    (mon.evs && Object.keys(mon.evs).length > 0);
  const [statsOpen, setStatsOpen] = useState(false);

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

      <div className="mt-2">
        <input
          value={mon.nature ?? ""}
          disabled={readOnly}
          onChange={(e) => update({ nature: e.target.value })}
          placeholder="性格"
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

      {/* 実数値 / 努力値 (折りたたみ) */}
      <div className="mt-2">
        <button
          onClick={() => setStatsOpen((o) => !o)}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
        >
          <span className={`transition-transform ${statsOpen ? "rotate-90" : ""}`}>▶</span>
          実数値 / 努力値{hasStats && !statsOpen ? " ●" : ""}
        </button>
        {statsOpen && (
          <div className="mt-1.5 grid grid-cols-6 gap-1">
            {STAT_COLS.map((s) => (
              <div key={s.key} className="text-center">
                <div className="mb-0.5 text-[10px] text-slate-500">{s.label}</div>
                <input
                  type="number"
                  disabled={readOnly}
                  value={mon.stats?.[s.key] ?? ""}
                  onChange={(e) => updateStat("stats", s.key, e.target.value)}
                  placeholder="実"
                  className="!px-1 !py-0.5 !text-center !text-[11px]"
                />
                <input
                  type="number"
                  disabled={readOnly}
                  value={mon.evs?.[s.key] ?? ""}
                  onChange={(e) => updateStat("evs", s.key, e.target.value)}
                  placeholder="努"
                  className="mt-1 !px-1 !py-0.5 !text-center !text-[11px] !text-slate-400"
                />
              </div>
            ))}
          </div>
        )}
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

function TeamImportModal({
  side,
  open,
  onClose,
}: {
  side: "my" | "opp";
  open: boolean;
  onClose: () => void;
}) {
  const { mutate } = useEditor();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parsePokesolText> | null>(
    null
  );

  const handleParse = () => setParsed(parsePokesolText(text));

  const handleImport = () => {
    if (!parsed || parsed.pokemon.length === 0) return;
    // 6体に整形 (先頭6体まで採用、不足分は空欄)。
    const team: PokemonSet[] = [];
    for (let i = 0; i < 6; i++) team.push(parsed.pokemon[i] ?? emptyPokemon());
    mutate((p) => ({
      ...p,
      [side === "my" ? "myTeam" : "opponentTeam"]: team,
    }));
    setText("");
    setParsed(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`構築テキストインポート（${side === "my" ? "自分" : "相手"}）`}
      width="max-w-2xl"
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          ポケソル形式の構築テキストを貼り付けてください（空行区切りで複数体）。
          取り込むと{side === "my" ? "自分" : "相手"}の構築6体を置き換えます。
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "例：\nカバルドン(オス) @ オボンのみ\nテラスタイプ: ノーマル\n特性: すなおこし\n性格: わんぱく\n215(252)-132-171(140)-79-108(124)-67\nじしん / あくび / ステルスロック / なまける"
          }
          className="min-h-[180px] !text-xs"
        />
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleParse} disabled={!text.trim()}>
            解析
          </Button>
          {parsed && parsed.pokemon.length > 0 && (
            <Button variant="primary" onClick={handleImport}>
              {parsed.pokemon.length}体をインポート（置き換え）
            </Button>
          )}
        </div>

        {parsed && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5">
            {parsed.pokemon.length === 0 ? (
              <p className="text-xs text-amber-300">
                構築を読み取れませんでした。形式を確認してください。
              </p>
            ) : (
              <ul className="space-y-1 text-xs">
                {parsed.pokemon.map((m, i) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-1.5">
                    <span className="text-slate-600">{i + 1}.</span>
                    <span className="font-medium text-slate-200">{m.species}</span>
                    {m.item && <span className="text-slate-400">@{m.item}</span>}
                    {m.isMegaCandidate && (
                      <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">
                        メガ候補
                      </Badge>
                    )}
                    <span className="w-full truncate text-[11px] text-slate-500">
                      {m.moves.filter(Boolean).join(" / ")}
                    </span>
                  </li>
                ))}
                {parsed.pokemon.length > 6 && (
                  <li className="text-[11px] text-amber-400/80">
                    ※ 7体目以降は取り込まれません（先頭6体のみ）。
                  </li>
                )}
                {parsed.skipped > 0 && (
                  <li className="text-[11px] text-slate-600">
                    （読み取れなかったブロック: {parsed.skipped}）
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function TeamColumn({ side, title }: { side: "my" | "opp"; title: string }) {
  const { project, readOnly } = useEditor();
  const team = side === "my" ? project.myTeam : project.opponentTeam;
  const megaCount = team.filter((m) => m.isMegaCandidate).length;
  const [importOpen, setImportOpen] = useState(false);
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {megaCount > 0 && (
          <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">
            メガ候補 {megaCount}
          </Badge>
        )}
        {!readOnly && (
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onClick={() => setImportOpen(true)}
          >
            テキストインポート
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {team.map((mon, i) => (
          <PokemonCard key={mon.id} side={side} index={i} mon={mon} />
        ))}
      </div>
      <TeamImportModal side={side} open={importOpen} onClose={() => setImportOpen(false)} />
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
