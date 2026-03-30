'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import CameraFeed from '@/components/CameraFeed';
import { useCamera } from '@/hooks/useCamera';
import { useHandControl } from '@/hooks/useHandControl';
import type { Point2D } from '@/lib/handInteraction';

const PANEL = {
  tactical: { w: 280, h: 132 },
  reactor: { w: 208, h: 208 },
  targets: { w: 300, h: 112 },
  /** Slider deck — h is layout estimate for bounds. */
  deck: { w: 520, h: 260 },
} as const;

type PanelId = keyof typeof PANEL;

const PAD = 12;
const HEADER_H = 76;
const FOOTER_H = 44;
const NARROW_MAX = 767;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function tacticalW(vw: number) {
  return Math.min(PANEL.tactical.w, vw - PAD * 2);
}

function reactorW(vw: number) {
  return Math.min(PANEL.reactor.w, vw - PAD * 2);
}

function targetsW(vw: number) {
  return Math.min(PANEL.targets.w, vw - PAD * 2);
}

function deckW(vw: number) {
  return Math.min(520, vw * 0.92);
}

function deckDims(vw: number) {
  const w = deckW(vw);
  return { w, h: PANEL.deck.h };
}

/** Single source of truth for “original” layout — used on mount (refresh) and for bounds. */
function computeDefaultPositions(vw: number, vh: number) {
  const safeBottom = Math.max(FOOTER_H + PAD, 72);

  if (vw > NARROW_MAX) {
    const deck = deckDims(vw);
    return {
      tactical: { left: PAD, top: HEADER_H + 8 },
      reactor: {
        left: vw - PANEL.reactor.w - PAD,
        top: vh * 0.32,
      },
      targets: {
        left: vw * 0.5 - PANEL.targets.w / 2,
        top: vh * 0.55,
      },
      deck: {
        left: (vw - deck.w) / 2,
        top: vh - deck.h - safeBottom,
      },
    };
  }

  const rw = reactorW(vw);
  const deck = deckDims(vw);
  const gap = 10;

  let y = HEADER_H + 6;
  const tactical = { left: PAD, top: y };
  y += PANEL.tactical.h + gap;

  const reactor = {
    left: (vw - rw) / 2,
    top: y,
  };
  y += rw + gap;

  const targets = {
    left: PAD,
    top: y,
  };
  y += PANEL.targets.h + gap;

  const deckTop = Math.min(y + gap, vh - deck.h - safeBottom);
  const deckPos = {
    left: (vw - deck.w) / 2,
    top: Math.max(HEADER_H, deckTop),
  };

  return { tactical, reactor, targets, deck: deckPos };
}

function clampPosToViewport(
  pos: { left: number; top: number },
  panelW: number,
  panelH: number,
  vw: number,
  vh: number,
) {
  const maxL = Math.max(PAD, vw - panelW - PAD);
  const maxT = Math.max(PAD, vh - panelH - PAD);
  return {
    left: clamp(pos.left, PAD, maxL),
    top: clamp(pos.top, PAD, maxT),
  };
}

function panelDimsFor(id: PanelId, vw: number) {
  switch (id) {
    case 'tactical':
      return { w: tacticalW(vw), h: PANEL.tactical.h };
    case 'reactor': {
      const s = reactorW(vw);
      return { w: s, h: s };
    }
    case 'targets':
      return { w: targetsW(vw), h: PANEL.targets.h };
    case 'deck':
      return deckDims(vw);
  }
}

function HudBracket({ className = '' }: { className?: string }) {
  return (
    <>
      <span
        className={`pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-cyan-400/70 ${className}`}
      />
      <span
        className={`pointer-events-none absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-cyan-400/70 ${className}`}
      />
      <span
        className={`pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-cyan-400/70 ${className}`}
      />
      <span
        className={`pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-cyan-400/70 ${className}`}
      />
    </>
  );
}

const SSR_LAYOUT = computeDefaultPositions(390, 844);

