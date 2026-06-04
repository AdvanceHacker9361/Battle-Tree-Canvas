// Phase 4: ダメージ計算結果のパース (AIは使わない / 純粋な文字列処理)。
//
// 外部ダメージ計算ツール (ポケモン徹底攻略・Trainer Tower・Pokémon Showdown calc 等)
// の出力テキストを貼り付けて、ダメージ%範囲・確定数・技名・攻防ポケモン名を
// ベストエフォートで抽出する。名前は構築ロスターと照合してIDに解決する。
//
// 抽出の信頼度:
//   - %範囲 / 確定数（KOテキスト）: 高い（数値とキーワードが明確なため）
//   - 技名 / 攻撃側 / 防御側 の名前: ベストエフォート（プレビューでユーザーが確認・修正）

import type { PokemonSet } from "./types";

export type ParsedDamage = {
  attackerName?: string;
  defenderName?: string;
  moveName?: string;
  damageMinPercent?: number;
  damageMaxPercent?: number;
  koText?: string;
  inPriorityRange?: boolean;
  inScarfRange?: boolean;
  raw: string;
};

// ----- %範囲 ----------------------------------------------------------------
function extractPercentRange(
  s: string
): { min: number; max: number } | undefined {
  // 末尾に % を要求することで、生ダメージ値 (165-195) を誤検出しない。
  const range = s.match(
    /(\d{1,3}(?:\.\d+)?)\s*%?\s*[-–—~〜]\s*(\d{1,3}(?:\.\d+)?)\s*%/
  );
  if (range) {
    let a = parseFloat(range[1]);
    let b = parseFloat(range[2]);
    if (a > b) [a, b] = [b, a];
    return { min: a, max: b };
  }
  const single = s.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (single) {
    const v = parseFloat(single[1]);
    return { min: v, max: v };
  }
  return undefined;
}

// ----- 確定数 (KOテキスト) ---------------------------------------------------
function extractKo(s: string): string | undefined {
  // 日本語: 確定2発 / 乱数1発 (87.5%) / ほぼ確定3発 など
  const jp = s.match(
    /(ほぼ)?(確定|乱数)\s*([0-9０-９一二三四五]?)\s*発(?:\s*[(（]\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*%\s*[)）])?/
  );
  if (jp) {
    let t = (jp[1] ?? "") + jp[2] + (jp[3] ?? "") + "発";
    if (jp[4]) t += ` (${jp[4]}%)`;
    return t;
  }
  const jpTaie = s.match(/(確定耐え|乱数耐え|確定急所|急所込み)/);
  if (jpTaie) return jpTaie[0];

  // 英語: guaranteed OHKO / possible 2HKO after Stealth Rock など
  const en = s.match(
    /(guaranteed|possible)\s+(?:O|[1-4])HKO(?:\s+after\s+[^\n.;–-]+)?/i
  );
  if (en) return en[0].replace(/\s+/g, " ").trim();
  const en2 = s.match(/\b(?:O|[1-4])HKO\b/i);
  if (en2) return en2[0].toUpperCase();

  return undefined;
}

// ----- 先制 / スカーフ 圏内フラグ -------------------------------------------
function detectRangeFlags(s: string): {
  inPriorityRange?: boolean;
  inScarfRange?: boolean;
} {
  const out: { inPriorityRange?: boolean; inScarfRange?: boolean } = {};
  if (/先制[^。\n]{0,6}(圏内|範囲|確定|圏)/.test(s) || /先制技?圏内/.test(s)) {
    out.inPriorityRange = true;
  }
  if (/スカーフ[^。\n]{0,6}(圏内|範囲|確定|圏)/.test(s) || /スカーフ圏内/.test(s)) {
    out.inScarfRange = true;
  }
  return out;
}

// ----- 名前/技の分離 --------------------------------------------------------
// 矢印 / セパレータ。"vs." は末尾のピリオドごと消費する (末尾 \b を付けない)。
const ARROW = /→|=>|->|⇒|►|▶|\bvs\.?/i;

