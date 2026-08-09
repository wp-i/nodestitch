export const NODE_MOTION = {
  enterDuration: 320,
  exitDuration: 240,
  moveDuration: 300,
  enterEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
  exitEasing: "cubic-bezier(0.32, 0, 0.67, 0)",
  moveEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canAnimate(element: HTMLElement): boolean {
  return !prefersReducedMotion() && typeof element.animate === "function";
}

export function animateNodeEntry(element: HTMLElement): Animation | null {
  if (!canAnimate(element)) return null;
  return element.animate(
    [
      { opacity: 0, transform: "translate3d(0, 10px, 0) scale(0.985)" },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
    ],
    {
      duration: NODE_MOTION.enterDuration,
      easing: NODE_MOTION.enterEasing,
      fill: "both",
    },
  );
}

export function animateNodeMove(element: HTMLElement, deltaY: number): Animation | null {
  if (!canAnimate(element) || Math.abs(deltaY) < 0.5) return null;
  return element.animate(
    [
      { transform: `translate3d(0, ${deltaY}px, 0)` },
      { transform: "translate3d(0, 0, 0)" },
    ],
    {
      duration: NODE_MOTION.moveDuration,
      easing: NODE_MOTION.moveEasing,
    },
  );
}

export async function animateNodeExit(element: HTMLElement): Promise<Animation | null> {
  if (!canAnimate(element)) return null;
  const height = element.getBoundingClientRect().height;
  const animation = element.animate(
    [
      {
        height: `${height}px`,
        minHeight: `${height}px`,
        opacity: 1,
        transform: "translate3d(0, 0, 0) scale(1)",
      },
      {
        height: "0px",
        minHeight: "0px",
        opacity: 0,
        transform: "translate3d(0, -7px, 0) scale(0.985)",
      },
    ],
    {
      duration: NODE_MOTION.exitDuration,
      easing: NODE_MOTION.exitEasing,
      fill: "forwards",
    },
  );
  await animation.finished.catch(() => undefined);
  return animation;
}
