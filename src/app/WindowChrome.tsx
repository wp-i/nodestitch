import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, X } from "lucide-react";
import { ProductMark } from "./ProductMark";

async function withCurrentWindow(action: (window: ReturnType<typeof getCurrentWindow>) => Promise<void>) {
  try {
    await action(getCurrentWindow());
  } catch {
    // Window commands are intentionally inert in a plain Vite preview.
  }
}

export function WindowChrome() {
  return (
    <header className="window-chrome">
      <div className="window-drag-region" data-tauri-drag-region>
        <ProductMark />
        <span className="product-name" data-tauri-drag-region>
          Nodestitch
        </span>
      </div>
      <div className="window-controls">
        <button
          type="button"
          aria-label="最小化"
          onClick={() => void withCurrentWindow((window) => window.minimize())}
        >
          <Minus aria-hidden="true" />
        </button>
        <button
          className="window-close"
          type="button"
          aria-label="关闭"
          onClick={() => void withCurrentWindow((window) => window.close())}
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
