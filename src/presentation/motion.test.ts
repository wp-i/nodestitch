import { afterEach, describe, expect, it, vi } from "vitest";
import { NODE_MOTION, animateNodeEntry, animateNodeExit, animateNodeMove } from "./motion";

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

function motionElement(height = 82) {
  const element = document.createElement("article");
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    right: 300,
    bottom: height,
    left: 0,
    width: 300,
    height,
    toJSON: () => ({}),
  });
  const animation = { finished: Promise.resolve(), cancel: vi.fn() } as unknown as Animation;
  const animate = vi.fn(() => animation);
  Object.defineProperty(element, "animate", { configurable: true, value: animate });
  return { element, animate, animation };
}

describe("timeline motion", () => {
  it("uses restrained iOS-style entry and FLIP timings", () => {
    const { element, animate } = motionElement();
    animateNodeEntry(element);
    animateNodeMove(element, 82);
    expect(animate).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ opacity: 0 }), expect.objectContaining({ opacity: 1 })]),
      expect.objectContaining({ duration: NODE_MOTION.enterDuration, easing: NODE_MOTION.enterEasing }),
    );
    expect(animate).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([expect.objectContaining({ transform: expect.stringContaining("82px") })]),
      expect.objectContaining({ duration: NODE_MOTION.moveDuration, easing: NODE_MOTION.moveEasing }),
    );
  });

  it("collapses the measured row during exit", async () => {
    const { element, animate } = motionElement(96);
    await animateNodeExit(element);
    expect(animate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ height: "96px", opacity: 1 }),
        expect.objectContaining({ height: "0px", opacity: 0 }),
      ]),
      expect.objectContaining({ duration: NODE_MOTION.exitDuration, fill: "forwards" }),
    );
  });

  it("does not animate when reduced motion is requested", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { element, animate } = motionElement();
    expect(animateNodeEntry(element)).toBeNull();
    expect(animateNodeMove(element, 82)).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });
});
