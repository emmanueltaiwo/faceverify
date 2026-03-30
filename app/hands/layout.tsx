import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MARK HUD · Hand interface',
  description:
    'Full-screen Iron Man–style HUD: hand-tracked cursor, pinch controls, draggable tactical panels.',
};

export default function HandsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
