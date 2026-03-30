import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'J.A.R.V.I.S. · MARK HUD',
  description:
    'Full-screen Iron Man-style HUD: hand-tracked cursor, pinch controls, draggable tactical panels.',
};

export default function JarvisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
