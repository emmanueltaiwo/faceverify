'use client';

import { useEffect, useRef, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  detectHands,
  getHandLandmarker,
  type HandLandmarkerHandle,
} from '@/lib/mediapipe-hands';
import {
  HAND,
  landmarkToViewportPoint,
  nextPinchGate,
  pinchDistanceNorm,
  smoothPoint,
  type PinchGate,
  type Point2D,
} from '@/lib/handInteraction';

export type HandControlState = {
  cursor: Point2D | null;
  handDetected: boolean;
  pinchGate: PinchGate;
  landmarks: NormalizedLandmark[] | null;
  timestampMs: number;
};

type Options = {
  enabled: boolean;
  fps?: number;
  /** Match mirrored video preview (default true). */
  mirror?: boolean;
  onPinchDown?: (point: Point2D) => void;
  onPinchUp?: (point: Point2D) => void;
};

export function useHandControl(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: Options,
) {
  const [landmarker, setLandmarker] = useState<HandLandmarkerHandle | null>(
    null,
  );
  const [modelError, setModelError] = useState<string | null>(null);
  const [frame, setFrame] = useState<HandControlState>({
    cursor: null,
    handDetected: false,
    pinchGate: 'open',
    landmarks: null,
    timestampMs: 0,
  });

  const pinchPrevRef = useRef<PinchGate>('open');
  const smoothRef = useRef<Point2D | null>(null);
  const optsRef = useRef(options);

  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const lm = await getHandLandmarker();
        if (!cancelled) setLandmarker(lm);
      } catch (e) {
        if (!cancelled) {
          setModelError(
            e instanceof Error ? e.message : 'Failed to load hand model',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!landmarker) return;

    let raf = 0;
    const fps = optsRef.current.fps ?? 18;
    const minInterval = 1000 / fps;
    let lastDetect = 0;

    const loop = (now: number) => {
      const v = videoRef.current;
      const { enabled, mirror = true } = optsRef.current;

      if (!enabled) {
        raf = requestAnimationFrame(loop);
        return;
      }

      if (v && now - lastDetect >= minInterval) {
        lastDetect = now;
        const landmarks = detectHands(landmarker, v, now);

        if (landmarks) {
          const tip = landmarks[HAND.indexTip];
          const raw = landmarkToViewportPoint(tip.x, tip.y, v, mirror);
          const smoothed = smoothPoint(smoothRef.current, raw, 0.38);
          smoothRef.current = smoothed;

          const dist = pinchDistanceNorm(landmarks);
          const prevGate = pinchPrevRef.current;
          const gate = nextPinchGate(prevGate, dist);
          pinchPrevRef.current = gate;

          if (prevGate === 'open' && gate === 'closed') {
            optsRef.current.onPinchDown?.(smoothed);
          }
          if (prevGate === 'closed' && gate === 'open') {
            optsRef.current.onPinchUp?.(smoothed);
          }

          setFrame({
            cursor: smoothed,
            handDetected: true,
            pinchGate: gate,
            landmarks,
            timestampMs: now,
          });
        } else {
          smoothRef.current = null;
          pinchPrevRef.current = 'open';
          setFrame({
            cursor: null,
            handDetected: false,
            pinchGate: 'open',
            landmarks: null,
            timestampMs: now,
          });
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [landmarker, videoRef]);

  return {
    ready: !!landmarker && !modelError,
    modelError,
    frame,
  };
}
