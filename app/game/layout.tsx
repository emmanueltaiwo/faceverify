import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hand Runner',
  description: 'Endless runner controlled with your hand or keyboard.',
};

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
