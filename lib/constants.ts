// 表示用ラベル・色・選択肢のメタデータ。
import type {
  LineTag,
  RiskColor,
  CheckValue,
  MegaRole,
  PokemonStatus,
  ActionType,
  InformationNoteType,
  BattleMode,
} from "./types";

export const SCHEMA_VERSION = 1;

// ---- リスク色 -----------------------------------------------------------
export const RISK_COLORS: {
  value: RiskColor;
  label: string;
  meaning: string;
  dot: string; // 円ドット用 背景色
  chip: string; // バッジ用 背景+文字色
  ring: string; // 選択中ノードの枠線
}[] = [
  { value: "green", label: "緑", meaning: "主勝ち筋が残る", dot: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", ring: "ring-emerald-500" },
  { value: "yellow", label: "黄", meaning: "やや不安だが進行可能", dot: "bg-amber-400", chip: "bg-amber-400/15 text-amber-300 border-amber-400/40", ring: "ring-amber-400" },
  { value: "red", label: "赤", meaning: "負け筋・崩壊ポイント", dot: "bg-rose-500", chip: "bg-rose-500/15 text-rose-300 border-rose-500/40", ring: "ring-rose-500" },
  { value: "blue", label: "青", meaning: "判定・詰め・逃げ筋", dot: "bg-sky-500", chip: "bg-sky-500/15 text-sky-300 border-sky-500/40", ring: "ring-sky-500" },
  { value: "purple", label: "紫", meaning: "読み依存・低確率勝ち筋", dot: "bg-violet-500", chip: "bg-violet-500/15 text-violet-300 border-violet-500/40", ring: "ring-violet-500" },
  { value: "gray", label: "灰", meaning: "保留・未分類", dot: "bg-slate-500", chip: "bg-slate-500/15 text-slate-300 border-slate-500/40", ring: "ring-slate-500" },
];

export const RISK_COLOR_MAP = Object.fromEntries(
  RISK_COLORS.map((c) => [c.value, c])
) as Record<RiskColor, (typeof RISK_COLORS)[number]>;

// ---- 勝ち筋ラベル -------------------------------------------------------
export const LINE_TAGS: { value: LineTag; label: string; meaning: string }[] = [
  { value: "primary_line", label: "主線", meaning: "最も通したい勝ち筋" },
  { value: "backup_line", label: "副線", meaning: "主線が崩れた時の代替ルート" },
  { value: "escape_line", label: "非常線", meaning: "判定・詰め・相手ミス待ち" },
  { value: "losing_line", label: "負け筋", meaning: "勝ち筋がほぼ消える分岐" },
  { value: "info_check", label: "確認分岐", meaning: "相手の型・持ち物・S関係を見る枝" },
  { value: "mega_landing_candidate", label: "メガ着地候補", meaning: "メガ個体を場に出す候補ターン" },
  { value: "collapse_point", label: "崩壊ポイント", meaning: "踏むと構築の勝ち筋が消える地点" },
  { value: "pending", label: "保留", meaning: "まだ判断できない枝" },
];

export const LINE_TAG_MAP = Object.fromEntries(
  LINE_TAGS.map((t) => [t.value, t])
) as Record<LineTag, (typeof LINE_TAGS)[number]>;

// ---- チェック値 ---------------------------------------------------------
export const CHECK_VALUES: {
  value: CheckValue;
  label: string;
  symbol: string;
  chip: string;
}[] = [
  { value: "yes", label: "○ 良好", symbol: "○", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  { value: "partial", label: "△ 一部", symbol: "△", chip: "bg-amber-400/15 text-amber-300 border-amber-400/40" },
  { value: "no", label: "× 不可", symbol: "×", chip: "bg-rose-500/15 text-rose-300 border-rose-500/40" },
  { value: "unknown", label: "－ 未確認", symbol: "－", chip: "bg-slate-500/15 text-slate-300 border-slate-500/40" },
];

export const CHECK_VALUE_MAP = Object.fromEntries(
  CHECK_VALUES.map((c) => [c.value, c])
) as Record<CheckValue, (typeof CHECK_VALUES)[number]>;

// ---- メガ運用分類 -------------------------------------------------------
export const MEGA_ROLES: { value: MegaRole; label: string; meaning: string }[] = [
  { value: "immediate_mega", label: "即時メガ型", meaning: "場に出たら基本的に即メガ" },
  { value: "deferred_mega", label: "留保メガ型", meaning: "メガ前の特性/タイプ/Sに価値があり即メガしない択がある" },
  { value: "fake_or_non_mega", label: "偽装・非メガ型", meaning: "メガ候補に見せつつ非メガ軸でも勝てる" },
];

export const MEGA_ROLE_MAP = Object.fromEntries(
  MEGA_ROLES.map((m) => [m.value, m])
) as Record<MegaRole, (typeof MEGA_ROLES)[number]>;

// ---- 状態異常 -----------------------------------------------------------
export const STATUSES: { value: PokemonStatus; label: string; short: string; chip: string }[] = [
  { value: "none", label: "なし", short: "—", chip: "bg-slate-700 text-slate-300" },
  { value: "burn", label: "やけど", short: "やけど", chip: "bg-orange-500/20 text-orange-300" },
  { value: "paralysis", label: "まひ", short: "まひ", chip: "bg-yellow-500/20 text-yellow-300" },
  { value: "poison", label: "どく", short: "どく", chip: "bg-fuchsia-500/20 text-fuchsia-300" },
  { value: "toxic", label: "もうどく", short: "猛毒", chip: "bg-purple-500/20 text-purple-300" },
  { value: "sleep", label: "ねむり", short: "睡眠", chip: "bg-sky-500/20 text-sky-300" },
  { value: "freeze", label: "こおり", short: "氷", chip: "bg-cyan-500/20 text-cyan-300" },
];

export const STATUS_MAP = Object.fromEntries(
  STATUSES.map((s) => [s.value, s])
) as Record<PokemonStatus, (typeof STATUSES)[number]>;

// ---- 行動種別 -----------------------------------------------------------
export const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "move", label: "技" },
  { value: "switch", label: "交代" },
  { value: "protect", label: "守る" },
  { value: "mega_landing", label: "メガ着地" },
  { value: "setup", label: "積み" },
  { value: "speed_control", label: "S操作" },
  { value: "other", label: "その他" },
];

