export const MARKER_COLORS = ["green", "blue", "red"] as const;
export const MIN_EDITOR_HEIGHT = 53;

export type MarkerColor = (typeof MARKER_COLORS)[number];

export interface TimelineNode {
  readonly id: string;
  readonly order: number;
  readonly text: string;
  readonly createdAt: number;
  readonly color: MarkerColor;
  /** The user's preferred inline-editor height, in CSS pixels. */
  readonly editorHeight?: number;
}

export interface ArchivedNode extends TimelineNode {
  readonly archivedAt: number;
}

export interface TimelineDocument {
  readonly schemaVersion: 1;
  readonly activeNodes: readonly TimelineNode[];
  readonly archivedNodes: readonly ArchivedNode[];
}

export const EMPTY_TIMELINE: TimelineDocument = Object.freeze({
  schemaVersion: 1,
  activeNodes: Object.freeze([]),
  archivedNodes: Object.freeze([]),
});

export class TimelineRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineRuleError";
  }
}

function assertText(text: string): void {
  if (text.trim().length === 0) {
    throw new TimelineRuleError("节点内容不能为空");
  }
}

function assertTimestamp(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TimelineRuleError(`${field} 无效`);
  }
}

function assertMarkerColor(color: string): asserts color is MarkerColor {
  if (!(MARKER_COLORS as readonly string[]).includes(color)) {
    throw new TimelineRuleError("节点颜色无效");
  }
}

function assertEditorHeight(value: number | undefined): void {
  if (value === undefined) return;
  if (!Number.isSafeInteger(value) || value < MIN_EDITOR_HEIGHT) {
    throw new TimelineRuleError("Editor height is invalid");
  }
}

export function assertTimelineDocument(document: TimelineDocument): void {
  if (document.schemaVersion !== 1) {
    throw new TimelineRuleError("不支持的数据版本");
  }

  const ids = new Set<string>();
  document.activeNodes.forEach((node, index) => {
    if (!node.id || ids.has(node.id)) {
      throw new TimelineRuleError("节点标识无效或重复");
    }
    ids.add(node.id);
    if (node.order !== index) {
      throw new TimelineRuleError("节点顺序不连续");
    }
    assertText(node.text);
    assertTimestamp(node.createdAt, "创建时间");
    assertMarkerColor(node.color);
    assertEditorHeight(node.editorHeight);
  });

  document.archivedNodes.forEach((node) => {
    if (!node.id || ids.has(node.id)) {
      throw new TimelineRuleError("历史节点标识无效或重复");
    }
    ids.add(node.id);
    if (!Number.isSafeInteger(node.order) || node.order < 0) {
      throw new TimelineRuleError("历史节点顺序无效");
    }
    assertText(node.text);
    assertTimestamp(node.createdAt, "创建时间");
    assertTimestamp(node.archivedAt, "归档时间");
    if (node.archivedAt < node.createdAt) {
      throw new TimelineRuleError("归档时间早于创建时间");
    }
    assertMarkerColor(node.color);
    assertEditorHeight(node.editorHeight);
  });
}

function nextDocument(
  document: TimelineDocument,
  activeNodes: readonly TimelineNode[],
  archivedNodes: readonly ArchivedNode[] = document.archivedNodes,
): TimelineDocument {
  const candidate: TimelineDocument = {
    schemaVersion: 1,
    activeNodes,
    archivedNodes,
  };
  assertTimelineDocument(candidate);
  return candidate;
}

export function createNode(
  document: TimelineDocument,
  input: { id: string; text: string; color?: MarkerColor; createdAt: number },
): TimelineDocument {
  assertTimelineDocument(document);
  assertText(input.text);
  assertTimestamp(input.createdAt, "创建时间");
  const color = input.color ?? "green";
  assertMarkerColor(color);
  if (!input.id || [...document.activeNodes, ...document.archivedNodes].some((node) => node.id === input.id)) {
    throw new TimelineRuleError("节点标识无效或重复");
  }

  return nextDocument(document, [
    ...document.activeNodes,
    {
      id: input.id,
      order: document.activeNodes.length,
      text: input.text,
      createdAt: input.createdAt,
      color,
    },
  ]);
}

export function editNode(
  document: TimelineDocument,
  id: string,
  text: string,
  editorHeight?: number,
): TimelineDocument {
  assertText(text);
  assertEditorHeight(editorHeight);
  let found = false;
  const activeNodes = document.activeNodes.map((node) => {
    if (node.id !== id) return node;
    found = true;
    return editorHeight === undefined ? { ...node, text } : { ...node, text, editorHeight };
  });
  if (!found) throw new TimelineRuleError("节点不存在");
  return nextDocument(document, activeNodes);
}

export function recolorNode(
  document: TimelineDocument,
  id: string,
  color: MarkerColor,
): TimelineDocument {
  assertMarkerColor(color);
  let found = false;
  const activeNodes = document.activeNodes.map((node) => {
    if (node.id !== id) return node;
    found = true;
    return { ...node, color };
  });
  if (!found) throw new TimelineRuleError("节点不存在");
  return nextDocument(document, activeNodes);
}

export function reorderNode(
  document: TimelineDocument,
  id: string,
  targetIndex: number,
): TimelineDocument {
  const sourceIndex = document.activeNodes.findIndex((node) => node.id === id);
  if (sourceIndex < 0) throw new TimelineRuleError("节点不存在");
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= document.activeNodes.length) {
    throw new TimelineRuleError("目标顺序无效");
  }
  if (sourceIndex === targetIndex) return document;

  const reordered = [...document.activeNodes];
  const [moving] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moving);
  return nextDocument(
    document,
    reordered.map((node, order) => ({ ...node, order })),
  );
}

export function archiveNode(
  document: TimelineDocument,
  id: string,
  archivedAt: number,
): TimelineDocument {
  assertTimestamp(archivedAt, "归档时间");
  const archived = document.activeNodes.find((node) => node.id === id);
  if (!archived) throw new TimelineRuleError("节点不存在");
  if (archivedAt < archived.createdAt) throw new TimelineRuleError("归档时间早于创建时间");

  const activeNodes = document.activeNodes
    .filter((node) => node.id !== id)
    .map((node, order) => ({ ...node, order }));
  return nextDocument(document, activeNodes, [
    ...document.archivedNodes,
    { ...archived, archivedAt },
  ]);
}
