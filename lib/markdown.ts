// Phase 5: 構築記事用 Markdown エクスポート。
import type {
  ActionRecord,
  PokemonSet,
  ReviewProject,
  StatName,
  TurnNode,
} from "./types";
import {
  LINE_TAG_MAP,
  RISK_COLOR_MAP,
  BATTLE_MODES,
  ACTION_TYPES,
  MEGA_DEPENDENCY_OPTIONS,
  NON_MEGA_AUTONOMY_OPTIONS,
  MEGA_ROLE_MAP,
} from "./constants";
import { getRegulation } from "./regulations";
import { flattenTree, getLeafRoutes } from "./tree";

const STAT_ORDER: { key: StatName; label: string }[] = [
  { key: "hp", label: "H" },
  { key: "atk", label: "A" },
  { key: "def", label: "B" },
  { key: "spa", label: "C" },
  { key: "spd", label: "D" },
  { key: "spe", label: "S" },
];

function statLine(mon: PokemonSet): string {
  if (!mon.stats || Object.keys(mon.stats).length === 0) return "";
  return STAT_ORDER.map(({ key, label }) => {
    const v = mon.stats?.[key];
    if (v == null) return "";
    const ev = mon.evs?.[key];
    return `${label}${v}${ev != null ? `(${ev})` : ""}`;
  })
    .filter(Boolean)
    .join(" ");
}

