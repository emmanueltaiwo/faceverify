'use client';

import { motion, AnimatePresence } from 'motion/react';

type Props = {
  title: string;
  subtitle?: string;
};

export default function InstructionBox({ title, subtitle }: Props) {
  return (
    <div className='rounded-lg border border-cyan-900/60 bg-[#061220]/80 px-4 py-3 backdrop-blur-sm'>
      <p className='mb-1 font-mono text-[8px] uppercase tracking-[0.25em] text-cyan-500/50'>
        SYS.DIRECTIVE
      </p>
      <div className='min-h-7 flex items-center gap-2'>
        <span className='shrink-0 font-mono text-sm text-cyan-500/70'>›</span>
        <AnimatePresence mode='wait'>
          <motion.span
            key={title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18 }}
            className='font-mono text-sm tracking-wide text-cyan-100'
          >
            {title}
          </motion.span>
        </AnimatePresence>
        <span className='inline-block h-[14px] w-[2px] shrink-0 bg-cyan-400 animate-blink' />
      </div>
      <AnimatePresence>
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='mt-1.5 font-mono text-[10px] text-cyan-600/80'
          >
            {subtitle}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
