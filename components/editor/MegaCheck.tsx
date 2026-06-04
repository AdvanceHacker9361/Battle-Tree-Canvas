"use client";

import { Button } from "@/components/ui";
import { MEGA_CHECK_GROUPS, CHECK_VALUES, CHECK_VALUE_MAP } from "@/lib/constants";
import { emptyMegaCheck } from "@/lib/factory";
import { updateNode } from "@/lib/tree";
import type { CheckValue, MegaLandingCheck, TurnNode } from "@/lib/types";
import { useEditor } from "./EditorContext";

function CheckSelector({
  value,
  onChange,
  readOnly,
}: {
  value: CheckValue;
  onChange: (v: CheckValue) => void;
  readOnly: boolean;
}) {
  return (
    <div className="flex shrink-0 gap-0.5">
      {CHECK_VALUES.map((c) => {
        const on = c.value === value;
        return (
          <button
            key={c.value}
            disabled={readOnly}
            onClick={() => onChange(c.value)}
            title={c.label}
            className={`h-7 w-7 rounded-md border text-sm transition-colors ${
              on ? c.chip : "border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600"
            }`}
          >
            {c.symbol}
          </button>
        );
      })}
    </div>
  );
}

export function MegaCheck({ node }: { node: TurnNode }) {
  const { project, mutate, readOnly } = useEditor();
  const check = node.megaLandingCheck;
  const isDouble = project.mode === "double";

  const enable = () => {
    mutate((p) => updateNode(p, node.id, { megaLandingCheck: emptyMegaCheck() }));
  };
  const disable = () => {
    mutate((p) => updateNode(p, node.id, { megaLandingCheck: undefined }));
  };

  const setItem = (
    group: "beforeLanding" | "landingTurn" | "afterLanding",
    key: string,
    value: CheckValue
  ) => {
    mutate((p) => {
      const current = p.nodes[node.id].megaLandingCheck ?? emptyMegaCheck();
      const next: MegaLandingCheck = {
        ...current,
        [group]: { ...current[group], [key]: value },
      };
      return updateNode(p, node.id, { megaLandingCheck: next });
    });
  };

  const setNote = (note: string) => {
    mutate((p) => {
      const current = p.nodes[node.id].megaLandingCheck ?? emptyMegaCheck();
      return updateNode(p, node.id, { megaLandingCheck: { ...current, note } });
    });
  };

  if (!check) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-3 text-center">
        <p className="mb-2 text-xs text-slate-500">
          メガ着地候補ノードでは、着地の安全性をチェックできます。
        </p>
        {!readOnly && (
          <Button size="sm" variant="secondary" onClick={enable}>
            メガ着地チェックを有効化
          </Button>
        )}
      </div>
    );
  }

  // 進捗集計 (unknown を除く)。
  const allValues = MEGA_CHECK_GROUPS.flatMap((g) =>
    g.items
      .filter((it) => !it.doubleOnly || isDouble)
      .map((it) => (check[g.group] as Record<string, CheckValue>)[it.key])
  );
  const okCount = allValues.filter((v) => v === "yes").length;
  const total = allValues.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          ○ {okCount} / {total} 項目
        </span>
        {!readOnly && (
          <button onClick={disable} className="text-[11px] text-slate-500 hover:text-rose-400">
            チェックを無効化
          </button>
        )}
      </div>

      {MEGA_CHECK_GROUPS.map((g) => (
        <div key={g.group}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {g.groupLabel}
          </div>
          <div className="space-y-1.5">
            {g.items
              .filter((it) => !it.doubleOnly || isDouble)
              .map((it) => {
                const value =
                  (check[g.group] as Record<string, CheckValue>)[it.key] ?? "unknown";
                return (
                  <div
                    key={it.key}
                    className="flex items-center justify-between gap-2 rounded-md bg-slate-900/50 px-2 py-1.5"
                  >
                    <span className="text-xs text-slate-300">
                      {it.label}
                      {it.doubleOnly && (
                        <span className="ml-1 text-[10px] text-slate-600">[ダブル]</span>
                      )}
                    </span>
                    <CheckSelector
                      value={value}
                      onChange={(v) => setItem(g.group, it.key, v)}
                      readOnly={readOnly}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      <textarea
        value={check.note ?? ""}
        disabled={readOnly}
        onChange={(e) => setNote(e.target.value)}
        placeholder="メガ着地に関する補足メモ"
        className="!text-xs"
      />
      <p className="text-[10px] text-slate-600">
        判定: {CHECK_VALUE_MAP.yes.symbol} 良好 / {CHECK_VALUE_MAP.partial.symbol} 一部 /{" "}
        {CHECK_VALUE_MAP.no.symbol} 不可 / {CHECK_VALUE_MAP.unknown.symbol} 未確認
      </p>
    </div>
  );
}
