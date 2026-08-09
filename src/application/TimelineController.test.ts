import { describe, expect, it } from "vitest";
import { EMPTY_TIMELINE, type TimelineDocument } from "../domain/timeline";
import type { TimelineRepository } from "../persistence/TimelineRepository";
import { TimelineController } from "./TimelineController";

class MemoryRepository implements TimelineRepository {
  document: TimelineDocument = EMPTY_TIMELINE;
  failNextSave = false;

  async load() {
    return this.document;
  }

  async save(document: TimelineDocument) {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("磁盘不可写");
    }
    this.document = document;
  }
}

describe("TimelineController", () => {
  it("publishes only after persistence succeeds", async () => {
    const repository = new MemoryRepository();
    const controller = new TimelineController(repository, { now: () => 100, createId: () => "a" });
    await controller.start();
    repository.failNextSave = true;
    await expect(controller.add("不会留下半成品")).rejects.toThrow("磁盘不可写");
    expect(controller.getSnapshot().document).toBe(EMPTY_TIMELINE);
    expect(repository.document).toBe(EMPTY_TIMELINE);
  });

  it("serializes mutations against the last committed document", async () => {
    const repository = new MemoryRepository();
    let id = 0;
    const controller = new TimelineController(repository, { now: () => 100, createId: () => String(++id) });
    await controller.start();
    await Promise.all([controller.add("A"), controller.add("B", "blue")]);
    expect(controller.getSnapshot().document.activeNodes.map((node) => node.text)).toEqual(["A", "B"]);
  });
});
