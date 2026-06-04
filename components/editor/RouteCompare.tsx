"use client";

import { Badge, Dot, EmptyState } from "@/components/ui";
import {
  RISK_COLOR_MAP,
  LINE_TAG_MAP,
  MEGA_DEPENDENCY_OPTIONS,
  NON_MEGA_AUTONOMY_OPTIONS,
} from "@/lib/constants";
import { getLeafRoutes } from "@/lib/tree";
import type { ReviewProject, TurnNode } from "@/lib/types";
import { useEditor } from "./EditorContext";

// 経路内で最後に設定された値を拾う (末端優先)。
function lastDefined<T>(route: TurnNode[], pick: (n: TurnNode) => T | undefined): T | undefined {
  for (let i = route.length - 1; i >= 0; i--) {
    const v = pick(route[i]);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function gradeLabel(
  value: string | undefined,
  options: { value: string; label: string }[]
): string {
  return options.find((o) => o.value === value)?.label ?? "—";
}

function RouteTable({ project, onSelect }: { project: ReviewProject; onSelect: (id: string) => void }) {
  const routes = getLeafRoutes(project);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-xs text-slate-400">
            <th className="px-3 py-2 font-medium">ルート（末端ノード）</th>
            <th className="px-3 py-2 font-medium">ラベル</th>
            <th className="px-3 py-2 font-medium">メガ依存度</th>
            <th className="px-3 py-2 font-medium">非メガ自立性</th>
            <th className="px-3 py-2 font-medium">リスク</th>
            <th className="px-3 py-2 font-medium">メモ</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route, i) => {
            const leaf = route[route.length - 1];
            const risk = RISK_COLOR_MAP[leaf.riskColor];
            const tag = LINE_TAG_MAP[leaf.lineTag] ?? LINE_TAG_MAP.pending;
            const dep = lastDefined(route, (n) => n.routeEvaluation?.megaDependency);
            const auto = lastDefined(route, (n) => n.routeEvaluation?.nonMegaAutonomy);
            const memo = lastDefined(route, (n) => n.comment);
            return (
              <tr
                key={leaf.id}
                onClick={() => onSelect(leaf.id)}
                className="cursor-pointer border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">#{i + 1}</span>
                    <span className="font-medium text-slate-200">{leaf.title}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-slate-500">
                    {route.map((n) => n.title).join(" › ")}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge className={risk.chip}>{tag.label}</Badge>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-300">
                  {gradeLabel(dep, MEGA_DEPENDENCY_OPTIONS)}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-300">
                  {gradeLabel(auto, NON_MEGA_AUTONOMY_OPTIONS)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Dot className={risk.dot} />
                    {risk.label}
                  </span>
                </td>
                <td className="max-w-[220px] truncate px-3 py-2.5 text-xs text-slate-400" title={memo}>
                  {memo ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NodeList({
  title,
  nodes,
  emptyText,
  onSelect,
  accent,
}: {
  title: string;
  nodes: TurnNode[];
  emptyText: string;
  onSelect: (id: string) => void;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
        <Badge className="border-slate-700 bg-slate-800 text-slate-300">{nodes.length}</Badge>
      </header>
      <div className="p-2">
        {nodes.length === 0 ? (
          <p className="px-2 py-3 text-xs text-slate-600">{emptyText}</p>
        ) : (
          <ul className="space-y-0.5">
            {nodes.map((n) => {
              const risk = RISK_COLOR_MAP[n.riskColor];
              return (
                <li key={n.id}>
                  <button
                    onClick={() => onSelect(n.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-800/50"
                  >
                    <Dot className={risk.dot} />
                    <span className="text-xs text-slate-500">T{n.turnNumber}</span>
                    <span className="flex-1 truncate text-sm text-slate-200">{n.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function RouteCompare({ onSelectNode }: { onSelectNode: (id: string) => void }) {
  const { project } = useEditor();
  const all = Object.values(project.nodes);
  const collapsePoints = all.filter((n) => n.lineTag === "collapse_point");
  const losingLines = all.filter((n) => n.lineTag === "losing_line");

  if (Object.keys(project.nodes).length <= 1) {
    return (
      <EmptyState
        title="比較するルートがまだありません"
        description="ツリー編集タブで分岐ノードを追加すると、末端までのルートが自動的に一覧化されます。"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-200">ルート比較</h2>
        <p className="mb-3 text-xs text-slate-500">
          末端ノードまでの各ルートを横並びで比較します（入力済みのラベル・評価を集計するだけで、AI分析は行いません）。行をクリックすると該当ノードを開きます。
        </p>
        <RouteTable project={project} onSelect={onSelectNode} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NodeList
          title="崩壊ポイント"
          nodes={collapsePoints}
          emptyText="崩壊ポイントに指定されたノードはありません。"
          onSelect={onSelectNode}
          accent="text-rose-300"
        />
        <NodeList
          title="負け筋"
          nodes={losingLines}
          emptyText="負け筋に指定されたノードはありません。"
          onSelect={onSelectNode}
          accent="text-amber-300"
        />
      </div>
    </div>
  );
}
