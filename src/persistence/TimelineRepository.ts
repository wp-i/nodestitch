import type { TimelineDocument } from "../domain/timeline";

export interface TimelineRepository {
  load(): Promise<TimelineDocument>;
  save(document: TimelineDocument): Promise<void>;
}