// ---- 情報ノート種別 -----------------------------------------------------
export const INFO_NOTE_TYPES: { value: InformationNoteType; label: string }[] = [
  { value: "item_revealed", label: "持ち物判明" },
  { value: "speed_relation", label: "S関係" },
  { value: "move_revealed", label: "技判明" },
  { value: "ability_revealed", label: "特性判明" },
  { value: "mega_candidate_confirmed", label: "メガ候補確定" },
  { value: "choice_lock", label: "こだわり拘束" },
  { value: "damage_range_checked", label: "ダメージ範囲確認" },
  { value: "other", label: "その他" },
];

// ---- メガ依存度 / 非メガ自立性 ------------------------------------------
export const MEGA_DEPENDENCY_OPTIONS: { value: "low" | "medium" | "high" | "danger"; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
  { value: "danger", label: "危険" },
];

export const NON_MEGA_AUTONOMY_OPTIONS: { value: "high" | "medium" | "low" | "danger"; label: string }[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
  { value: "danger", label: "危険" },
];

// ---- 対戦ルール ---------------------------------------------------------
export const BATTLE_MODES: { value: BattleMode; label: string; slots: number }[] = [
  { value: "single", label: "シングル", slots: 1 },
  { value: "double", label: "ダブル", slots: 2 },
];

// ---- メガ着地チェック項目の表示定義 -------------------------------------
export const MEGA_CHECK_GROUPS: {
  group: "beforeLanding" | "landingTurn" | "afterLanding";
  groupLabel: string;
  items: { key: string; label: string; doubleOnly?: boolean }[];
}[] = [
  {
    group: "beforeLanding",
    groupLabel: "着地前",
    items: [
      { key: "opponentChipped", label: "相手を十分削れているか" },
      { key: "scarfChecked", label: "相手のスカーフ候補を確認済みか" },
      { key: "priorityChecked", label: "相手の先制技圏内ではないか" },
      { key: "keyDamageChecked", label: "メガ後に一貫する技があるか" },
    ],
  },
  {
    group: "landingTurn",
    groupLabel: "着地ターン",
    items: [
      { key: "favorableMatchup", label: "着地ターンに不利対面にならないか" },
      { key: "notImmediatelyRevengeKilled", label: "すぐに縛り返されないか" },
      { key: "supportAvailableInDouble", label: "横が猫/指/威嚇/S操作で補助できるか", doubleOnly: true },
      { key: "canProtectAndProgressInDouble", label: "守る時に横が盤面を進められるか", doubleOnly: true },
    ],
  },
  {
    group: "afterLanding",
    groupLabel: "着地後",
    items: [
      { key: "canProgressInTwoOrThreeTurns", label: "2〜3ターンで崩しが進むか" },
      { key: "backupLineStillExists", label: "メガが倒れても第2軸が残るか" },
      { key: "stableEndgameExists", label: "終盤を詰め切れる形があるか" },
    ],
  },
];

// 共通色トークン
export const COMMON_WEATHERS = ["晴れ", "雨", "砂", "霰/雪", "なし"];
export const COMMON_TERRAINS = ["エレキ", "グラス", "サイコ", "ミスト", "なし"];
export const COMMON_HAZARDS = ["ステルスロック", "まきびし", "どくびし", "ねばねばネット"];
export const COMMON_SCREENS = ["リフレクター", "ひかりのかべ", "オーロラベール"];
