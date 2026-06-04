"use client";

import { Dot, Badge, Button, confirmAction } from "@/components/ui";
import { RISK_COLOR_MAP, LINE_TAG_MAP } from "@/lib/constants";
import { flattenTree, addChild, addSibling, duplicateNode, deleteNode } from "@/lib/tree";
import { useEditor } from "./EditorContext";

export function TreeView() {
  const { project, mutate, selectedId, select, readOnly } = useEditor();
  const rows = flattenTree(project);

  const handleAddChild = (id: string) => {
    let newId = "";
    mutate((p) => {
      const r = addChild(p, id);
      newId = r.newId;
      return r.project;
    });
    if (newId) select(newId);
  };

  const handleAddSibling = (id: string) => {
    let newId = "";
    mutate((p) => {
      const r = addSibling(p, id);
      newId = r.newId;
      return r.project;
    });
    if (newId) select(newId);
  };

  const handleDuplicate = (id: string) => {
    let newId = "";
    mutate((p) => {
      const r = duplicateNode(p, id);
      newId = r.newId;
      return r.project;
    });
    if (newId) select(newId);
  };

  const handleDelete = (id: string) => {
    const node = project.nodes[id];
    if (!node) return;
    if (id === project.rootNodeId) {
      window.alert("ルートノードは削除できません。");
      return;
    }
    const childCount = Object.values(project.nodes).filter((n) => {
      // サブツリー判定は簡易に: 子を持つかどうかで警告。
      return n.parentId === id;
    }).length;
    const msg =
      childCount > 0
        ? `「${node.title}」とその配下の分岐をすべて削除します。よろしいですか？`
        : `「${node.title}」を削除します。よろしいですか？`;
    if (!confirmAction(msg)) return;
    let selectId = project.rootNodeId;
    mutate((p) => {
      const r = deleteNode(p, id);
      selectId = r.selectId;
      return r.project;
    });
    select(selectId);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          世界線ツリー
        </h3>
        <span className="text-[11px] text-slate-600">{rows.length} ノード</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {rows.map(({ node, depth }) => {
            const risk = RISK_COLOR_MAP[node.riskColor];
            const tag = LINE_TAG_MAP[node.lineTag];
            const isSelected = node.id === selectedId;
            const childCount = node.childIds.length;
            return (
              <li key={node.id}>
                <div
                  className={`group flex items-center gap-1 rounded-lg pr-1 ${
                    isSelected ? "bg-slate-800 ring-1 " + risk.ring : "hover:bg-slate-800/50"
                  }`}
                  style={{ paddingLeft: `${depth * 14 + 4}px` }}
                >
                  <button
                    onClick={() => select(node.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                  >
                    <Dot className={risk.dot} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      <span className="mr-1 text-[11px] text-slate-500">T{node.turnNumber}</span>
                      {node.title}
                    </span>
                    {tag.value !== "pending" && (
                      <Badge className={`shrink-0 ${risk.chip}`} title={tag.meaning}>
                        {tag.label}
                      </Badge>
                    )}
                    {childCount > 0 && (
                      <span className="shrink-0 text-[10px] text-slate-600">
                        ▾{childCount}
                      </span>
                    )}
                  </button>

                  {!readOnly && (
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <IconBtn title="子分岐を追加" onClick={() => handleAddChild(node.id)}>
                        +枝
                      </IconBtn>
                      {node.parentId && (
                        <IconBtn title="兄弟分岐を追加" onClick={() => handleAddSibling(node.id)}>
                          +並
                        </IconBtn>
                      )}
                      <IconBtn title="複製" onClick={() => handleDuplicate(node.id)}>
                        複
                      </IconBtn>
                      {node.id !== project.rootNodeId && (
                        <IconBtn title="削除" danger onClick={() => handleDelete(node.id)}>
                          ×
                        </IconBtn>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {!readOnly && (
        <div className="border-t border-slate-800 p-2">
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => handleAddChild(selectedId)}
          >
            + 選択ノードに分岐を追加
          </Button>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded px-1.5 py-1 text-[11px] font-medium ${
        danger
          ? "text-rose-400 hover:bg-rose-500/15"
          : "text-slate-400 hover:bg-slate-700 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
