// 組み込みの相手テンプレート (プリセット)。
// localStorage には保存されず、アプリに同梱されて全ユーザーが利用できる。
// UI では読み取り専用として扱い、「複製して編集」で編集可能な SavedTeam を作る、
// または各プロジェクトの相手構築欄へ適用する。
import type { SavedTeam } from "./types";
import { parsePokesolText } from "./pokesolParse";

const PRESET_TS = "2026-06-04T00:00:00.000Z";

// ポケソルテキストからプリセットを構築。各ポケモンにはIDを安定的に振り直す。
function buildPreset(
  id: string,
  name: string,
  text: string
): SavedTeam {
  const parsed = parsePokesolText(text).pokemon.slice(0, 6);
  const pokemon = parsed.map((p, i) => ({ ...p, id: `${id}_p${i}` }));
  return {
    id,
    name,
    kind: "opponent",
    mode: "single",
    regulation: "MA",
    pokemon,
    notes: "組み込みプリセット",
    createdAt: PRESET_TS,
    updatedAt: PRESET_TS,
  };
}

const GABU_STALL = `ガブリアス @ きあいのタスキ
テラスタイプ: ノーマル
特性: さめはだ
性格: いじっぱり
185(12)-200(252)-115-90-105-154(252)
スケイルショット / じしん / がんせきふうじ / ステルスロック

ギルガルド(シールド) @ たべのこし
テラスタイプ: ノーマル
特性: バトルスイッチ
性格: いじっぱり
167(252)-110(236)-161(4)-63-161(4)-82(12)
ポルターガイスト / かげうち / つるぎのまい / キングシールド

カイリュー @ メガストーン
テラスタイプ: ノーマル
特性: マルチスケイル
性格: ひかえめ
197(244)-138-116(4)-148(116)-121(4)-118(140)
エアスラッシュ / かえんほうしゃ / はねやすめ / みがわり

ブリジュラス @ オボンのみ
テラスタイプ: ノーマル
特性: じきゅうりょく
性格: ずぶとい
197(252)-112-188(164)-145-94(68)-109(28)
りゅうせいぐん / ラスターカノン / １０まんボルト / ステルスロック

マスカーニャ @ こだわりスカーフ
テラスタイプ: ノーマル
特性: へんげんじざい
性格: ようき
151-162(252)-92(12)-90-90-192(252)
トリックフラワー / はたきおとす / じゃれつく / とんぼがえり

フラエッテ(えいえんのはな) @ メガストーン
テラスタイプ: ノーマル
特性: フラワーベール
性格: おくびょう
181(252)-76-100(100)-145-149(4)-145(156)
ムーンフォース / めいそう / あまえる / こうごうせい`;

export const PRESET_OPPONENT_TEAMS: SavedTeam[] = [
  buildPreset("preset_ma_single_01", "ガブギルガルド受け回し系（M-Aシングル）", GABU_STALL),
];

export function isPresetTeamId(id: string): boolean {
  return id.startsWith("preset_");
}

export function getPresetTeam(id: string): SavedTeam | undefined {
  return PRESET_OPPONENT_TEAMS.find((t) => t.id === id);
}
