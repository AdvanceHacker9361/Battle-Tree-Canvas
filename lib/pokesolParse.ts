// ポケソル系テキスト記法の構築をパースして PokemonSet[] に変換する。
// (AIは使わない / 純粋な文字列処理)
//
// 対応フォーマット例:
//   カバルドン(オス) @ オボンのみ
//   テラスタイプ: ノーマル
//   特性: すなおこし
//   性格: わんぱく
//   215(252)-132-171(140)-79-108(124)-67
//   じしん / あくび / ステルスロック / なまける
//
// 各個体は空行区切り。実数値行は H-A-B-C-D-S の順、括弧内は努力値。

import type { PokemonSet, StatName } from "./types";
import { uid } from "./factory";

const STAT_ORDER: StatName[] = ["hp", "atk", "def", "spa", "spd", "spe"];
const GENDER_TOKENS = ["オス", "メス", "♂", "♀", "M", "F", "♂︎", "♀︎"];

// 性別括弧を除去しつつ、フォーム括弧 (シールド等) は種族名に残す。
function normalizeSpecies(raw: string): string {
  const m = raw.match(/^(.*?)[（(]([^）)]*)[）)]\s*$/);
  if (!m) return raw.trim();
  const base = m[1].trim();
  const paren = m[2].trim();
  if (GENDER_TOKENS.includes(paren)) return base;
  return `${base}(${paren})`; // フォーム名は保持
}

function isStatsLine(line: string): boolean {
  // 例: 215(252)-132-171(140)-79-108(124)-67
  const parts = line.split("-");
  if (parts.length !== 6) return false;
  return parts.every((p) => /^\s*\d+\s*([（(]\s*\d+\s*[）)])?\s*$/.test(p));
}

function parseStatsLine(line: string): {
  stats: Partial<Record<StatName, number>>;
  evs: Partial<Record<StatName, number>>;
} {
  const stats: Partial<Record<StatName, number>> = {};
  const evs: Partial<Record<StatName, number>> = {};
  line.split("-").forEach((part, i) => {
    const m = part.match(/(\d+)\s*(?:[（(]\s*(\d+)\s*[）)])?/);
    if (!m) return;
    const stat = STAT_ORDER[i];
    stats[stat] = Number(m[1]);
    if (m[2] !== undefined) evs[stat] = Number(m[2]);
  });
  return { stats, evs };
}

function valueAfterColon(line: string): string {
  const idx = line.search(/[:：]/);
  return idx >= 0 ? line.slice(idx + 1).trim() : "";
}

function isMegaItem(item: string): boolean {
  return /メガストーン|ナイト$|ナイトX$|ナイトY$/.test(item);
}

function parseBlock(block: string): PokemonSet | null {
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const mon: PokemonSet = {
    id: uid("p"),
    species: "",
    item: "",
    ability: "",
    moves: ["", "", "", ""],
    teraType: "",
    nature: "",
    evs: {},
    stats: {},
    speedNote: "",
    setNote: "",
    notes: "",
    isMegaCandidate: false,
  };

  let nameParsed = false;
  let movesParsed = false;

  for (const line of lines) {
    // 名前 + 持ち物 行 (最初の未処理行)
    if (!nameParsed && !/^[^:：]*[:：]/.test(line) && !isStatsLine(line)) {
      const atIdx = line.search(/[@＠]/);
      if (atIdx >= 0) {
        mon.species = normalizeSpecies(line.slice(0, atIdx));
        mon.item = line.slice(atIdx + 1).trim();
      } else {
        mon.species = normalizeSpecies(line);
      }
      nameParsed = true;
      continue;
    }

    if (/^テラ(スタイプ)?\s*[:：]/.test(line)) {
      mon.teraType = valueAfterColon(line);
    } else if (/^(特性|とくせい)\s*[:：]/.test(line)) {
      mon.ability = valueAfterColon(line);
    } else if (/^(性格|せいかく)\s*[:：]/.test(line)) {
      mon.nature = valueAfterColon(line);
    } else if (/^(もちもの|持ち物|持物|アイテム|道具)\s*[:：]/.test(line)) {
      mon.item = valueAfterColon(line);
    } else if (/^(レベル|Lv|ＬＶ)\s*[:：]/i.test(line)) {
      // レベル情報は無視 (保持先が無いため)
    } else if (isStatsLine(line)) {
      const { stats, evs } = parseStatsLine(line);
      mon.stats = stats;
      mon.evs = evs;
    } else if (!movesParsed && (line.includes("/") || line.includes("／"))) {
      mon.moves = line
        .split(/[/／]/)
        .map((m) => m.trim())
        .filter(Boolean)
        .slice(0, 4);
      while (mon.moves.length < 4) mon.moves.push("");
      movesParsed = true;
    } else if (!movesParsed && nameParsed) {
      // 技が1つだけ ("/" 無し) のケース: 残りの未分類行を技として拾う。
      mon.moves = [line, "", "", ""];
      movesParsed = true;
    }
  }

  if (!mon.species) return null;

  if (mon.item && isMegaItem(mon.item)) {
    mon.isMegaCandidate = true;
    mon.megaRole = "immediate_mega";
  }

  return mon;
}

export type PokesolParseResult = {
  pokemon: PokemonSet[];
  /** パースできなかった (種族名が取れなかった) ブロック数 */
  skipped: number;
};

export function parsePokesolText(text: string): PokesolParseResult {
  // 空行 (またはスペースのみの行) で個体を区切る。
  const blocks = text
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const pokemon: PokemonSet[] = [];
  let skipped = 0;
  for (const block of blocks) {
    const mon = parseBlock(block);
    if (mon) pokemon.push(mon);
    else skipped++;
  }
  return { pokemon, skipped };
}
