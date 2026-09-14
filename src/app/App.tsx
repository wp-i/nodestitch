import {
  Clock3,
  Plus,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import {
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { TimelineController } from "../application/TimelineController";
import {
  MARKER_COLORS,
  MIN_EDITOR_HEIGHT,
  type ArchivedNode,
  type MarkerColor,
  type TimelineNode,
} from "../domain/timeline";
import {
  animateNodeEntry,
  animateNodeExit,
  animateNodeMove,
  prefersReducedMotion,
} from "../presentation/motion";
import { formatNodeTime, toDateTime } from "../presentation/time";
import { WindowChrome } from "./WindowChrome";

interface AppProps {
  readonly controller: TimelineController;
}

const COLOR_NAMES: Record<MarkerColor, string> = {
  green: "绿色",
  blue: "蓝色",
  red: "红色",
};

function ReorderGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 4.5h6M3.5 8h9M5 11.5h6" />
    </svg>
  );
}

function ignoreRejected(promise: Promise<void>) {
  void promise.catch(() => undefined);
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function MarkerPalette({ value, onChange, disabled = false }: {
  readonly value: MarkerColor;
  readonly onChange: (color: MarkerColor) => void;
  readonly disabled?: boolean;
}) {
  return (
    <div className="marker-palette" role="group" aria-label="节点颜色">
      {MARKER_COLORS.map((color) => (
        <button
          key={color}
          className={`color-choice color-${color}`}
          type="button"
          aria-label={COLOR_NAMES[color]}
          aria-pressed={value === color}
          disabled={disabled}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}

function NodeTime({ timestamp }: { readonly timestamp: number }) {
  return (
    <time dateTime={toDateTime(timestamp)} title={new Date(timestamp).toLocaleString()}>
      {formatNodeTime(timestamp)}
    </time>
  );
}

function ActiveNodeRow({
  node,
  index,
  isLast,
  disabled,
  dragOver,
  exiting,
  onEdit,
  onRecolor,
  onArchive,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  readonly node: TimelineNode;
  readonly index: number;
  readonly isLast: boolean;
  readonly disabled: boolean;
  readonly dragOver: boolean;
  readonly exiting: boolean;
  readonly onEdit: (text: string, editorHeight?: number) => Promise<void>;
  readonly onRecolor: (color: MarkerColor) => void;
  readonly onArchive: () => void;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLElement>) => void;
  readonly onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.text);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const committingRef = useRef(false);
  const manualHeightRef = useRef<number | null>(null);
  const automaticHeightRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editing) setDraft(node.text);
  }, [editing, node.text]);

  useLayoutEffect(() => {
    if (!editing) return;
    manualHeightRef.current = node.editorHeight ?? null;
    automaticHeightRef.current = null;
  }, [editing]);

  useLayoutEffect(() => {
    if (!editing) return;
    const editor = editRef.current;
    if (!editor) return;

    editor.style.height = "auto";
    const borderHeight = editor.offsetHeight - editor.clientHeight;
    const contentHeight = Math.max(MIN_EDITOR_HEIGHT, editor.scrollHeight + borderHeight);
    const height = Math.max(contentHeight, manualHeightRef.current ?? 0);
    editor.style.height = `${height}px`;
    automaticHeightRef.current = height;
  }, [draft, editing]);

  useEffect(() => {
    if (!editing) return;
    const editor = editRef.current;
    if (!editor) return;
    editor.focus();
    editor.setSelectionRange(draft.length, draft.length);
  }, [editing]);

  const captureManualHeight = () => {
    const editor = editRef.current;
    if (!editor || automaticHeightRef.current === null) return;
    const rectHeight = editor.getBoundingClientRect().height;
    const currentHeight = Math.round(
      rectHeight || editor.offsetHeight || Number.parseFloat(editor.style.height),
    );
    if (
      Number.isFinite(currentHeight) &&
      currentHeight >= MIN_EDITOR_HEIGHT &&
      currentHeight !== automaticHeightRef.current
    ) {
      manualHeightRef.current = currentHeight;
    }
  };

  const finishEditing = async () => {
    if (committingRef.current) return;
    captureManualHeight();
    const editorHeight = manualHeightRef.current ?? undefined;
    if (draft === node.text && editorHeight === node.editorHeight) {
      setEditing(false);
      return;
    }
    committingRef.current = true;
    try {
      await onEdit(draft, editorHeight);
      setEditing(false);
    } finally {
      committingRef.current = false;
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(node.text);
      setEditing(false);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const handleGripKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setEditing(true);
      return;
    }
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      onMove(-1);
    }
    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      onMove(1);
    }
  };

  const nextColor = MARKER_COLORS[(MARKER_COLORS.indexOf(node.color) + 1) % MARKER_COLORS.length];

  return (
    <article
      className={`timeline-node${dragOver ? " is-drag-over" : ""}${exiting ? " is-exiting" : ""}`}
      data-node-id={node.id}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="timeline-rail" aria-hidden="true">
        <button
          className={`node-marker color-${node.color}`}
          type="button"
          aria-label={`当前${COLOR_NAMES[node.color]}，切换为${COLOR_NAMES[nextColor]}`}
          disabled={disabled}
          onClick={() => onRecolor(nextColor)}
        />
        {!isLast && <span className="rail-line" />}
      </div>

      <div className="node-content">
        {editing ? (
          <textarea
            ref={editRef}
            className="node-editor"
            aria-label={`编辑节点 ${index + 1}`}
            value={draft}
            rows={2}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleEditorKeyDown}
            onMouseUp={captureManualHeight}
            onTouchEnd={captureManualHeight}
            onBlur={() => ignoreRejected(finishEditing())}
          />
        ) : (
          <button
            className="node-copy"
            type="button"
            disabled={disabled}
            onDoubleClick={() => setEditing(true)}
          >
            <span>{node.text}</span>
            <NodeTime timestamp={node.createdAt} />
          </button>
        )}
      </div>

      <div className="node-actions">
        <button
          className="node-action drag-handle"
          type="button"
          draggable={!disabled}
          disabled={disabled}
          aria-label={`拖动节点 ${index + 1}，Alt 加上下方向键也可排序，Enter 编辑`}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onKeyDown={handleGripKeyDown}
        >
          <ReorderGlyph />
        </button>
        <button
          className="node-action archive-action"
          type="button"
          disabled={disabled}
          aria-label={`归档节点 ${index + 1}`}
          onClick={onArchive}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function TimelineList({ controller, nodes, pending, enteringId }: {
  readonly controller: TimelineController;
  readonly nodes: readonly TimelineNode[];
  readonly pending: boolean;
  readonly enteringId: string | null;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const listRef = useRef<HTMLElement>(null);
  const positionsRef = useRef(new Map<string, DOMRect>());
  const lastAnimatedEntryRef = useRef<string | null>(null);

  const nodeElements = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-node-id]") ?? []);

  const measurePositions = () =>
    new Map(
      nodeElements().map((element) => [element.dataset.nodeId!, element.getBoundingClientRect()]),
    );

  useLayoutEffect(() => {
    const previous = positionsRef.current;
    const current = measurePositions();
    current.forEach((rect, id) => {
      const oldRect = previous.get(id);
      const element = nodeElements().find((candidate) => candidate.dataset.nodeId === id);
      if (oldRect && element) animateNodeMove(element, oldRect.top - rect.top);
    });
    positionsRef.current = current;
  }, [nodes]);

  useLayoutEffect(() => {
    if (!enteringId || lastAnimatedEntryRef.current === enteringId) return;
    const element = nodeElements().find((candidate) => candidate.dataset.nodeId === enteringId);
    if (!element) return;
    lastAnimatedEntryRef.current = enteringId;
    animateNodeEntry(nodes.length === 1 ? listRef.current! : element);
  }, [enteringId, nodes]);

  const archiveWithMotion = async (id: string) => {
    if (exitingId || pending) return;
    setExitingId(id);
    await nextAnimationFrame();
    const element = nodeElements().find((candidate) => candidate.dataset.nodeId === id);
    const animation = element ? await animateNodeExit(element) : null;
    positionsRef.current = measurePositions();
    try {
      await controller.archive(id);
    } catch {
      // The controller owns the user-visible persistence error.
    } finally {
      animation?.cancel();
      setExitingId(null);
      void nextAnimationFrame().then(() => {
        positionsRef.current = measurePositions();
      });
    }
  };

  return (
    <section ref={listRef} className="timeline-card" aria-label="节点时间线">
      {nodes.map((node, index) => (
        <ActiveNodeRow
          key={node.id}
          node={node}
          index={index}
          isLast={index === nodes.length - 1}
          disabled={pending || exitingId !== null}
          dragOver={dragOverId === node.id && draggingId !== node.id}
          exiting={exitingId === node.id}
          onEdit={(text, editorHeight) => controller.edit(node.id, text, editorHeight)}
          onRecolor={(color) => ignoreRejected(controller.recolor(node.id, color))}
          onArchive={() => void archiveWithMotion(node.id)}
          onMove={(direction) => {
            const targetIndex = Math.max(0, Math.min(nodes.length - 1, index + direction));
            if (targetIndex !== index) ignoreRejected(controller.reorder(node.id, targetIndex));
          }}
          onDragStart={(event) => {
            setDraggingId(node.id);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", node.id);
          }}
          onDragOver={(event) => {
            if (!draggingId || draggingId === node.id) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDragOverId(node.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const movingId = draggingId ?? event.dataTransfer.getData("text/plain");
            setDraggingId(null);
            setDragOverId(null);
            if (movingId && movingId !== node.id) ignoreRejected(controller.reorder(movingId, index));
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDragOverId(null);
          }}
        />
      ))}
    </section>
  );
}

function Composer({ controller, pending, onAdded }: {
  readonly controller: TimelineController;
  readonly pending: boolean;
  readonly onAdded: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [color, setColor] = useState<MarkerColor>("green");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!text.trim() || pending) return;
    const id = await controller.add(text, color);
    setText("");
    setColor("green");
    onAdded(id);
    textareaRef.current?.focus();
  };

  return (
    <form className="composer-card" aria-label="添加节点" onSubmit={(event) => ignoreRejected(submit(event))}>
      <div className="composer-heading">
        <span className={`composer-dot color-${color}`} aria-hidden="true" />
        <span>添加节点</span>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        rows={3}
        disabled={pending}
        aria-label="节点内容"
        placeholder="写下下一步…"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            ignoreRejected(submit());
          }
        }}
      />
      <div className="composer-footer">
        <MarkerPalette value={color} disabled={pending} onChange={setColor} />
        <button
          className="add-button"
          type="submit"
          disabled={pending || !text.trim()}
          aria-label="添加节点"
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function ArchivedNodeRow({ node, isLast }: { readonly node: ArchivedNode; readonly isLast: boolean }) {
  return (
    <article className="timeline-node history-node">
      <div className="timeline-rail" aria-hidden="true">
        <span className={`node-marker color-${node.color}`} />
        {!isLast && <span className="rail-line" />}
      </div>
      <div className="node-content">
        <div className="node-copy history-copy" title={`归档于 ${new Date(node.archivedAt).toLocaleString()}`}>
          <span>{node.text}</span>
          <NodeTime timestamp={node.createdAt} />
        </div>
      </div>
    </article>
  );
}

