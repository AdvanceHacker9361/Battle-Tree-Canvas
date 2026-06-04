// Battle Tree Canvas - データ構造定義
// 企画書 第11章のTypeScript型に準拠。

export type BattleMode = "single" | "double";

export type StatName = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export type MegaRole = "immediate_mega" | "deferred_mega" | "fake_or_non_mega";

export type PokemonSet = {
  id: string;
  species: string;

  item?: string;
  ability?: string;
  moves: string[];

  teraType?: string;

  nature?: string;
  evs?: Partial<Record<StatName, number>>;
  stats?: Partial<Record<StatName, number>>;

  speedNote?: string;
  setNote?: string;
  notes?: string;

  isMegaCandidate: boolean;
  megaRole?: MegaRole;
};

export type PokemonStatus =
  | "none"
  | "burn"
  | "paralysis"
  | "poison"
  | "toxic"
  | "sleep"
  | "freeze";

export type ActivePokemon = {
  pokemonSetId: string;
  hpPercent: number;
  status?: PokemonStatus;
  isMegaEvolved?: boolean;
};

export type BenchPokemon = {
  pokemonSetId: string;
  hpPercent?: number;
  status?: PokemonStatus;
  revealed?: boolean;
};

export type FieldState = {
  weather?: string;
  terrain?: string;

  trickRoomTurns?: number;

  tailwindMyTurns?: number;
  tailwindOpponentTurns?: number;

  screensMy?: string[];
  screensOpponent?: string[];

  hazardsMy?: string[];
  hazardsOpponent?: string[];
};

export type BoardState = {
  myActive: ActivePokemon[];
  opponentActive: ActivePokemon[];

  myBench?: BenchPokemon[];
  opponentBench?: BenchPokemon[];

  field: FieldState;
};

export type ActionType =
  | "move"
  | "switch"
  | "protect"
  | "setup"
  | "speed_control"
  | "other";

export type ActionRecord = {
  side: "me" | "opponent";
  pokemonSetId?: string;

  actionType: ActionType;

  moveName?: string;
  target?: string;
  switchToPokemonSetId?: string;

  note?: string;
};

export type DamageNote = {
  id: string;
  attackerId: string;
  defenderId: string;

  moveName: string;

  damageMinPercent?: number;
  damageMaxPercent?: number;
  actualDamagePercent?: number;

  // Phase 4: ダメージ計算補助
  koText?: string; // 確定数メモ（確定2発 / 乱数1発 など）
  inPriorityRange?: boolean; // 先制技圏内
  inScarfRange?: boolean; // スカーフ（最速スカーフ等）圏内

  calcText?: string;
  note?: string;
};

export type InformationNoteType =
  | "item_revealed"
  | "speed_relation"
  | "move_revealed"
  | "ability_revealed"
  | "mega_candidate_confirmed"
  | "choice_lock"
  | "damage_range_checked"
  | "other";

export type InformationNote = {
  id: string;
  type: InformationNoteType;
  note: string;
};

export type LineTag =
  | "primary_line"
  | "backup_line"
  | "escape_line"
  | "losing_line"
  | "info_check"
  | "collapse_point"
  | "pending";

export type RiskColor = "green" | "yellow" | "red" | "blue" | "purple" | "gray";

export type RouteEvaluation = {
  megaDependency?: "low" | "medium" | "high" | "danger";
  nonMegaAutonomy?: "high" | "medium" | "low" | "danger";

  secondLineExists?: boolean;
  nonMegaWinCondition?: string;
  collapseReason?: string;

  note?: string;
};

export type TurnNode = {
  id: string;
  parentId?: string;
  childIds: string[];

  turnNumber: number;
  title: string;

  boardState: BoardState;

  myAction?: ActionRecord;
  opponentAction?: ActionRecord;

  damageNotes: DamageNote[];
  informationNotes: InformationNote[];

  lineTag: LineTag;
  riskColor: RiskColor;

  routeEvaluation?: RouteEvaluation;

  comment?: string;

  createdAt: string;
  updatedAt: string;
};

// レギュレーションID。詳細メタデータは lib/regulations.ts のレジストリが正。
// string 型にして、新レギュレーション (M-B など) のデータを型エラーなく受け入れる。
export type RegulationId = string;

export type ReviewProject = {
  id: string;
  title: string;
  mode: BattleMode;
  regulation: RegulationId;

  myTeam: PokemonSet[];
  opponentTeam: PokemonSet[];

  rootNodeId: string;
  nodes: Record<string, TurnNode>;

  projectNotes?: string;
  tags: string[];

  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
};
