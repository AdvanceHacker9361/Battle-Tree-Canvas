// レギュレーション定義レジストリ。
//
// 新しいレギュレーション (例: M-B) に切り替わったら、原則ここだけを更新すればよい。
// 各画面・コンポーネントはこのレジストリを参照するため、ハードコードを避けられる。
//
// 注意: M-B の詳細仕様は本実装時点 (2026-06) で未確定。確定情報が出たら
//   - description / focusNote を実際の内容に更新
//   - megaFocused など feature フラグを実態に合わせて調整
//   - 必要なら status を "active" に変更
// を行うこと。憶測でルールを断定しない。

import type { RegulationId } from "./types";

export type Regulation = {
  id: RegulationId;
  /** 一覧やバッジに出す短い表記 */
  label: string;
  /** 正式名称 */
  fullName: string;
  /** プロジェクト作成画面などに出す説明 */
  description: string;
  /** メガ個体を主役とする環境か */
  megaFocused: boolean;
  /** メガ運用に関する補足 (概要画面等のヒント) */
  focusNote: string;
  /** "active" = 現行 / "upcoming" = 移行予定 / "legacy" = 過去 */
  status: "active" | "upcoming" | "legacy";
};

export const DEFAULT_REGULATION_ID: RegulationId = "MA";

export const REGULATIONS: Regulation[] = [
  {
    id: "MA",
    label: "M-A",
    fullName: "Pokémon Champions Regulation M-A",
    description:
      "メガシンカ個体を含む構築を前提とした環境。",
    megaFocused: true,
    focusNote:
      "メガ個体を含む構築。メガ運用分類やメガ依存度メモで、どの個体をどう使うかを整理する。",
    status: "active",
  },
  {
    id: "MB",
    label: "M-B",
    fullName: "Pokémon Champions Regulation M-B",
    description:
      "M-A の次期環境（移行予定）。詳細仕様は確定情報の公開後に更新する。現時点では M-A 同等の検討機能を利用可能。",
    megaFocused: true,
    focusNote:
      "M-B の詳細ルールは未確定。環境移行後、メガ運用などの項目を実態に合わせて見直す。",
    status: "upcoming",
  },
];

const REGULATION_MAP: Record<string, Regulation> = Object.fromEntries(
  REGULATIONS.map((r) => [r.id, r])
);

/** 未知のIDでも安全に既定値へフォールバックする。 */
export function getRegulation(id: RegulationId | undefined): Regulation {
  if (id && REGULATION_MAP[id]) return REGULATION_MAP[id];
  return REGULATION_MAP[DEFAULT_REGULATION_ID];
}

/** 選択肢として並べる順 (現行→移行予定→過去)。 */
export function selectableRegulations(): Regulation[] {
  const order: Record<Regulation["status"], number> = {
    active: 0,
    upcoming: 1,
    legacy: 2,
  };
  return [...REGULATIONS].sort((a, b) => order[a.status] - order[b.status]);
}
