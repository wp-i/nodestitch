import { describe, expect, it } from "vitest";
import {
  EMPTY_TIMELINE,
  TimelineRuleError,
  archiveNode,
  createNode,
  editNode,
  recolorNode,
  reorderNode,
} from "./timeline";

const first = () => createNode(EMPTY_TIMELINE, { id: "a", text: "  保留原文  ", createdAt: 100 });

describe("timeline domain", () => {
  it("appends nodes with explicit order and green by default", () => {
    const document = createNode(first(), { id: "b", text: "第二个", color: "blue", createdAt: 101 });
    expect(document.activeNodes.map(({ id, order, color }) => ({ id, order, color }))).toEqual([
      { id: "a", order: 0, color: "green" },
      { id: "b", order: 1, color: "blue" },
    ]);
    expect(document.activeNodes[0].text).toBe("  保留原文  ");
  });

  it("edits text and color without changing creation time", () => {
    const edited = recolorNode(editNode(first(), "a", "修复后的文本"), "a", "red");
    expect(edited.activeNodes[0]).toMatchObject({ text: "修复后的文本", color: "red", createdAt: 100 });
  });

  it("reorders nodes and normalizes explicit order", () => {
    let document = first();
    document = createNode(document, { id: "b", text: "B", createdAt: 101 });
    document = createNode(document, { id: "c", text: "C", createdAt: 102 });
    const reordered = reorderNode(document, "a", 2);
    expect(reordered.activeNodes.map((node) => [node.id, node.order])).toEqual([
      ["b", 0],
      ["c", 1],
      ["a", 2],
    ]);
  });

  it("atomically transfers a complete snapshot to read-only history", () => {
    const archived = archiveNode(first(), "a", 150);
    expect(archived.activeNodes).toHaveLength(0);
    expect(archived.archivedNodes).toEqual([
      { id: "a", order: 0, text: "  保留原文  ", createdAt: 100, color: "green", archivedAt: 150 },
    ]);
  });

  it("rejects blank text, invalid colors, and duplicate ids", () => {
    expect(() => createNode(EMPTY_TIMELINE, { id: "a", text: "   ", createdAt: 1 })).toThrow(TimelineRuleError);
    expect(() => createNode(first(), { id: "a", text: "重复", createdAt: 2 })).toThrow(TimelineRuleError);
    expect(() => recolorNode(first(), "a", "yellow" as never)).toThrow(TimelineRuleError);
  });
});
