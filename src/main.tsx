import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TimelineController } from "./application/TimelineController";
import { App } from "./app/App";
import { tauriTimelineRepository } from "./persistence/tauriTimelineRepository";
import "./app/styles.css";

const controller = new TimelineController(tauriTimelineRepository);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
