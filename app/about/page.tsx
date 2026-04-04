'use client';

import { useRouter } from 'next/navigation';
import { useCursorColor } from '@/contexts/CursorColorContext';

export default function AboutPage() {
  const router = useRouter();
  const { color: accent } = useCursorColor();

  const features = [
    { icon: '🖱️', title: 'Mouse Heatmap', desc: 'Every click and position is plotted as a colour-coded overlay. High-activity areas glow brighter — instantly revealing where attention concentrates.' },
    { icon: '▶️', title: 'Cursor Replay', desc: 'Watch your exact cursor path play back in real time. Pauses, direction changes, and hover moments are all faithfully reproduced.' },
    { icon: '📊', title: 'Event Details', desc: 'A full breakdown of left clicks, right clicks, drags, wheel scrolls, moves, and pauses — with a downloadable CSV export.' },
    { icon: '🎨', title: 'Customisable Cursor', desc: 'Choose your cursor colour, animation theme, and size before or during recording. These settings are saved in the replay so it looks exactly as it did live.' },
    { icon: '🔒', title: 'No Video — Event Based', desc: 'HeatFX does not record your screen or take screenshots. It only captures coordinates and timestamps — fast, private, and tiny in file size.' },
    { icon: '☁️', title: 'Save & Access Anywhere', desc: 'Create a free account to save up to 20 recordings. Access them from any device, any time.' },
  ];

  const steps = [
    { n: 1, title: 'Start a recording', desc: 'Click "Start recording" on the homepage, or click anywhere inside the dark recording grid. A timer will appear — you are live.' },
    { n: 2, title: 'Interact freely', desc: 'Move your cursor, click (left or right), drag, and scroll inside the grid. Anything you do in the box is captured. Interact naturally — that is the point.' },
    { n: 3, title: 'Pause or stop when ready', desc: 'Click "Pause" to freeze the timer without ending the session, then "Resume" to continue. Click "Stop" (or press Space) when done, or let it auto-stop at 30 seconds.' },
    { n: 4, title: 'Customise on the fly', desc: 'During recording you can change your cursor colour (arrow keys), switch animation themes (keys 1-5), and resize the cursor (mouse wheel on the grid).' },
    { n: 5, title: 'View your results', desc: 'After stopping, click "Save & view results" (if logged in) or "View results" to open the results page. Switch between the Heatmap, Replay, and Details tabs.' },
    { n: 6, title: 'Save to your account', desc: 'Logged-in users can save recordings with one click. Saved recordings appear in "My Recordings" and can be revisited or deleted at any time.' },
  ];

  const tabs = [
    { tab: 'Heatmap', desc: 'A colour overlay drawn on top of the recording area. Cool colours (blue/green) show low activity; warm colours (yellow/red) show high activity. Useful for spotting click clusters and hover zones at a glance.' },
    { tab: 'Replay', desc: 'Plays back your cursor path exactly as it happened, with the same animation theme and colour you had during recording. Use the scrubber to jump to any point. This is not a video — it is fully vector-rendered, crisp at any size.' },
    { tab: 'Details', desc: 'Shows a summary table of every event type (moves, left clicks, right clicks, drags, scrolls, pauses) and their counts. You can also download the raw event data as a CSV file.' },
  ];

  const shortcuts = [
    { keys: ['Space'], desc: 'Stop the current recording' },
    { keys: ['1'], desc: 'Switch to Classic animation theme' },
    { keys: ['2'], desc: 'Switch to Neon animation theme' },
    { keys: ['3'], desc: 'Switch to Party animation theme' },
    { keys: ['4'], desc: 'Switch to Fire animation theme' },
    { keys: ['5'], desc: 'Switch to Ocean animation theme' },
    { keys: ['←', '→'], desc: 'Cycle through cursor colours' },
    { keys: ['Scroll'], desc: 'Resize cursor (mouse wheel on the grid)' },
  ];

  const faqs = [
    { q: 'Does HeatFX record my screen or camera?', a: 'No. It only captures mouse coordinates and event types (click, move, drag, scroll) within the recording grid. No pixels, no screenshots, no camera.' },
    { q: 'Do I need an account to use it?', a: 'No — recording and viewing results is completely free with no sign-up required. You only need an account if you want to save recordings and access them later.' },
    { q: 'How many recordings can I save?', a: 'Up to 20 recordings per account. Once you reach the limit, delete older ones to make room for new ones.' },
    { q: 'Why does the replay not look like a video?', a: 'HeatFX stores your mouse events (position + timestamp), not pixels. During replay, the cursor is re-drawn in real time from those events — crisp, scalable, and tiny in file size.' },
    { q: 'Can I record on mobile or touch devices?', a: 'HeatFX is optimised for desktop mouse input. Touch events are not currently captured.' },
    { q: 'What does the heatmap actually show?', a: 'Every recorded position is plotted as a semi-transparent dot. Overlapping dots accumulate brightness and shift colour from cool (low) to warm (high), showing where your cursor spent the most time.' },
  ];

  const sectionTitle = (text: string) => (
    <h2 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>{text}</h2>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Back + title */}
        <div style={{ marginBottom: 36 }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}
          >
            Back to app
          </button>
          <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            HeatFX <span style={{ color: accent }}>Guide</span>
          </h1>
          <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Everything you need to know about recording, replaying, and understanding your mouse interactions.
          </p>
        </div>

        {/* What is HeatFX */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('What is HeatFX?')}
          <div style={{ padding: '18px 20px', background: 'var(--surface)', borderLeft: `4px solid ${accent}`, borderRadius: 10, fontSize: '0.93rem', color: 'var(--text)', lineHeight: 1.7 }}>
            <strong>HeatFX</strong> is a free, browser-based tool that records your mouse movements, clicks,
            and drags inside a defined area, then lets you visualise them as an interactive{' '}
            <strong>heatmap</strong> or watch them back as a <strong>replay</strong>.
            <br /><br />
            It was built to help you understand how you naturally interact with an interface: where you
            hover, where you click most, how you move between targets. Lightweight, private, and no
            installation required.
          </div>
        </section>

        {/* Key features */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Key Features')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {features.map(f => (
              <div key={f.title} style={{ padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How to use */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('How to Use HeatFX')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {steps.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, marginTop: 2 }}>
                  {s.n}
                </span>
                <div>
                  <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{s.title}</p>
                  <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs explained */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Results Tabs Explained')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tabs.map(t => (
              <div key={t.tab} style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text)' }}>{t.tab}</p>
                <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Keyboard shortcuts */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Keyboard Shortcuts')}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 16px' }}>
            {shortcuts.map(sc => (
              <div key={sc.keys.join('+')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {sc.keys.map(k => (
                    <kbd key={k} style={{ padding: '3px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderBottom: '3px solid var(--border)', borderRadius: 5, fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)' }}>
                      {k}
                    </kbd>
                  ))}
                </div>
                <span style={{ fontSize: '0.87rem', color: 'var(--text-muted)' }}>{sc.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Frequently Asked Questions')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map(f => (
              <div key={f.q} style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.93rem', color: 'var(--text)' }}>{f.q}</p>
                <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '28px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <p style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            Ready to try it?
          </p>
          <button
            type="button"
            onClick={() => window.close()}
            style={{ padding: '11px 28px', background: accent, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
          >
            Start a recording
          </button>
        </div>

      </div>
    </div>
  );
}
