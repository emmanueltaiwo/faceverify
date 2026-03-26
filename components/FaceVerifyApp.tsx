'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { motion, AnimatePresence } from 'motion/react';
import CameraFeed from '@/components/CameraFeed';
import FaceOverlay from '@/components/FaceOverlay';
import InstructionBox from '@/components/InstructionBox';
import ProgressBar from '@/components/ProgressBar';
import { useCamera } from '@/hooks/useCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useVerification } from '@/hooks/useVerification';
import { getFaceLandmarker, type FaceLandmarkerHandle } from '@/lib/mediapipe';
import { stepInstruction } from '@/lib/verification';

/* ─── small presentational atoms ─── */

function StatusBadge({
  status,
}: {
  status: 'waiting' | 'scanning' | 'success';
}) {
  const cfg = {
    waiting: {
      dot: 'bg-cyan-700',
      ring: 'ring-cyan-900/60',
      text: 'text-cyan-700',
      label: 'STANDBY',
    },
    scanning: {
      dot: 'bg-cyan-400 animate-pulse',
      ring: 'ring-cyan-500/40',
      text: 'text-cyan-300',
      label: 'SCANNING',
    },
    success: {
      dot: 'bg-emerald-400',
      ring: 'ring-emerald-500/40',
      text: 'text-emerald-300',
      label: 'VERIFIED',
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border border-transparent px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] ring-1 ${cfg.ring} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TelemetryCell({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className='flex flex-col gap-0.5 border border-cyan-900/50 bg-[#040d18]/80 px-3 py-2'>
      <span className='font-mono text-[7px] uppercase tracking-[0.2em] text-cyan-600/60'>
        {label}
      </span>
      <span
        className={`font-mono text-[11px] font-semibold tracking-wider ${ok ? 'text-cyan-300' : 'text-cyan-700'}`}
      >
        {value}
      </span>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toTimeString().slice(0, 8) +
          '.' +
          String(now.getMilliseconds()).padStart(3, '0').slice(0, 2),
      );
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <span className='font-mono text-[8px] tabular-nums text-cyan-500/50'>
      {time}
    </span>
  );
}

/* ─── main component ─── */

export default function FaceVerifyApp() {
  const { videoRef, error, errorCode, ready: cameraReady } = useCamera();
  const [modelError, setModelError] = useState<string | null>(null);
  const [landmarker, setLandmarker] = useState<FaceLandmarkerHandle | null>(
    null,
  );
  const { state, processFrame, reset } = useVerification();
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [luminanceWarn, setLuminanceWarn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const lm = await getFaceLandmarker();
        if (!cancelled) setLandmarker(lm);
      } catch (e) {
        if (!cancelled)
          setModelError(
            e instanceof Error ? e.message : 'Failed to load face model',
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onFrame = useCallback(
    (frame: {
      landmarks: NormalizedLandmark[] | null;
      timestampMs: number;
      luminance: number | null;
    }) => {
      setLandmarks(frame.landmarks);
      processFrame(frame.landmarks, frame.timestampMs);
      if (frame.luminance !== null) setLuminanceWarn(frame.luminance < 48);
    },
    [processFrame],
  );

  useFaceDetection(videoRef, landmarker, onFrame, 12);

  const engineReady = cameraReady && !!landmarker && !modelError;

  useEffect(() => {
    if (engineReady && startedAtRef.current === null) {
      startedAtRef.current = performance.now();
    }
  }, [engineReady]);

  useEffect(() => {
    if (state.status === 'success' && startedAtRef.current !== null) {
      setElapsedMs(performance.now() - startedAtRef.current);
      setAuthCode((prev) => {
        if (prev) return prev;
        const rand = crypto.getRandomValues(new Uint8Array(4));
        return `NAS-${Array.from(rand, (b) => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 6)
          .toUpperCase()}`;
      });
    }
  }, [state.status]);

  const uiStatus: 'waiting' | 'scanning' | 'success' = useMemo(() => {
    if (state.status === 'success') return 'success';
    if (!engineReady || error) return 'waiting';
    return 'scanning';
  }, [engineReady, error, state.status]);

  const instruction =
    state.status === 'success'
      ? 'Identity confirmed'
      : stepInstruction(state.currentStep);

  const subtitle = useMemo(() => {
    if (error) return error;
    if (modelError) return modelError;
    if (!cameraReady) return 'Initialising camera module…';
    if (!landmarker) return 'Loading neural model…';
    return undefined;
  }, [error, modelError, cameraReady, landmarker]);

  const showLowLight =
    luminanceWarn && engineReady && state.status !== 'success' && !error;

  return (
    <div className='flex flex-col gap-4 animate-hud-flicker'>
      {/* ─── Header ─── */}
      <header className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          {/* Hex emblem */}
          <div className='relative flex h-9 w-9 shrink-0 items-center justify-center'>
            <svg viewBox='0 0 36 36' className='absolute inset-0 h-full w-full'>
              <polygon
                points='18,2 33,10 33,26 18,34 3,26 3,10'
                fill='none'
                stroke='rgba(6,182,212,0.5)'
                strokeWidth='1'
              />
              <polygon
                points='18,6 29,12 29,24 18,30 7,24 7,12'
                fill='none'
                stroke='rgba(6,182,212,0.2)'
                strokeWidth='0.6'
              />
            </svg>
            <span className='relative font-mono text-[10px] font-bold text-cyan-400'>
              FV
            </span>
          </div>

          <div>
            <h1 className='font-mono text-sm font-bold uppercase tracking-[0.3em] text-cyan-100'>
              FaceVerify
            </h1>
            <p className='font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-600/70'>
              Neural Auth System · v2.0
            </p>
          </div>
        </div>

        <StatusBadge status={uiStatus} />
      </header>

      {/* Separator */}
      <div className='h-px bg-linear-to-r from-transparent via-cyan-500/25 to-transparent' />

      {/* ─── Telemetry row ─── */}
      <div className='grid grid-cols-4 gap-px overflow-hidden rounded-sm border border-cyan-900/40'>
        <TelemetryCell
          label='CAMERA'
          value={cameraReady ? 'ONLINE' : 'INIT'}
          ok={cameraReady}
        />
        <TelemetryCell
          label='MODEL'
          value={!!landmarker ? 'READY' : 'LOAD'}
          ok={!!landmarker}
        />
        <TelemetryCell
          label='FACE'
          value={!!landmarks ? 'DETECTED' : 'NONE'}
          ok={!!landmarks}
        />
        <TelemetryCell
          label='STEP'
          value={`${state.completedSteps.filter((s) => s !== 'COMPLETE').length}/5`}
          ok={state.completedSteps.length > 0}
        />
      </div>

      {/* ─── Camera feed ─── */}
      <div className='relative'>
        {/* Outer decorative border */}
        <div className='pointer-events-none absolute -inset-[3px] rounded-xl border border-cyan-500/10' />

        <div className='relative overflow-hidden rounded-lg border border-cyan-900/70 bg-black'>
          {/* Top HUD bar */}
          <div className='absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-linear-to-b from-black/80 to-transparent px-3 py-2'>
            <span className='font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-500/60'>
              CAM.001 · BIOMETRIC
            </span>
            <LiveClock />
          </div>

          <div className='aspect-4/3 w-full bg-[#030810]'>
            <CameraFeed
              ref={videoRef}
              className='h-full w-full scale-x-[-1] object-cover opacity-95'
            />
            <FaceOverlay
              landmarks={state.status === 'success' ? null : landmarks}
              hasFace={!!landmarks && state.status !== 'success'}
            />
          </div>

          {/* Bottom HUD bar */}
          <div className='absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-linear-to-t from-black/80 to-transparent px-3 py-2'>
            <span className='font-mono text-[8px] uppercase tracking-widest text-cyan-600/50'>
              LIVE · 12FPS
            </span>
            <AnimatePresence>
              {showLowLight ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className='animate-pulse font-mono text-[8px] uppercase tracking-widest text-amber-400/90'
                >
                  ⚠ LOW LIGHT
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Scanline overlay (subtle CRT feel) */}
          <div
            className='pointer-events-none absolute inset-0'
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)',
            }}
            aria-hidden
          />
        </div>
      </div>

      {/* ─── Instruction ─── */}
      <InstructionBox title={instruction} subtitle={subtitle} />

      {/* ─── Progress ─── */}
      <ProgressBar
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
        success={state.status === 'success'}
      />

      {/* ─── Success panel ─── */}
      <AnimatePresence>
        {state.status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className='rounded-lg border border-emerald-500/30 bg-[#04160e]/80 px-4 py-4 backdrop-blur-sm'
          >
            <div className='mb-3 flex items-center gap-2'>
              <div className='flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400 bg-emerald-400/10'>
                <svg
                  className='h-2.5 w-2.5 text-emerald-400'
                  viewBox='0 0 12 12'
                  fill='none'
                >
                  <path
                    d='M2 6l3 3 5-5'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
              <span className='font-mono text-[9px] uppercase tracking-[0.25em] text-emerald-400/80'>
                IDENTITY VERIFIED
              </span>
            </div>

            <div className='space-y-1 border-l-2 border-emerald-500/30 pl-3'>
              {[
                ['STATUS', 'PASS'],
                [
                  'STEPS',
                  `${state.completedSteps.filter((s) => s !== 'COMPLETE').length} / 5`,
                ],
                [
                  'TIME',
                  elapsedMs !== null
                    ? `${(elapsedMs / 1000).toFixed(2)}s`
                    : '—',
                ],
                ['AUTH.CODE', authCode ?? '—'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className='flex items-center gap-3 font-mono text-[10px]'
                >
                  <span className='w-16 text-emerald-600/70'>{k}</span>
                  <span className='text-emerald-200'>{v}</span>
                </div>
              ))}
            </div>

            <button
              type='button'
              onClick={() => {
                startedAtRef.current = null;
                setElapsedMs(null);
                setAuthCode(null);
                setLandmarks(null);
                reset();
              }}
              className='mt-4 rounded-sm border border-cyan-800/60 bg-cyan-950/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300 transition hover:border-cyan-500/60 hover:bg-cyan-900/30'
            >
              ↺ RE-SCAN
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {errorCode === 'permission_denied' ? (
        <p className='text-center font-mono text-[10px] uppercase tracking-wider text-red-400/80'>
          ⚠ CAMERA ACCESS DENIED · CHECK BROWSER PERMISSIONS
        </p>
      ) : null}
    </div>
  );
}
