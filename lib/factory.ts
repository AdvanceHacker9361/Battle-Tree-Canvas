// 空のエンティティ生成・ID採番・複製ユーティリティ。
import type {
  ReviewProject,
  PokemonSet,
  TurnNode,
  BattleMode,
  BoardState,
  ActivePokemon,
  DamageNote,
  RegulationId,
  SavedTeam,
} from "./types";
import { SCHEMA_VERSION, BATTLE_MODES } from "./constants";
import { DEFAULT_REGULATION_ID } from "./regulations";

export function uid(prefix = ""): string {
  // crypto.randomUUID はブラウザ/Node双方で利用可能。
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${id}` : id;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function emptyPokemon(): PokemonSet {
  return {
    id: uid("p"),
    species: "",
    item: "",
    ability: "",
    moves: ["", "", "", ""],
    speedNote: "",
    setNote: "",
    notes: "",
    isMegaCandidate: false,
  };
}

export function emptyTeam(): PokemonSet[] {
  return Array.from({ length: 6 }, () => emptyPokemon());
}

// 6体になるよう整形しつつ、各ポケモンに新しいIDを振ってディープコピーする。
// マイ構築 ⇔ プロジェクト間でIDを共有しないことで、参照の混線を防ぐ。
export function clonePokemonTeam(team: PokemonSet[]): PokemonSet[] {
  const src = (typeof structuredClone === "function"
    ? structuredClone(team)
    : (JSON.parse(JSON.stringify(team)) as PokemonSet[])) as PokemonSet[];
  const result: PokemonSet[] = [];
  for (let i = 0; i < 6; i++) {
    const mon = src[i];
    result.push(mon ? { ...mon, id: uid("p") } : emptyPokemon());
  }
  return result;
}

export function createSavedTeam(
  name: string,
  mode: BattleMode,
  regulation: RegulationId = DEFAULT_REGULATION_ID,
  pokemon?: PokemonSet[]
): SavedTeam {
  const ts = nowIso();
  return {
    id: uid("team"),
    name: name || "無題のマイ構築",
    mode,
    regulation,
    pokemon: pokemon ? clonePokemonTeam(pokemon) : emptyTeam(),
    notes: "",
    createdAt: ts,
    updatedAt: ts,
  };
}

function emptyBoard(mode: BattleMode): BoardState {
  const slots = BATTLE_MODES.find((m) => m.value === mode)?.slots ?? 1;
  const active = (): ActivePokemon[] =>
    Array.from({ length: slots }, () => ({
      pokemonSetId: "",
      hpPercent: 100,
      status: "none",
      isMegaEvolved: false,
    }));
  return {
    myActive: active(),
    opponentActive: active(),
    field: {
      weather: "",
      terrain: "",
      screensMy: [],
      screensOpponent: [],
      hazardsMy: [],
      hazardsOpponent: [],
    },
  };
}

export function emptyDamageNote(): DamageNote {
  return {
    id: uid("d"),
    attackerId: "",
    defenderId: "",
    moveName: "",
    calcText: "",
    note: "",
  };
}

export function createNode(
  mode: BattleMode,
  opts: { turnNumber?: number; parentId?: string; title?: string } = {}
): TurnNode {
  const ts = nowIso();
  return {
    id: uid("n"),
    parentId: opts.parentId,
    childIds: [],
    turnNumber: opts.turnNumber ?? 1,
    title: opts.title ?? "新しいノード",
    boardState: emptyBoard(mode),
    damageNotes: [],
    informationNotes: [],
    lineTag: "pending",
    riskColor: "gray",
    comment: "",
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createProject(
  title: string,
  mode: BattleMode,
  regulation: RegulationId = DEFAULT_REGULATION_ID,
  opts: { myTeam?: PokemonSet[]; sourceTeamId?: string } = {}
): ReviewProject {
  const ts = nowIso();
  const root = createNode(mode, { turnNumber: 1, title: "Turn 1：初手局面" });
  return {
    id: uid("proj"),
    title: title || "無題のプロジェクト",
    mode,
    regulation,
    myTeam: opts.myTeam ? clonePokemonTeam(opts.myTeam) : emptyTeam(),
    opponentTeam: emptyTeam(),
    sourceTeamId: opts.sourceTeamId,
    rootNodeId: root.id,
    nodes: { [root.id]: root },
    projectNotes: "",
    tags: [],
    schemaVersion: SCHEMA_VERSION,
    createdAt: ts,
    updatedAt: ts,
  };
}

// サブツリーを新IDで複製して nodes マップへ追加。新ルートのIDを返す。
export function duplicateSubtree(
  nodes: Record<string, TurnNode>,
  sourceId: string,
  newParentId?: string
): { newRootId: string; added: Record<string, TurnNode> } {
  const added: Record<string, TurnNode> = {};
  const ts = nowIso();

  function clone(id: string, parentId?: string): string {
    const src = nodes[id];
    const newId = uid("n");
    const copy: TurnNode = {
      ...structuredCloneSafe(src),
      id: newId,
      parentId,
      childIds: [],
      createdAt: ts,
      updatedAt: ts,
    };
    added[newId] = copy;
    copy.childIds = src.childIds.map((childId) => clone(childId, newId));
    return newId;
  }

  const newRootId = clone(sourceId, newParentId);
  return { newRootId, added };
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
