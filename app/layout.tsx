import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CursorColorProvider } from '@/contexts/CursorColorContext';
import { RecordingSettingsProvider } from '@/contexts/RecordingSettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';

export const metadata: Metadata = {
  title: 'HeatFX – Mouse heatmap & replay',
  description: 'Record mouse interactions, view heatmaps and replays.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0f12',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="app-body"
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', height: '100vh', overflow: 'hidden' }}
      >
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
