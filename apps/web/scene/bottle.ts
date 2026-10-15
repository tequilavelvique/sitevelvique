/**
 * The client's bottle as one GLB (meshopt + WebP, ~45 KB gzipped; no decoder download), baked in meters: 0.33 m tall, base at y = 0,
 * label facing +Z. Served from Grove (immutable upload of the meshopt-encoded file); a new bake must be
 * meshopt-encoded too (`npx @gltf-transform/cli meshopt in.glb out.glb --level high`), uploaded, and its link pasted here.
 * The scene works in 1 = ~12 cm, so it scales the meter GLB by `SCENE_SCALE`; AR uses it as is.
 */
export type DeviceTier = 1 | 2 | 3;

/** Three-free on purpose: AR imports this module without pulling three.js into its chunk. */
export const LED = "#4EA9D5";

export const BOTTLE_GLB = "https://api.grove.storage/4f9098d4c0b312c9be3759133030b27947090e732f1d5b8ef5ceb04f9b70625c";

/**
 * The same bottle for phone AR: no meshopt, no quantization, PNG texture (~370 KB). Android Scene Viewer can't decode
 * meshopt or WebP, and iOS Quick Look's USDZ is generated from this file, so AR never gets the compressed one.
 * Rebake from the meshopt GLB whenever it changes (decode, dequantize, textures to PNG) and upload it immutable.
 */
export const BOTTLE_AR_GLB = "https://api.grove.storage/aa3b3576a812311d24bed5cbe65cf4869767f93a3eb4ec109991236af63f2b58";

export const SCENE_SCALE = 1 / 0.12;

/** Label center on the front face, in scene units (measured from the GLB's label UVs). */
export const LABEL = { y: 0.5, z: 0.28 };

/** 4 to 6 second breathing curve. Smooth cosine, never a flicker. Returns 0..1. */
export function breath(t: number, period: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / period);
}
