import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Battle Tree Canvas",
  description:
    "競技ポケモン向け ツリー式 対戦シミュレート用メモアプリ。対戦分岐を木構造で可視化・保存・共有する (Pokémon Champions Regulation M-A / M-B 対応)。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1120",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
