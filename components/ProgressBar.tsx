'use client';

import { motion } from 'motion/react';
import { STEP_ORDER, type Step } from '@/lib/verification';

type Props = {
  currentStep: Step;
  completedSteps: Step[];
  success: boolean;
};

const ACTIVE = STEP_ORDER.filter((s) => s !== 'COMPLETE');

const STEP_LABELS: Partial<Record<Step, string>> = {
  LOOK_STRAIGHT: 'LOOK',
  TURN_LEFT: 'LEFT',
  TURN_RIGHT: 'RIGHT',
  OPEN_MOUTH: 'MOUTH',
  BLINK: 'BLINK',
};

export default function ProgressBar({
  currentStep,
  completedSteps,
  success,
}: Props) {
  const total = ACTIVE.length;
  const done = completedSteps.filter((s) => s !== 'COMPLETE').length;
  const linePct = success ? 100 : (done / total) * 100;

  return (
    <div className='rounded-lg border border-cyan-900/60 bg-[#061220]/80 px-4 py-3 backdrop-blur-sm'>
      <div className='mb-3 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.25em]'>
        <span className='text-cyan-500/50'>VERIFICATION SEQUENCE</span>
        <span className='text-cyan-400/70'>
          {done}/{total}
        </span>
      </div>

      {/* Track */}
      <div className='relative'>
        {/* Background rail */}
        <div className='absolute left-[14px] right-[14px] top-[13px] h-px bg-cyan-900/60' />

        {/* Animated fill */}
        <motion.div
          className='absolute top-[13px] h-px bg-linear-to-r from-cyan-600 to-cyan-400'
          style={{ left: '14px', right: `${100 - linePct}%` }}
          initial={false}
          animate={{ right: `${(1 - linePct / 100) * (100 - 28 / 4)}%` }}
          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
        />

        {/* Step nodes */}
        <div className='relative flex justify-between'>
          {ACTIVE.map((step, i) => {
            const isDone = completedSteps.includes(step);
            const isActive = currentStep === step && !isDone && !success;

            return (
              <div key={step} className='flex flex-col items-center gap-2'>
                <motion.div
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[9px] font-bold transition-colors ${
                    isDone
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                      : isActive
                        ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100'
                        : 'border-cyan-900/60 bg-[#040d18] text-cyan-800'
                  }`}
                  animate={
                    isActive
                      ? {
                          boxShadow: [
                            '0 0 0px rgba(6,182,212,0)',
                            '0 0 14px rgba(6,182,212,0.55)',
                            '0 0 0px rgba(6,182,212,0)',
                          ],
                        }
                      : {}
                  }
                  transition={{ repeat: Infinity, duration: 1.6 }}
                >
                  {isDone ? (
                    <svg
                      className='h-3 w-3 text-cyan-400'
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
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span
                  className={`font-mono text-[7px] uppercase tracking-wider ${
                    isDone
                      ? 'text-cyan-400/80'
                      : isActive
                        ? 'text-cyan-200'
                        : 'text-cyan-800/80'
                  }`}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
