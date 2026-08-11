import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimelineController } from "../application/TimelineController";
import { EMPTY_TIMELINE, MARKER_COLORS, createNode, type TimelineDocument } from "../domain/timeline";
import type { TimelineRepository } from "../persistence/TimelineRepository";
import { App } from "./App";
import "./styles.css";

class MemoryRepository implements TimelineRepository {
  document: TimelineDocument = EMPTY_TIMELINE;
  async load() { return this.document; }
  async save(document: TimelineDocument) { this.document = document; }
}

describe("App", () => {
  it("keeps the primary surface restrained and supports add, double-click edit, archive, and history", async () => {
    const repository = new MemoryRepository();
    const controller = new TimelineController(repository, {
      now: (() => {
        let value = 100;
        return () => value++;
      })(),
      createId: () => "node-a",
    });
    const user = userEvent.setup();
    const { container } = render(<App controller={controller} />);

    const composer = await screen.findByPlaceholderText("写下下一步…");
    expect(container).not.toHaveTextContent("时间线");
    expect(container).not.toHaveTextContent("颜色");
    const initialHistoryToggle = screen.getByRole("button", { name: "历史节点" });
    expect(initialHistoryToggle).toHaveTextContent("");
    expect(initialHistoryToggle).toHaveAttribute("aria-pressed", "false");
    expect(initialHistoryToggle).not.toHaveAttribute("title");
    expect(screen.queryByRole("button", { name: "最大化" })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".window-controls button")).toHaveLength(2);

    await user.type(composer, "第一个节点");
    const addAction = screen.getByRole("button", { name: "添加节点" });
    expect(addAction).not.toHaveAttribute("title");
    await user.click(addAction);
    const nodeButton = await waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>(".timeline-card .node-copy");
      expect(element).not.toBeNull();
      return element!;
    });
    expect(nodeButton).toHaveTextContent("第一个节点");
    expect(nodeButton).not.toHaveAttribute("title");
    expect(container.querySelector(".node-marker")).not.toHaveAttribute("title");
    expect(container.querySelector(".drag-handle")).not.toHaveAttribute("title");

    await user.dblClick(nodeButton);
    const editor = screen.getByLabelText("编辑节点 1");
    await user.clear(editor);
    await user.type(editor, "修复后的节点");
    fireEvent.keyDown(editor, { key: "Enter" });
    await waitFor(() => expect(container.querySelector(".timeline-card .node-copy")).toHaveTextContent("修复后的节点"));

    const archiveAction = screen.getByRole("button", { name: "归档节点 1" });
    expect(archiveAction.querySelector(".lucide-trash-2")).not.toBeNull();
    expect(archiveAction).not.toHaveAttribute("title");
    await user.click(archiveAction);
    await waitFor(() => expect(container.querySelector(".timeline-card .node-copy")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "历史节点" }));
    expect(await screen.findByText("修复后的节点")).toBeInTheDocument();
    const historyToggle = screen.getByRole("button", { name: "历史节点" });
    expect(historyToggle).toHaveAttribute("aria-pressed", "true");
    expect(historyToggle).not.toHaveAttribute("title");
    expect(screen.queryByRole("button", { name: "返回时间线" })).not.toBeInTheDocument();

    await user.click(historyToggle);
    expect(await screen.findByPlaceholderText("写下下一步…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "历史节点" })).toHaveAttribute("aria-pressed", "false");
  });

  it("renders ten nodes inside one vertical scroller without horizontal overflow rules", async () => {
    const repository = new MemoryRepository();
    let document = EMPTY_TIMELINE;
    for (let index = 0; index < 10; index += 1) {
      document = createNode(document, {
        id: `node-${index + 1}`,
        text: index === 4 ? "这是一个用于验证窄窗口自动换行且不会横向溢出的较长节点内容" : `节点 ${index + 1}`,
        createdAt: 100 + index,
        color: MARKER_COLORS[index % MARKER_COLORS.length],
      });
    }
    repository.document = document;
    const controller = new TimelineController(repository);
    const { container } = render(<App controller={controller} />);

    await waitFor(() => expect(container.querySelectorAll(".timeline-card .node-copy")).toHaveLength(10));
    const scrollContainer = container.querySelector<HTMLElement>(".app-content")!;
    expect(scrollContainer).toHaveClass("app-content");
    expect(scrollContainer.querySelectorAll(".timeline-card .timeline-node")).toHaveLength(10);
    const longCopy = screen.getByText("这是一个用于验证窄窗口自动换行且不会横向溢出的较长节点内容");
    expect(longCopy.closest(".node-content")).not.toBeNull();
  });

  it("expands a long node editor to its content height when editing starts", async () => {
    const repository = new MemoryRepository();
    repository.document = createNode(EMPTY_TIMELINE, {
      id: "node-long",
      text: "这是一个会在窄窗口中自动换成多行、双击后应当直接获得合适编辑高度的长文本节点。",
      createdAt: 100,
      color: "green",
    });
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(118);
    const offsetHeight = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(55);
    const clientHeight = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockReturnValue(53);

    try {
      const controller = new TimelineController(repository);
      render(<App controller={controller} />);

      const nodeCopy = await screen.findByText(repository.document.activeNodes[0].text);
      fireEvent.doubleClick(nodeCopy.closest("button")!);

      const editor = screen.getByLabelText("编辑节点 1");
      expect(editor).toHaveStyle({ height: "120px" });
      expect(getComputedStyle(editor).maxHeight).toBe("none");
    } finally {
      scrollHeight.mockRestore();
      offsetHeight.mockRestore();
      clientHeight.mockRestore();
    }
  });
});
