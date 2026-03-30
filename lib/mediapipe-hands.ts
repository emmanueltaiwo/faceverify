import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm`;

export type HandLandmarkerHandle = Awaited<
  ReturnType<(typeof HandLandmarker)['createFromOptions']>
>;

let landmarkerPromise: Promise<HandLandmarkerHandle> | null = null;

export async function getHandLandmarker(): Promise<HandLandmarkerHandle> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const wasm = await FilesetResolver.forVisionTasks(WASM_CDN);
      return HandLandmarker.createFromOptions(wasm, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    })();
  }
  return landmarkerPromise;
}

export function detectHands(
  landmarker: HandLandmarkerHandle,
  video: HTMLVideoElement,
  timestampMs: number,
): NormalizedLandmark[] | null {
  if (video.readyState < 2) return null;
  const result = landmarker.detectForVideo(video, timestampMs);
  const first = result.landmarks[0];
  return first ?? null;
}

export function resetHandLandmarkerCache(): void {
  landmarkerPromise = null;
}
