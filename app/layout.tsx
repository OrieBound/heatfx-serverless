import type { Metadata } from 'next';
import './globals.css';
import { CursorColorProvider } from '@/contexts/CursorColorContext';
import { RecordingSettingsProvider } from '@/contexts/RecordingSettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';

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
      <body style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AuthProvider>
          <CursorColorProvider>
            <RecordingSettingsProvider>
              <AppHeader />
              <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
                {children}
              </div>
            </RecordingSettingsProvider>
          </CursorColorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
