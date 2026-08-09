import {
  EMPTY_TIMELINE,
  archiveNode,
  createNode,
  editNode,
  recolorNode,
  reorderNode,
  type MarkerColor,
  type TimelineDocument,
} from "../domain/timeline";
import type { TimelineRepository } from "../persistence/TimelineRepository";

export interface TimelineSnapshot {
  readonly status: "loading" | "ready" | "error";
  readonly document: TimelineDocument;
  readonly pending: boolean;
  readonly error: string | null;
}

export interface TimelineControllerOptions {
  readonly now?: () => number;
  readonly createId?: () => string;
}

export class TimelineController {
  private snapshot: TimelineSnapshot = {
    status: "loading",
    document: EMPTY_TIMELINE,
    pending: false,
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private operation = Promise.resolve();
  private started: Promise<void> | null = null;
  private readonly now: () => number;
  private readonly createId: () => string;

  constructor(
    private readonly repository: TimelineRepository,
    options: TimelineControllerOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.createId = options.createId ?? (() => crypto.randomUUID());
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): TimelineSnapshot => this.snapshot;

  start(): Promise<void> {
    if (this.started) return this.started;
    this.started = this.repository
      .load()
      .then((document) => {
        this.publish({ status: "ready", document, pending: false, error: null });
      })
      .catch((error: unknown) => {
        this.publish({
          ...this.snapshot,
          status: "error",
          pending: false,
          error: this.messageFor(error, "无法读取本地时间线"),
        });
      });
    return this.started;
  }

  retryLoad(): Promise<void> {
    this.started = null;
    this.publish({ ...this.snapshot, status: "loading", error: null });
    return this.start();
  }

  add(text: string, color: MarkerColor = "green"): Promise<string> {
    const id = this.createId();
    return this.commit((document) =>
      createNode(document, {
        id,
        text,
        color,
        createdAt: this.now(),
      }),
    ).then(() => id);
  }

  edit(id: string, text: string): Promise<void> {
    return this.commit((document) => editNode(document, id, text));
  }

  recolor(id: string, color: MarkerColor): Promise<void> {
    return this.commit((document) => recolorNode(document, id, color));
  }

  reorder(id: string, targetIndex: number): Promise<void> {
    return this.commit((document) => reorderNode(document, id, targetIndex));
  }

  archive(id: string): Promise<void> {
    return this.commit((document) => archiveNode(document, id, this.now()));
  }

  clearError(): void {
    if (this.snapshot.error) this.publish({ ...this.snapshot, error: null });
  }

  private commit(transform: (document: TimelineDocument) => TimelineDocument): Promise<void> {
    const task = this.operation.then(async () => {
      let candidate: TimelineDocument;
      try {
        candidate = transform(this.snapshot.document);
      } catch (error: unknown) {
        this.publish({
          ...this.snapshot,
          pending: false,
          error: this.messageFor(error, "本次更改无效"),
        });
        throw error;
      }
      this.publish({ ...this.snapshot, pending: true, error: null });
      try {
        await this.repository.save(candidate);
        this.publish({ status: "ready", document: candidate, pending: false, error: null });
      } catch (error: unknown) {
        this.publish({
          ...this.snapshot,
          pending: false,
          error: this.messageFor(error, "无法保存本次更改"),
        });
        throw error;
      }
    });
    this.operation = task.catch(() => undefined);
    return task;
  }

  private publish(snapshot: TimelineSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  private messageFor(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
