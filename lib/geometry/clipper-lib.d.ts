/** The few parts of clipper-lib (it ships no types) that outline.ts uses. */
declare module "clipper-lib" {
  type IntPoint = { X: number; Y: number };
  type Paths = IntPoint[][];

  const ClipperLib: {
    ClipType: { ctUnion: number };
    PolyType: { ptSubject: number };
    PolyFillType: { pftNonZero: number };
    JoinType: { jtRound: number };
    EndType: { etClosedPolygon: number };
    Clipper: new () => {
      AddPaths(paths: Paths, polyType: number, closed: boolean): boolean;
      Execute(clipType: number, solution: Paths, subjFill: number, clipFill: number): boolean;
    };
    ClipperOffset: new (miterLimit?: number, arcTolerance?: number) => {
      AddPaths(paths: Paths, joinType: number, endType: number): void;
      Execute(solution: Paths, delta: number): void;
    };
  };
  export default ClipperLib;
}
