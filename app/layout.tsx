import type { Metadata } from 'next';
import './globals.css';
import { CursorColorProvider } from '@/contexts/CursorColorContext';
import { RecordingSettingsProvider } from '@/contexts/RecordingSettingsContext';

export const metadata: Metadata = {
  title: 'HeatFX – Mouse heatmap & replay',
  description: 'Record mouse interactions, view heatmaps and replays.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CursorColorProvider>
          <RecordingSettingsProvider>{children}</RecordingSettingsProvider>
        </CursorColorProvider>
      </body>
    </html>
  );
}
