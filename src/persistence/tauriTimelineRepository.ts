import { invoke } from "@tauri-apps/api/core";
import { assertTimelineDocument, type TimelineDocument } from "../domain/timeline";
import type { TimelineRepository } from "./TimelineRepository";

export const tauriTimelineRepository: TimelineRepository = {
  async load() {
    const document = await invoke<TimelineDocument>("load_timeline_state");
    assertTimelineDocument(document);
    return document;
  },

  async save(document) {
    assertTimelineDocument(document);
    await invoke("save_timeline_state", { document });
  },
};
