// ツリー操作 (純粋関数)。ReviewProject を不変更新する。
import type { ReviewProject, TurnNode } from "./types";
import { createNode, duplicateSubtree, nowIso } from "./factory";

// ルートから順に DFS で並べたノード配列 (depth付き)。
export type FlatNode = { node: TurnNode; depth: number; isLastChild: boolean };

export function flattenTree(project: ReviewProject): FlatNode[] {
  const result: FlatNode[] = [];
  const visit = (id: string, depth: number, isLastChild: boolean) => {
    const node = project.nodes[id];
    if (!node) return;
    result.push({ node, depth, isLastChild });
    node.childIds.forEach((childId, i) =>
      visit(childId, depth + 1, i === node.childIds.length - 1)
    );
  };
  visit(project.rootNodeId, 0, true);
  return result;
}

export function getChildren(project: ReviewProject, id: string): TurnNode[] {
  const node = project.nodes[id];
  if (!node) return [];
  return node.childIds.map((c) => project.nodes[c]).filter(Boolean);
}

// サブツリーに含まれる全ノードIDを集める。
function collectSubtreeIds(project: ReviewProject, id: string): string[] {
  const ids: string[] = [];
  const visit = (nid: string) => {
    const node = project.nodes[nid];
    if (!node) return;
    ids.push(nid);
    node.childIds.forEach(visit);
  };
  visit(id);
  return ids;
}

export function updateNode(
  project: ReviewProject,
  id: string,
  patch: Partial<TurnNode>
): ReviewProject {
  const node = project.nodes[id];
  if (!node) return project;
  const updated: TurnNode = { ...node, ...patch, updatedAt: nowIso() };
  return {
    ...project,
    nodes: { ...project.nodes, [id]: updated },
    updatedAt: nowIso(),
  };
}

// 親ノードの子として新規ノードを追加。新ノードのIDも返す。
export function addChild(
  project: ReviewProject,
  parentId: string
): { project: ReviewProject; newId: string } {
  const parent = project.nodes[parentId];
  if (!parent) return { project, newId: "" };
  const child = createNode(project.mode, {
    parentId,
    turnNumber: parent.turnNumber + 1,
    title: `Turn ${parent.turnNumber + 1}：新しい分岐`,
  });
  const newNodes = {
    ...project.nodes,
    [child.id]: child,
    [parentId]: { ...parent, childIds: [...parent.childIds, child.id] },
  };
  return {
    project: { ...project, nodes: newNodes, updatedAt: nowIso() },
    newId: child.id,
  };
}

// 兄弟ノードを追加 (同じ親の子として)。ルートには追加不可。
export function addSibling(
  project: ReviewProject,
  nodeId: string
): { project: ReviewProject; newId: string } {
  const node = project.nodes[nodeId];
  if (!node || !node.parentId) return { project, newId: "" };
  return addChild(project, node.parentId);
}

export function duplicateNode(
  project: ReviewProject,
  id: string
): { project: ReviewProject; newId: string } {
  const node = project.nodes[id];
  if (!node) return { project, newId: "" };

  // ルートを複製する場合は子として付けられないので、新しい兄弟が作れない。
  // ルート複製は子ツリーとして自身にぶら下げる挙動を避け、親があれば兄弟化する。
  const parentId = node.parentId;
  const { newRootId, added } = duplicateSubtree(project.nodes, id, parentId);

  const newNodes = { ...project.nodes, ...added };
  if (parentId && newNodes[parentId]) {
    newNodes[parentId] = {
      ...newNodes[parentId],
      childIds: [...newNodes[parentId].childIds, newRootId],
    };
  } else {
    // ルートを複製した場合は新ルートをルート直下の子として付ける。
    newNodes[newRootId] = { ...newNodes[newRootId], parentId: id };
    newNodes[id] = {
      ...newNodes[id],
      childIds: [...newNodes[id].childIds, newRootId],
    };
  }
  return {
    project: { ...project, nodes: newNodes, updatedAt: nowIso() },
    newId: newRootId,
  };
}

// ノードとそのサブツリーを削除。ルートは削除不可。削除後に選択すべきIDを返す。
export function deleteNode(
  project: ReviewProject,
  id: string
): { project: ReviewProject; selectId: string } {
  const node = project.nodes[id];
  if (!node) return { project, selectId: project.rootNodeId };
  if (id === project.rootNodeId) {
    // ルートは削除できない。
    return { project, selectId: project.rootNodeId };
  }
  const idsToRemove = new Set(collectSubtreeIds(project, id));
  const newNodes: Record<string, TurnNode> = {};
  for (const [nid, n] of Object.entries(project.nodes)) {
    if (idsToRemove.has(nid)) continue;
    newNodes[nid] = n;
  }
  // 親から自身を取り除く。
  const parentId = node.parentId;
  let selectId = project.rootNodeId;
  if (parentId && newNodes[parentId]) {
    newNodes[parentId] = {
      ...newNodes[parentId],
      childIds: newNodes[parentId].childIds.filter((c) => c !== id),
    };
    selectId = parentId;
  }
  return {
    project: { ...project, nodes: newNodes, updatedAt: nowIso() },
    selectId,
  };
}

// ルートからノードまでのパス (祖先の配列, 自身を含む)。
export function getPath(project: ReviewProject, id: string): TurnNode[] {
  const path: TurnNode[] = [];
  let current: TurnNode | undefined = project.nodes[id];
  while (current) {
    path.unshift(current);
    current = current.parentId ? project.nodes[current.parentId] : undefined;
  }
  return path;
}

// 葉ノード = ルートまでのルート(経路)を表す。ルート比較画面で使用。
export function getLeafRoutes(project: ReviewProject): TurnNode[][] {
  const leaves = Object.values(project.nodes).filter(
    (n) => n.childIds.length === 0
  );
  return leaves.map((leaf) => getPath(project, leaf.id));
}