function HistoryView({ nodes, onToggle }: { readonly nodes: readonly ArchivedNode[]; readonly onToggle: () => void }) {
  const ordered = [...nodes].reverse();
  return (
    <main className="app-content history-view">
      <div className="view-toolbar">
        <button
          className="toolbar-button"
          type="button"
          aria-label="历史节点"
          aria-pressed="true"
          onClick={onToggle}
        >
          <Clock3 aria-hidden="true" />
        </button>
      </div>
      <div className="content-scroll">
        {ordered.length ? (
        <section className="timeline-card history-card" aria-label="历史节点">
            {ordered.map((node, index) => (
            <ArchivedNodeRow key={node.id} node={node} isLast={index === ordered.length - 1} />
            ))}
        </section>
      ) : (
        <div className="empty-history" role="status" aria-label="暂无历史节点">
          <Clock3 aria-hidden="true" />
        </div>
      )}
      </div>
    </main>
  );
}

function ErrorNotice({ message, retry, onClose }: {
  readonly message: string;
  readonly retry?: () => void;
  readonly onClose?: () => void;
}) {
  return (
    <div className="error-notice" role="alert">
      <span>{message}</span>
      <div>
        {retry && (
          <button type="button" aria-label="重试" onClick={retry}>
            <RotateCw aria-hidden="true" />
          </button>
        )}
        {onClose && (
          <button type="button" aria-label="关闭提示" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function SavingIndicator({ active }: { readonly active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, [active]);

  return visible ? <span className="saving-indicator" role="status" aria-label="正在保存" /> : null;
}

export function App({ controller }: AppProps) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [showHistory, setShowHistory] = useState(false);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void controller.start();
  }, [controller]);

  const handleAdded = (id: string) => {
    setEnteringId(id);
    void nextAnimationFrame().then(() => nextAnimationFrame()).then(() => {
      const content = contentRef.current;
      if (!content) return;
      const scrollTarget = content.querySelector<HTMLElement>(".timeline-card") ?? content;
      if (typeof scrollTarget.scrollTo === "function") {
        scrollTarget.scrollTo({
          top: scrollTarget.scrollHeight,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      } else {
        scrollTarget.scrollTop = scrollTarget.scrollHeight;
      }
    });
  };

  return (
    <div className="app-shell">
      <WindowChrome />
      {showHistory ? (
        <HistoryView nodes={snapshot.document.archivedNodes} onToggle={() => setShowHistory(false)} />
      ) : (
        <main ref={contentRef} className="app-content">
          <div className="view-toolbar">
            <SavingIndicator active={snapshot.pending} />
            <button
              className="toolbar-button"
              type="button"
              aria-label="历史节点"
              aria-pressed="false"
              onClick={() => setShowHistory(true)}
            >
              <Clock3 aria-hidden="true" />
            </button>
          </div>

          <div ref={contentRef} className="content-scroll">
            {snapshot.status === "loading" ? (
            <div className="loading-state" role="status" aria-label="正在读取时间线">
              <span />
            </div>
          ) : (
            <>
                {snapshot.document.activeNodes.length > 0 && (
                  <TimelineList
                    controller={controller}
                    nodes={snapshot.document.activeNodes}
                    pending={snapshot.pending}
                    enteringId={enteringId}
                  />
                )}
                <Composer
                  controller={controller}
                  pending={snapshot.pending || snapshot.status === "error"}
                  onAdded={handleAdded}
                />
            </>
          )}
          </div>
        </main>
      )}

      {snapshot.error && (
        <ErrorNotice
          message={snapshot.error}
          retry={snapshot.status === "error" ? () => void controller.retryLoad() : undefined}
          onClose={snapshot.status === "error" ? undefined : () => controller.clearError()}
        />
      )}
    </div>
  );
}
