import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/** MediaPipe hand topology — index finger tip, thumb tip */
export const HAND = {
  thumbTip: 4,
  indexTip: 8,
} as const;

export type Point2D = { x: number; y: number };

/**
 * Map normalized landmark (video bitmap space) to viewport coordinates for a
 * displayed <video> with object-fit: cover and optional horizontal mirror.
 */
export function landmarkToViewportPoint(
  nx: number,
  ny: number,
  video: HTMLVideoElement,
  mirrorX: boolean,
): Point2D {
  const rect = video.getBoundingClientRect();
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0) {
    return { x: rect.left, y: rect.top };
  }

  const px = nx * vw;
  const py = ny * vh;
  const scale = Math.max(rect.width / vw, rect.height / vh);
  const dispW = vw * scale;
  const dispH = vh * scale;
  const offX = (rect.width - dispW) / 2;
  const offY = (rect.height - dispH) / 2;

  let x = rect.left + px * scale + offX;
  const y = rect.top + py * scale + offY;

  if (mirrorX) {
    const cx = rect.left + rect.width / 2;
    x = cx + (cx - x);
  }

  return { x, y };
}

/** Pinch distance in normalized [0,1] space (same scale as landmark coords). */
export function pinchDistanceNorm(landmarks: NormalizedLandmark[]): number {
  const a = landmarks[HAND.thumbTip];
  const b = landmarks[HAND.indexTip];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const PINCH_CLOSE = 0.06;
const PINCH_OPEN = 0.1;

export type PinchGate = 'open' | 'closed';

/** Hysteresis: next stable pinch state from previous gate and raw distance. */
export function nextPinchGate(
  prev: PinchGate,
  distanceNorm: number,
): PinchGate {
  if (prev === 'open') {
    return distanceNorm < PINCH_CLOSE ? 'closed' : 'open';
  }
  return distanceNorm > PINCH_OPEN ? 'open' : 'closed';
}

export function smoothPoint(
  prev: Point2D | null,
  next: Point2D,
  alpha: number,
): Point2D {
  if (!prev) return next;
  return {
    x: prev.x + alpha * (next.x - prev.x),
    y: prev.y + alpha * (next.y - prev.y),
  };
}
