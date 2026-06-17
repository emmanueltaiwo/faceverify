'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import CameraFeed from '@/components/CameraFeed';
import { useCamera } from '@/hooks/useCamera';
import { useHandControl } from '@/hooks/useHandControl';
import { HAND } from '@/lib/handInteraction';
import {
  createRunner,
  startRun,
  tickRunner,
  tryJump,
  type RunnerSnapshot,
} from '@/lib/runnerGame';
import { createRenderAssets, drawRunnerFrame, type RenderAssets } from '@/lib/runnerRender';

const BEST_KEY = 'void-runner-best';
const HIDE_INSTRUCTIONS_KEY = 'void-runner-hide-instructions';

function loadBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* ignore */
  }
}

function loadHideInstructions(): boolean {
  try {
    return localStorage.getItem(HIDE_INSTRUCTIONS_KEY) === '1';
  } catch {
    return false;
  }
}

function saveHideInstructions() {
  try {
    localStorage.setItem(HIDE_INSTRUCTIONS_KEY, '1');
  } catch {
    /* ignore */
  }
}

function formatScore(n: number) {
  return Math.floor(n).toLocaleString();
}

export default function RunnerGame() {
  const { videoRef, error, ready } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<RunnerSnapshot>(createRunner());
  const assetsRef = useRef<RenderAssets | null>(null);
  const jumpQueuedRef = useRef(false);
  const jumpCooldownRef = useRef(0);
  const prevTipYRef = useRef<number | null>(null);
  const handEnabledRef = useRef(true);
  const scoreTickRef = useRef(0);

  const [handEnabled, setHandEnabled] = useState(true);
  const [phase, setPhase] = useState<RunnerSnapshot['phase']>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const queueAction = useCallback(() => {
    if (showInstructions) return;
    const now = performance.now();
    if (now - jumpCooldownRef.current < 260) return;
    jumpCooldownRef.current = now;
    jumpQueuedRef.current = true;
  }, [showInstructions]);

  const { ready: handReady, modelError, frame } = useHandControl(videoRef, {
    enabled: handEnabled && ready && !showInstructions,
    fps: 20,
    onPinchDown: queueAction,
  });

  useEffect(() => {
    handEnabledRef.current = handEnabled;
  }, [handEnabled]);

  useLayoutEffect(() => {
    const loadedBest = loadBest();
    gameRef.current = createRunner(loadedBest);
    setBest(loadedBest);
    setPhase('ready');
    setShowInstructions(!loadHideInstructions());
  }, []);

  const closeInstructions = useCallback(() => {
    if (dontShowAgain) saveHideInstructions();
    setShowInstructions(false);
  }, [dontShowAgain]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showInstructions) {
        if (e.code === 'Escape') closeInstructions();
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        queueAction();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queueAction, showInstructions, closeInstructions]);

  useEffect(() => {
    if (!frame.landmarks || !handEnabledRef.current || showInstructions) {
      prevTipYRef.current = null;
      return;
    }
    const tipY = frame.landmarks[HAND.indexTip].y;
    const prev = prevTipYRef.current;
    if (prev !== null && prev - tipY > 0.038) {
      queueAction();
    }
    prevTipYRef.current = tipY;
  }, [frame.landmarks, frame.timestampMs, queueAction, showInstructions]);

  useLayoutEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      assetsRef.current = createRenderAssets(w, h);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = canvas.width;
      const h = canvas.height;

      let snap = gameRef.current;

      if (jumpQueuedRef.current && !showInstructions) {
        if (snap.phase === 'ready' || snap.phase === 'dead') {
          snap = startRun(snap);
          setNewRecord(false);
          setScore(0);
        } else {
          snap = tryJump(snap);
        }
        jumpQueuedRef.current = false;
        gameRef.current = snap;
        setPhase(snap.phase);
      }

      if (snap.phase === 'playing') {
        const prevPhase = snap.phase;
        snap = tickRunner(snap, dt, w, h);
        gameRef.current = snap;

        if (now - scoreTickRef.current > 50) {
          scoreTickRef.current = now;
          setScore(snap.distance);
        }

        if (snap.phase === 'dead' && prevPhase === 'playing') {
          const isNew = snap.best > loadBest();
          saveBest(snap.best);
          setBest(snap.best);
          setScore(snap.distance);
          setNewRecord(isNew);
          setPhase('dead');
        }
      }

      const assets = assetsRef.current;
      if (assets) {
        drawRunnerFrame(ctx, w, h, snap, assets, now / 1000);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showInstructions]);

  const playing = phase === 'playing';
  const gameOver = phase === 'dead';
  const idle = phase === 'ready';

  return (
    <div className='relative h-dvh overflow-hidden bg-neutral-900'>
      <div className='absolute inset-0'>
        <CameraFeed
          ref={videoRef}
          className='h-full w-full scale-x-[-1] object-cover'
        />
        <div className='pointer-events-none absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/50' />
      </div>

      <canvas ref={canvasRef} className='absolute inset-0 z-10' />

      {/* Score bar */}
      <div className='pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]'>
        <div className='pointer-events-auto'>
          <Link
            href='/'
            className='rounded-full bg-black/35 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-md transition hover:bg-black/50'
          >
            ← Back
          </Link>
        </div>

        <div className='flex min-w-28 flex-col items-center rounded-2xl bg-black/35 px-5 py-2 backdrop-blur-md'>
          <p className='text-[10px] font-medium uppercase tracking-widest text-white/55'>
            Score
          </p>
          <p className='font-mono text-4xl font-bold tabular-nums leading-none text-white sm:text-5xl'>
            {formatScore(score)}
          </p>
        </div>

        <div className='rounded-2xl bg-black/35 px-4 py-2 text-right backdrop-blur-md'>
          <p className='text-[10px] font-medium uppercase tracking-widest text-white/55'>
            Best
          </p>
          <p className='font-mono text-xl font-bold tabular-nums text-amber-300'>
            {formatScore(best)}
          </p>
        </div>
      </div>

      {/* Hand cursor */}
      {frame.cursor && handEnabled && !showInstructions && (
        <div
          className='pointer-events-none absolute z-30'
          style={{
            left: frame.cursor.x,
            top: frame.cursor.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className={`h-3 w-3 rounded-full border-2 border-white/90 shadow-lg ${
              frame.pinchGate === 'closed' ? 'bg-white' : 'bg-white/30'
            }`}
          />
        </div>
      )}

      {/* Footer controls */}
      <footer className='absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
        <p className='rounded-full bg-black/35 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-md'>
          Hand Runner
        </p>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setShowInstructions(true)}
            className='rounded-full bg-black/35 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-md transition hover:bg-black/50'
          >
            ?
          </button>
          <label className='flex cursor-pointer items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-md'>
            <input
              type='checkbox'
              checked={handEnabled}
              onChange={(e) => setHandEnabled(e.target.checked)}
              className='accent-emerald-600'
            />
            Hand control
          </label>
        </div>
      </footer>

      {/* Start prompt */}
      {idle && !showInstructions && ready && (
        <div className='pointer-events-none absolute inset-x-0 bottom-28 z-30 text-center'>
          <p className='text-lg font-semibold text-white drop-shadow-md'>Tap to play</p>
          <p className='mt-1 text-sm text-white/75 drop-shadow'>
            {handEnabled ? 'Pinch or flick up · or press Space' : 'Press Space or tap'}
          </p>
        </div>
      )}

      {/* Game over */}
      {gameOver && !showInstructions && (
        <div className='absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200'>
            <p className='text-center text-sm font-semibold uppercase tracking-wider text-slate-500'>
              Game over
            </p>
            <p className='mt-2 text-center font-mono text-5xl font-bold tabular-nums text-slate-900'>
              {formatScore(score)}
            </p>
            {newRecord && (
              <p className='mt-2 text-center text-sm font-bold text-emerald-600'>
                New high score!
              </p>
            )}
            <div className='mt-4 flex justify-center gap-6 text-center'>
              <div>
                <p className='text-xs text-slate-500'>Best</p>
                <p className='font-mono text-lg font-bold text-amber-600'>
                  {formatScore(best)}
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={queueAction}
              className='mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800'
            >
              Play again
            </button>
            <p className='mt-3 text-center text-xs text-slate-500'>
              Space · pinch · or flick up
            </p>
          </div>
        </div>
      )}

      {/* Instructions modal */}
      {showInstructions && (
        <div
          className='absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
          role='dialog'
          aria-modal='true'
          aria-labelledby='instructions-title'
        >
          <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl'>
            <h2
              id='instructions-title'
              className='text-xl font-bold text-slate-900'
            >
              How to play
            </h2>
            <p className='mt-2 text-sm text-slate-600'>
              Run as far as you can. Jump over rocks and logs, dodge birds — speed
              increases the longer you survive.
            </p>

            <ul className='mt-4 space-y-3 text-sm text-slate-700'>
              <li className='flex gap-3'>
                <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-bold'>
                  ✋
                </span>
                <span>
                  <strong>Hand control on:</strong> pinch thumb + index, or
                  flick your hand upward to jump.
                </span>
              </li>
              <li className='flex gap-3'>
                <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-bold'>
                  ␣
                </span>
                <span>
                  <strong>Keyboard:</strong> Space or ↑ to jump and restart
                  after game over.
                </span>
              </li>
              <li className='flex gap-3'>
                <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-bold'>
                  🏆
                </span>
                <span>
                  Beat your <strong>high score</strong> — it saves automatically
                  on this device.
                </span>
              </li>
            </ul>

            <label className='mt-5 flex cursor-pointer items-center gap-2 text-sm text-slate-600'>
              <input
                type='checkbox'
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className='accent-emerald-600'
              />
              Don&apos;t show again
            </label>

            <div className='mt-5 flex gap-3'>
              <button
                type='button'
                onClick={closeInstructions}
                className='flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800'
              >
                Got it
              </button>
              <button
                type='button'
                onClick={closeInstructions}
                className='rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {(error || modelError) && (
        <div className='absolute bottom-20 left-4 right-4 z-40 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700 shadow-lg'>
          {error ?? modelError}
        </div>
      )}

      {!ready && !error && (
        <div className='absolute inset-0 z-50 flex items-center justify-center bg-white/80 text-sm font-medium text-slate-600'>
          Loading camera…
        </div>
      )}

      {ready && handEnabled && !handReady && !modelError && !showInstructions && (
        <div className='absolute bottom-36 left-0 right-0 z-30 text-center text-xs text-slate-500'>
          Loading hand tracking…
        </div>
      )}

      {playing && (
        <div className='pointer-events-none absolute left-1/2 top-18 z-20 -translate-x-1/2 rounded-full bg-black/30 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70 backdrop-blur-sm'>
          Running
        </div>
      )}
    </div>
  );
}