function cutBeforeStats(s: string): string {
  // コロン・数値・括弧の手前までを名前候補とする。
  const colon = s.split(/[:：]/)[0];
  const m = colon.match(/^[^\d(（]*/);
  return (m ? m[0] : colon).trim();
}

function extractNames(s: string): {
  attackerName?: string;
  defenderName?: string;
  moveName?: string;
} {
  const arrow = s.match(ARROW);
  if (!arrow || arrow.index === undefined) return {};
  const left = s.slice(0, arrow.index);
  const right = s.slice(arrow.index + arrow[0].length);

  // 防御側: 矢印の右側、ステータス/数値の手前まで。
  const defenderName = cutBeforeStats(right) || undefined;

  // 攻撃側 + 技: 矢印の左側。@持ち物を除去してトークン分割。
  const leftClean = left.replace(/@[^\s　]+/g, " ").trim();
  const tokens = leftClean.split(/[\s　]+|の/).filter(Boolean);
  let attackerName: string | undefined;
  let moveName: string | undefined;
  if (tokens.length >= 2) {
    moveName = tokens[tokens.length - 1];
    attackerName = tokens.slice(0, -1).join(" ");
  } else if (tokens.length === 1) {
    // 単独トークンは「技 → 防御側」表記が多いので技として扱う。
    moveName = tokens[0];
  }
  return { attackerName, defenderName, moveName };
}

// ----- メイン ---------------------------------------------------------------
export function parseDamageText(text: string): ParsedDamage[] {
  const results: ParsedDamage[] = [];
  const lines = text.split(/\r?\n/);
  let context = ""; // 直前の「%を含まない行」を攻撃側/技のヒントとして保持

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      context = "";
      continue;
    }
    const pct = extractPercentRange(line);
    if (!pct) {
      context = context ? `${context} ${line}` : line;
      continue;
    }

    const combined = context ? `${context} ${line}` : line;
    const ko = extractKo(combined);
    const flags = detectRangeFlags(combined);
    const names = extractNames(combined);

    results.push({
      ...names,
      damageMinPercent: pct.min,
      damageMaxPercent: pct.max,
      koText: ko,
      ...flags,
      raw: combined.replace(/\s+/g, " ").trim(),
    });
    context = "";
  }

  return results;
}

// ----- 名前 → 構築ロスター照合 ----------------------------------------------
function normForMatch(s: string): string {
  return s
    .replace(/[\s　]/g, "")
    .replace(/メガ/g, "")
    .replace(/mega/gi, "")
    .replace(/[@＠].*$/g, "")
    .replace(
      /(特化|ぶっぱ|無振り|無振|準速|最速|スカーフ|チョッキ|個体値?|努力値?|実数値?)/g,
      ""
    )
    .replace(/\b(Atk|Def|SpA|SpD|Spe|HP|Lv|EV|IV|Choice|Band|Scarf|Specs)\b/gi, "")
    .replace(/[0-9０-９+\-/.,()（）]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * パースされた名前を、構築ロスター (myTeam + opponentTeam) のポケモンに照合する。
 * 最も具体的に一致した (種族名が長い) ポケモンのIDを返す。一致なしは undefined。
 */
export function matchRosterId(
  name: string | undefined,
  roster: PokemonSet[]
): string | undefined {
  if (!name) return undefined;
  const pn = normForMatch(name);
  if (!pn) return undefined;

  let bestId: string | undefined;
  let bestLen = 0;
  for (const mon of roster) {
    if (!mon.species.trim()) continue;
    const ms = normForMatch(mon.species);
    if (!ms) continue;
    if (pn.includes(ms) || ms.includes(pn)) {
      if (ms.length > bestLen) {
        bestLen = ms.length;
        bestId = mon.id;
      }
    }
  }
  return bestId;
}
