import { MathUtils } from "three";
import type { HousingLayout } from "@/store/useGenerator";
import { previewLayout } from "@/lib/geometry/housing";
import { RING_REACH, type RingSide } from "@/lib/geometry/ring";

/** Seconds the housing takes to travel between `separate` and `below`. */
const MOVE_SECONDS = 0.85;
/** Seconds the housing takes to fade out or in. */
const FADE_SECONDS = 0.45;
/**
 * How far (mm) the housing drops under its `below` position while it slides
 * in or out. Its rim stands 2 mm above the cap's skirt there, so it has to
 * go lower than that to pass underneath the cap.
 */
const CLEAR_DROP = 4;

/**
 * Where everything is in the preview right now, in mm. `stepPose` moves it
 * a little closer to the chosen layout every frame; the cap, the housing,
 * the floor and the camera target all read it, so they stay in sync.
 * Mutable on purpose: it changes every frame, outside React.
 */
export const pose = {
  ready: false,
  /** 0 = side by side, 1 = stacked. Holds its value while the housing is hidden. */
  progress: 0,
  /** 1 = housing visible, 0 = faded out. */
  shown: 1,
  /** Extra space between the caps and the housing, eased in when a split ring tab points at the caps. */
  gap: 0,
  /** x of each cap, in key order. */
  capXs: [] as number[],
  housingX: 0,
  housingY: 0,
  floorY: 0,
  targetY: 0,
};

const smooth = (t: number) => t * t * (3 - 2 * t);

/** How far along [from, to] `p` is, 0 to 1, eased at both ends. */
const phase = (p: number, from: number, to: number) =>
  smooth(MathUtils.clamp((p - from) / (to - from), 0, 1));

function approach(value: number, goal: number, step: number) {
  return value + MathUtils.clamp(goal - value, -step, step);
}

export function stepPose(
  dt: number,
  units: number[],
  layout: HousingLayout,
  ring: RingSide | "off",
  capHeight: number
) {
  const goalProgress =
    layout === "below" ? 1 : layout === "separate" ? 0 : pose.progress;
  const goalShown = layout === "hidden" ? 0 : 1;
  // A tab on the housing's left end points at the caps when they sit side by side: leave room.
  const goalGap = ring === "left" ? RING_REACH : 0;

  if (!pose.ready) {
    // First frame: start in place instead of flying in from the origin.
    pose.progress = goalProgress;
    pose.shown = goalShown;
    pose.gap = goalGap;
    pose.ready = true;
  } else {
    pose.progress = approach(pose.progress, goalProgress, dt / MOVE_SECONDS);
    pose.shown = approach(pose.shown, goalShown, dt / FADE_SECONDS);
    pose.gap = approach(pose.gap, goalGap, (RING_REACH * dt) / 0.4);
  }

  const side = previewLayout(units, "separate", pose.gap, capHeight);
  const stacked = previewLayout(units, "below", 0, capHeight);
  const clearY = stacked.housingY - CLEAR_DROP;
  const p = pose.progress;
  const shown = smooth(pose.shown);

  // Stacking: drop below the cap, slide under it, rise around it. Unstacking runs backwards.
  // The three moves overlap so they blend into one sweep. They are timed so the housing is already
  // below the cap before it reaches it, and has slid fully into place before it rises around it.
  const drop = phase(p, 0, 0.4);
  const slide = phase(p, 0.25, 0.8);
  const rise = phase(p, 0.65, 1);

  pose.housingY =
    side.housingY + (clearY - side.housingY) * drop + (stacked.housingY - clearY) * rise;
  pose.housingX = side.housingX * (1 - slide);
  // The caps share the slide toward the middle (each over its own well), and also go there
  // when the housing is hidden.
  const apart = (1 - slide) * shown;
  pose.capXs = stacked.capXs.map((x, i) => x + (side.capXs[i] - x) * apart);
  // The floor stays under whatever is lowest: the housing, or just the cap when it is hidden.
  pose.floorY = side.floorY + (pose.housingY - side.floorY) * shown;
  pose.targetY = stacked.targetY * smooth(p) * shown;
}
