/**
 * Shared MediaPipe Vision WASM Loader
 * 
 * Provides a cached singleton instance of FilesetResolver so that
 * PoseLandmarker, FaceLandmarker, and HandLandmarker do NOT redundantly
 * download and instantiate the multi-megabyte WASM binaries multiple times.
 */

type FilesetResolverType = any;

let filesetResolverPromise: Promise<FilesetResolverType> | null = null;
const WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';

/**
 * Returns the cached FilesetResolver instance, or loads it once.
 */
export async function getSharedVisionFileset(): Promise<FilesetResolverType> {
  if (!filesetResolverPromise) {
    filesetResolverPromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const resolver = await vision.FilesetResolver.forVisionTasks(WASM_CDN_URL);
      return resolver;
    })();
  }
  return filesetResolverPromise;
}

/**
 * Clears the cached resolver (useful for complete reloads or unit tests).
 */
export function resetVisionFileset(): void {
  filesetResolverPromise = null;
}
