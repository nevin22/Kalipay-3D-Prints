/** What a 0.4 mm nozzle can print (mm). The icon check and the Size slider both read these. */
export const MIN_STROKE = 0.8; // thinnest stroke or wall of a legend
export const ABS_MIN_STROKE = 0.4; // under this a stroke is one nozzle line and will not hold
export const MIN_GAP = 0.6; // narrowest gap between separate strokes or shapes
export const MIN_HOLE = 0.8; // smallest hole or dot diameter
export const MIN_LEGEND_HEIGHT = 4; // smallest text height; also the smallest icon extent
/** An icon is drawn this much of its Size slider (see SHAPE_SCALE in cap.ts), so the slider minimum is higher. */
export const ICON_SIZE_RATIO = 0.65;
/** Size (mm) the icons are checked at: the default Size of a key. */
export const CHECK_SIZE = 12;
