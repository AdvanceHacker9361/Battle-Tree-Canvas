"use client";

import React, { createContext, useContext } from "react";
import type { ReviewProject, TurnNode } from "@/lib/types";

type EditorContextValue = {
  project: ReviewProject;
  // プロジェクト全体を関数で不変更新する。
  mutate: (fn: (p: ReviewProject) => ReviewProject) => void;
  selectedId: string;
  select: (id: string) => void;
  readOnly: boolean;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  value,
  children,
}: {
  value: EditorContextValue;
  children: React.ReactNode;
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor は EditorProvider 内で使用してください。");
  return ctx;
}

// 選択中ノードを取得するヘルパ。
export function useSelectedNode(): TurnNode | undefined {
  const { project, selectedId } = useEditor();
  return project.nodes[selectedId] ?? project.nodes[project.rootNodeId];
}