function pokemonBlock(mon: PokemonSet, index: number): string {
  if (!mon.species.trim()) return "";
  const lines: string[] = [];
  const head = [
    `${index + 1}. **${mon.species}**`,
    mon.item ? `@ ${mon.item}` : "",
    mon.isMegaCandidate
      ? `（メガ候補${mon.megaRole ? `・${MEGA_ROLE_MAP[mon.megaRole]?.label ?? ""}` : ""}）`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  lines.push(head);

  const meta = [
    mon.ability ? `特性: ${mon.ability}` : "",
    mon.nature ? `性格: ${mon.nature}` : "",
    mon.teraType ? `テラス: ${mon.teraType}` : "",
  ].filter(Boolean);
  if (meta.length) lines.push(`   - ${meta.join(" / ")}`);

  const moves = mon.moves.filter((m) => m.trim());
  if (moves.length) lines.push(`   - 技: ${moves.join(" / ")}`);

  const stats = statLine(mon);
  if (stats) lines.push(`   - 実数値: ${stats}`);

  const memos = [
    mon.notes ? `HP: ${mon.notes}` : "",
    mon.speedNote ? `S: ${mon.speedNote}` : "",
    mon.setNote ? `型: ${mon.setNote}` : "",
  ].filter(Boolean);
  if (memos.length) lines.push(`   - メモ: ${memos.join(" / ")}`);

  return lines.join("\n");
}

function teamSection(title: string, team: PokemonSet[]): string {
  const blocks = team.map(pokemonBlock).filter(Boolean);
  if (blocks.length === 0) return `## ${title}\n\n（未入力）\n`;
  return `## ${title}\n\n${blocks.join("\n")}\n`;
}

function formatAction(action: ActionRecord | undefined, team: PokemonSet[]): string {
  if (!action) return "—";
  const mon = team.find((m) => m.id === action.pokemonSetId)?.species ?? "";
  const typeLabel = ACTION_TYPES.find((t) => t.value === action.actionType)?.label ?? "";
  if (action.actionType === "switch") {
    const to = team.find((m) => m.id === action.switchToPokemonSetId)?.species ?? "";
    return `${mon ? `${mon}: ` : ""}交代${to ? ` → ${to}` : ""}`.trim();
  }
  const detail = action.moveName || typeLabel;
  return `${mon ? `${mon}: ` : ""}${detail}${action.note ? `（${action.note}）` : ""}`.trim();
}

function damageSummary(node: TurnNode, project: ReviewProject): string[] {
  const all = [...project.myTeam, ...project.opponentTeam];
  const nameOf = (id: string) => all.find((m) => m.id === id)?.species ?? "?";
  return node.damageNotes.map((d) => {
    const range =
      d.damageMinPercent != null && d.damageMaxPercent != null
        ? `${d.damageMinPercent}〜${d.damageMaxPercent}%`
        : "";
    const parts = [
      `${nameOf(d.attackerId)} ${d.moveName} → ${nameOf(d.defenderId)}`,
      range,
      d.koText,
      d.inPriorityRange ? "先制圏内" : "",
      d.inScarfRange ? "スカーフ圏内" : "",
    ].filter(Boolean);
    return parts.join(" ");
  });
}

function treeSection(project: ReviewProject): string {
  const rows = flattenTree(project);
  const lines = rows.map(({ node, depth }) => {
    const indent = "  ".repeat(depth);
    const tag = LINE_TAG_MAP[node.lineTag] ?? LINE_TAG_MAP.pending;
    const risk = RISK_COLOR_MAP[node.riskColor];
    const badge = `[${tag.label}/${risk.label}]`;
    const header = `${indent}- **T${node.turnNumber}** ${node.title} ${badge}`;
    const sub: string[] = [];
    if (node.myAction || node.opponentAction) {
      sub.push(
        `${indent}  - 行動: 自分=${formatAction(node.myAction, project.myTeam)} / 相手=${formatAction(node.opponentAction, project.opponentTeam)}`
      );
    }
    for (const d of damageSummary(node, project)) sub.push(`${indent}  - ダメ: ${d}`);
    if (node.comment?.trim()) sub.push(`${indent}  - メモ: ${node.comment.trim()}`);
    return [header, ...sub].join("\n");
  });
  return `## 世界線ツリー\n\n${lines.join("\n")}\n`;
}

function routeTableSection(project: ReviewProject): string {
  const routes = getLeafRoutes(project);
  if (routes.length <= 1 && Object.keys(project.nodes).length <= 1) return "";
  const lastDef = <T,>(route: TurnNode[], pick: (n: TurnNode) => T | undefined) => {
    for (let i = route.length - 1; i >= 0; i--) {
      const v = pick(route[i]);
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };
  const grade = (v: string | undefined, opts: { value: string; label: string }[]) =>
    opts.find((o) => o.value === v)?.label ?? "—";

  const header =
    "| ルート | ラベル | メガ依存度 | 非メガ自立性 | リスク | メモ |\n| --- | --- | --- | --- | --- | --- |";
  const rows = routes.map((route, i) => {
    const leaf = route[route.length - 1];
    const tag = LINE_TAG_MAP[leaf.lineTag] ?? LINE_TAG_MAP.pending;
    const risk = RISK_COLOR_MAP[leaf.riskColor];
    const dep = grade(lastDef(route, (n) => n.routeEvaluation?.megaDependency), MEGA_DEPENDENCY_OPTIONS);
    const auto = grade(lastDef(route, (n) => n.routeEvaluation?.nonMegaAutonomy), NON_MEGA_AUTONOMY_OPTIONS);
    const memo = (lastDef(route, (n) => n.comment) ?? "").replace(/\|/g, "/").replace(/\n/g, " ");
    return `| #${i + 1} ${leaf.title} | ${tag.label} | ${dep} | ${auto} | ${risk.label} | ${memo} |`;
  });
  return `## ルート比較\n\n${header}\n${rows.join("\n")}\n`;
}

function aggregationSection(project: ReviewProject): string {
  const nodes = Object.values(project.nodes);
  const byTag = new Map<string, number>();
  const byRisk = new Map<string, number>();
  for (const n of nodes) {
    const t = (LINE_TAG_MAP[n.lineTag] ?? LINE_TAG_MAP.pending).label;
    byTag.set(t, (byTag.get(t) ?? 0) + 1);
    const r = RISK_COLOR_MAP[n.riskColor].label;
    byRisk.set(r, (byRisk.get(r) ?? 0) + 1);
  }
  const fmt = (m: Map<string, number>) =>
    [...m.entries()].map(([k, v]) => `${k} ${v}`).join(" / ");
  return `## 集計\n\n- ラベル別: ${fmt(byTag)}\n- リスク色別: ${fmt(byRisk)}\n- ノード総数: ${nodes.length}\n`;
}

export function projectToMarkdown(project: ReviewProject): string {
  const mode = BATTLE_MODES.find((m) => m.value === project.mode)?.label ?? "";
  const reg = getRegulation(project.regulation);
  const head = [
    `# ${project.title}`,
    "",
    `- ルール: ${mode}`,
    `- レギュレーション: ${reg.fullName}`,
    project.tags.length ? `- タグ: ${project.tags.map((t) => `#${t}`).join(" ")}` : "",
    "",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const notes = project.projectNotes?.trim()
    ? `## 構築意図・検討目的\n\n${project.projectNotes.trim()}\n`
    : "";

  return [
    head,
    notes,
    teamSection("自分の構築", project.myTeam),
    teamSection("相手の想定構築", project.opponentTeam),
    treeSection(project),
    routeTableSection(project),
    aggregationSection(project),
    "\n---\n_Battle Tree Canvas で作成_\n",
  ]
    .filter(Boolean)
    .join("\n");
}