export default function HandsLab() {
  const { videoRef, error, errorCode, ready: cameraReady } = useCamera();
  const [handControlEnabled, setHandControlEnabled] = useState(true);

  const [vw, setVw] = useState(390);

  const [posTactical, setPosTactical] = useState(SSR_LAYOUT.tactical);
  const [posReactor, setPosReactor] = useState(SSR_LAYOUT.reactor);
  const [posTargets, setPosTargets] = useState(SSR_LAYOUT.targets);
  const [posDeck, setPosDeck] = useState(SSR_LAYOUT.deck);

  useLayoutEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync: real viewport + default layout after mount/refresh */
    const w = window.innerWidth;
    const h = window.innerHeight;
    const p = computeDefaultPositions(w, h);
    setVw(w);
    setPosTactical(p.tactical);
    setPosReactor(p.reactor);
    setPosTargets(p.targets);
    setPosDeck(p.deck);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setVw(w);
      setPosTactical((p) =>
        clampPosToViewport(p, tacticalW(w), PANEL.tactical.h, w, h),
      );
      setPosReactor((p) => {
        const rw = reactorW(w);
        return clampPosToViewport(p, rw, rw, w, h);
      });
      setPosTargets((p) =>
        clampPosToViewport(p, targetsW(w), PANEL.targets.h, w, h),
      );
      setPosDeck((p) => {
        const d = deckDims(w);
        return clampPosToViewport(p, d.w, d.h, w, h);
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [powerLevel, setPowerLevel] = useState(72);
  const [shieldOn, setShieldOn] = useState(true);
  const [flightMode, setFlightMode] = useState<'hover' | 'cruise' | 'combat'>(
    'hover',
  );
  const [thruster, setThruster] = useState(35);

  const dragRef = useRef<{
    offX: number;
    offY: number;
    id: PanelId;
  } | null>(null);
  const playgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!handControlEnabled) dragRef.current = null;
  }, [handControlEnabled]);

  const setPosFor = useCallback((id: PanelId, left: number, top: number) => {
    switch (id) {
      case 'tactical':
        setPosTactical({ left, top });
        break;
      case 'reactor':
        setPosReactor({ left, top });
        break;
      case 'targets':
        setPosTargets({ left, top });
        break;
      case 'deck':
        setPosDeck({ left, top });
        break;
    }
  }, []);

  const onPinchDown = useCallback((p: Point2D) => {
    const el = document.elementFromPoint(p.x, p.y);
    if (
      el?.closest('[data-hand-toggle]') ||
      el?.closest('[data-hand-slider-track]') ||
      el?.closest('[data-hand-flight]') ||
      el?.closest('a[href]') ||
      el?.closest('input[type="checkbox"]')
    ) {
      return;
    }

    const node = el?.closest('[data-hand-draggable]') as HTMLElement | null;
    if (!node) return;
    const id = node.dataset.handDraggable as PanelId | undefined;
    if (!id || !(id in PANEL)) return;
    const r = node.getBoundingClientRect();
    dragRef.current = { offX: p.x - r.left, offY: p.y - r.top, id };
  }, []);

  const onPinchUp = useCallback((p: Point2D) => {
    const wasDragging = dragRef.current !== null;
    dragRef.current = null;
    if (wasDragging) return;

    const el = document.elementFromPoint(p.x, p.y);
    const toggle = el?.closest('[data-hand-toggle]');
    if (toggle) {
      const mode = toggle.getAttribute('data-mode');
      if (mode === 'shield') setShieldOn((v) => !v);
      if (typeof navigator !== 'undefined' && navigator.vibrate)
        navigator.vibrate(10);
    }

    const chip = el?.closest('[data-hand-flight]');
    if (chip) {
      const m = chip.getAttribute('data-hand-flight') as
        | 'hover'
        | 'cruise'
        | 'combat'
        | null;
      if (m) setFlightMode(m);
    }

    const track = el?.closest('[data-hand-slider-track]');
    if (track) {
      const kind = track.getAttribute('data-slider');
      const r = track.getBoundingClientRect();
      const pct = clamp((p.x - r.left) / r.width, 0, 1);
      const v = Math.round(pct * 100);
      if (kind === 'power') setPowerLevel(v);
      if (kind === 'thruster') setThruster(v);
    }
  }, []);

  const handOpts = useMemo(
    () => ({
      enabled: handControlEnabled && cameraReady,
      fps: 18,
      mirror: true,
      onPinchDown,
      onPinchUp,
    }),
    [handControlEnabled, cameraReady, onPinchDown, onPinchUp],
  );

  const {
    ready: modelReady,
    modelError,
    frame,
  } = useHandControl(videoRef, handOpts);

  const cursor = handControlEnabled && frame.cursor ? frame.cursor : null;
  const pinchGate = handControlEnabled ? frame.pinchGate : 'open';

  useEffect(() => {
    if (!handControlEnabled || !cursor || !dragRef.current) return;
    if (pinchGate !== 'closed') return;
    const pg = playgroundRef.current;
    if (!pg) return;
    const pr = pg.getBoundingClientRect();
    const { offX, offY, id } = dragRef.current;
    const { w, h } = panelDimsFor(id, pr.width);
    const left = clamp(cursor.x - pr.left - offX, 8, pr.width - w - 8);
    const top = clamp(cursor.y - pr.top - offY, 8, pr.height - h - 8);
    setPosFor(id, left, top);
  }, [cursor, pinchGate, handControlEnabled, setPosFor]);

  const engineOk = cameraReady && modelReady && !modelError;

  return (
    <div
      ref={playgroundRef}
      className='fixed inset-0 z-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
    >
      {/* Full-screen camera */}
      <div className='absolute inset-0 z-0 bg-black'>
        <CameraFeed
          ref={videoRef}
          className='h-full w-full scale-x-[-1] object-cover'
          aria-hidden
        />
        <div
          className='pointer-events-none absolute inset-0 bg-linear-to-b from-cyan-950/50 via-transparent to-black/90'
          aria-hidden
        />
        <div
          className='pointer-events-none absolute inset-0'
          style={{
            boxShadow:
              'inset 0 0 100px rgba(0,0,0,0.85), inset 0 -80px 120px rgba(249,115,22,0.06)',
          }}
          aria-hidden
        />
        <div
          className='pointer-events-none absolute inset-0 opacity-[0.12]'
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.45) 2px, rgba(0,0,0,0.45) 3px)',
          }}
          aria-hidden
        />
        <div
          className='pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay'
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(6,182,212,0.15), transparent 55%)',
          }}
          aria-hidden
        />
      </div>

      {/* HUD chrome */}
      <div className='pointer-events-none absolute inset-0 z-10 flex flex-col'>
        {/* Top bar */}
        <header className='pointer-events-auto flex shrink-0 flex-col gap-3 border-b border-cyan-500/20 bg-black/50 px-3 py-2.5 backdrop-blur-md sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-3'>
          <div className='min-w-0'>
            <p className='font-mono text-[8px] uppercase tracking-[0.35em] text-orange-400/90 sm:text-[9px]'>
              Stark-OS · Hand interface
            </p>
            <h1 className='mt-0.5 font-mono text-base font-bold tracking-[0.2em] text-cyan-100 sm:mt-1 sm:text-xl'>
              MARK HUD
            </h1>
            <p className='mt-0.5 font-mono text-[8px] text-cyan-600/80 sm:text-[9px]'>
              Optical tracking · pinch to engage
            </p>
          </div>
          <div className='flex flex-row items-center justify-end gap-3 sm:flex-col sm:items-end sm:gap-2'>
            <label className='pointer-events-auto flex cursor-pointer items-center gap-2 rounded border border-cyan-800/60 bg-cyan-950/40 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-cyan-400/90'>
              <input
                type='checkbox'
                className='accent-orange-500'
                checked={handControlEnabled}
                onChange={(e) => setHandControlEnabled(e.target.checked)}
              />
              Hand ctl
            </label>
            <Link
              href='/'
              className='pointer-events-auto font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-500/60 transition hover:text-orange-400/90'
            >
              ← Exit to FaceVerify
            </Link>
          </div>
        </header>

        {/* Side rails — hidden on small screens to free space */}
        <div className='pointer-events-none hidden min-h-0 flex-1 justify-between px-2 pt-4 sm:flex sm:px-4'>
          <div className='flex w-10 flex-col gap-1 pt-6 sm:w-14 sm:pt-8'>
            {['PWR', 'ENV', 'SIG', 'NET'].map((l, i) => (
              <div
                key={l}
                className='flex h-16 flex-col justify-end border-l-2 border-cyan-500/30 pl-2'
              >
                <span className='font-mono text-[7px] text-cyan-600/80'>
                  {l}
                </span>
                <motion.div
                  className='mt-1 w-full max-w-[6px] rounded-sm bg-linear-to-t from-orange-500/80 to-cyan-400/60'
                  animate={{ height: [28 + i * 8, 40 + i * 6, 28 + i * 8] }}
                  transition={{
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{ height: 32 + i * 6 }}
                />
              </div>
            ))}
          </div>
          <div className='flex w-10 flex-col items-end gap-2 pt-6 sm:w-14 sm:gap-3 sm:pt-8'>
            <div className='relative h-16 w-16 rounded-full border border-orange-500/30 sm:h-24 sm:w-24'>
              <motion.div
                className='absolute inset-1 rounded-full border border-cyan-400/40'
                animate={{ rotate: 360 }}
                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              />
              <div className='absolute inset-0 flex items-center justify-center font-mono text-[8px] text-cyan-500/70'>
                SCAN
              </div>
            </div>
            <div className='font-mono text-[7px] leading-tight text-right text-orange-400/70'>
              LAT
              <br />
              34.0522° N
            </div>
          </div>
        </div>

        {/* Bottom status strip */}
        <footer className='pointer-events-none shrink-0 border-t border-orange-500/20 bg-black/60 px-3 py-1.5 backdrop-blur-sm sm:px-4 sm:py-2'>
          <div className='flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-mono text-[7px] uppercase tracking-wider text-cyan-600/90 sm:text-[8px]'>
            <span>
              Uplink:{' '}
              <span className='text-emerald-400/90'>
                {engineOk ? 'nominal' : 'init'}
              </span>
            </span>
            <span className='text-orange-400/80'>
              {error ? error : 'Neural link · active'}
            </span>
            <span>
              Mode: <span className='text-cyan-300'>{flightMode}</span>
            </span>
          </div>
        </footer>
      </div>

      {/* Interactive layer — above HUD chrome for z-index */}
      <div className='pointer-events-none absolute inset-0 z-20'>
        {errorCode === 'permission_denied' ? (
          <p className='pointer-events-auto absolute left-1/2 top-1/3 z-50 max-w-sm -translate-x-1/2 rounded border border-amber-500/50 bg-black/90 px-4 py-3 text-center font-mono text-xs text-amber-200'>
            Camera access required for hand tracking.
          </p>
        ) : null}
        {modelError ? (
          <p className='pointer-events-auto absolute left-1/2 top-1/3 z-50 -translate-x-1/2 font-mono text-xs text-red-400'>
            {modelError}
          </p>
        ) : null}

        {/* Draggable — tactical */}
        <motion.div
          data-hand-draggable='tactical'
          className='pointer-events-auto absolute z-30 flex max-w-[calc(100vw-1.5rem)] flex-col rounded-lg border border-cyan-500/35 bg-black/55 px-3 py-2.5 shadow-[0_0_40px_rgba(6,182,212,0.12)] backdrop-blur-md sm:px-4 sm:py-3'
          style={{
            left: posTactical.left,
            top: posTactical.top,
            width: tacticalW(vw),
            minHeight: PANEL.tactical.h,
            touchAction: 'none',
          }}
        >
          <HudBracket />
          <span className='mb-2 font-mono text-[8px] uppercase tracking-[0.3em] text-orange-400/90'>
            Tactical
          </span>
          <div className='flex items-center justify-between gap-3'>
            <button
              type='button'
              data-hand-toggle
              data-mode='shield'
              className={`min-h-[44px] min-w-[120px] rounded border px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition ${
                shieldOn
                  ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100'
                  : 'border-zinc-600 bg-zinc-900/80 text-zinc-500'
              }`}
            >
              Shield {shieldOn ? 'ON' : 'off'}
            </button>
            <div className='text-right font-mono text-[9px] text-cyan-500/70'>
              <div>Threat</div>
              <div className='text-lg text-emerald-400/90'>LOW</div>
            </div>
          </div>
        </motion.div>

        {/* Draggable — arc reactor */}
        <motion.div
          data-hand-draggable='reactor'
          className='pointer-events-auto absolute z-30 flex max-w-[calc(100vw-1.5rem)] flex-col items-center justify-center rounded-full border border-orange-500/40 bg-black/50 p-3 shadow-[0_0_50px_rgba(249,115,22,0.15)] backdrop-blur-md sm:p-4'
          style={{
            left: posReactor.left,
            top: posReactor.top,
            width: reactorW(vw),
            height: reactorW(vw),
            touchAction: 'none',
          }}
        >
          <div
            className='relative flex size-[min(9rem,calc(100vw-6rem))] max-h-[min(9rem,calc(100vw-6rem))] max-w-[min(9rem,calc(100vw-6rem))] items-center justify-center rounded-full sm:size-36'
            style={{
              background: `conic-gradient(from 180deg, rgba(6,182,212,0.4) ${powerLevel * 3.6}deg, rgba(0,0,0,0.5) 0)`,
            }}
          >
            <div className='absolute inset-2 rounded-full border border-cyan-400/30 bg-black/70' />
            <div className='relative z-10 text-center'>
              <div className='font-mono text-[8px] uppercase text-orange-400/80'>
                Core
              </div>
              <div className='font-mono text-2xl font-bold tabular-nums text-cyan-200'>
                {powerLevel}%
              </div>
            </div>
          </div>
        </motion.div>

        {/* Draggable — flight chips */}
        <motion.div
          data-hand-draggable='targets'
          className='pointer-events-auto absolute z-30 max-w-[calc(100vw-1.5rem)] rounded-lg border border-cyan-500/30 bg-black/50 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3'
          style={{
            left: posTargets.left,
            top: posTargets.top,
            width: targetsW(vw),
            minHeight: PANEL.targets.h,
            touchAction: 'none',
          }}
        >
          <HudBracket />
          <span className='mb-3 block font-mono text-[8px] uppercase tracking-[0.3em] text-cyan-500/80'>
            Flight profile
          </span>
          <div className='flex flex-wrap gap-2'>
            {(
              [
                ['hover', 'Hover'],
                ['cruise', 'Cruise'],
                ['combat', 'Combat'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type='button'
                data-hand-flight={id}
                className={`min-h-[44px] min-w-[76px] rounded border px-2 py-2 font-mono text-[9px] uppercase tracking-wide transition ${
                  flightMode === id
                    ? 'border-orange-400/80 bg-orange-500/20 text-orange-100'
                    : 'border-zinc-600/80 bg-zinc-950/80 text-zinc-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Bottom deck — Reactor output / sliders (draggable) */}
        <motion.div
          data-hand-draggable='deck'
          className='pointer-events-auto absolute z-30 flex w-[min(92vw,520px)] max-w-[calc(100vw-1.5rem)] flex-col gap-3 rounded-xl border border-cyan-500/25 bg-black/60 px-4 py-3 backdrop-blur-lg sm:gap-4 sm:px-5 sm:py-4'
          style={{
            left: posDeck.left,
            top: posDeck.top,
            width: deckW(vw),
            touchAction: 'none',
          }}
        >
          <div className='flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.25em] text-cyan-600/80'>
            <span>Reactor output</span>
            <span className='text-cyan-300'>{powerLevel}%</span>
          </div>
          <div
            data-hand-slider-track
            data-slider='power'
            className='relative h-14 cursor-pointer rounded-lg border border-cyan-700/40 bg-zinc-950/80 px-3'
          >
            <div className='absolute left-3 right-3 top-1/2 h-4 -translate-y-1/2'>
              <div
                className='h-full max-w-full rounded-full bg-linear-to-r from-cyan-600/50 to-orange-500/40'
                style={{ width: `${powerLevel}%` }}
              />
              <div
                className='absolute top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                style={{ left: `${powerLevel}%` }}
              />
            </div>
          </div>

          <div className='flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.25em] text-cyan-600/80'>
            <span>Thruster vector</span>
            <span className='text-orange-300/90'>{thruster}%</span>
          </div>
          <div
            data-hand-slider-track
            data-slider='thruster'
            className='relative h-12 cursor-pointer rounded-lg border border-orange-700/30 bg-zinc-950/80 px-3'
          >
            <div className='absolute left-3 right-3 top-1/2 h-3 -translate-y-1/2'>
              <div
                className='h-full rounded-full bg-orange-500/35'
                style={{ width: `${thruster}%` }}
              />
              <div
                className='absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-400 bg-orange-500/25'
                style={{ left: `${thruster}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Virtual cursor */}
      {cursor && (
        <>
          <div
            className='pointer-events-none fixed z-200 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 bg-cyan-400/40 shadow-[0_0_24px_rgba(34,211,238,0.8)]'
            style={{ left: cursor.x, top: cursor.y }}
            aria-hidden
          />
          <div
            className='pointer-events-none fixed z-199 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30'
            style={{ left: cursor.x, top: cursor.y }}
            aria-hidden
          />
        </>
      )}
    </div>
  );
}
