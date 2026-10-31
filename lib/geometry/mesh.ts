import * as THREE from "three";

/**
 * Collects triangles and turns them into a BufferGeometry.
 * Triangles must be wound counter-clockwise as seen from outside the solid
 * (three.js front faces). Vertices are not shared, so every face gets a flat
 * normal and edges stay sharp.
 */
export class MeshBuilder {
  private positions: number[] = [];

  get triangleCount() {
    return this.positions.length / 9;
  }

  addTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
    this.positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }

  /** Quad a-b-c-d in winding order, split along a-c. */
  addQuad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) {
    this.addTriangle(a, b, c);
    this.addTriangle(a, c, d);
  }

  toGeometry() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(this.positions, 3)
    );
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    return geo;
  }
}
