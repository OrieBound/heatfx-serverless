'use client';

import { useCursorColor } from '@/contexts/CursorColorContext';

export default function WhyPage() {
  const { color: accent } = useCursorColor();

  const sectionTitle = (text: string) => (
    <h2 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>{text}</h2>
  );

  const reasons = [
    {
      icon: '🧠',
      title: 'Data is invisible — until you visualise it',
      body: 'Every time you move a mouse, a coordinate is generated. Every click is a timestamped event. Modern web apps track all of this, but it is rarely shown back to the user in a meaningful way. HeatFX makes that data tangible — you can see exactly where your attention went, without a single line of analytics code on the page you are testing.',
    },
    {
      icon: '🎥',
      title: 'A replay without a video',
      body: 'Screen recording tools capture pixels — they are heavy, require browser permissions, and produce large files. HeatFX takes a different approach: it stores only the events (position, type, timestamp) and re-draws the session from those numbers at playback time. The result is a perfectly smooth, infinitely scalable replay that weighs kilobytes, not megabytes. No camera, no screen capture, no privacy concern.',
    },
    {
      icon: '☁️',
      title: 'A real-world serverless reference',
      body: 'Most tutorials show serverless in isolation — a single Lambda, a single bucket. HeatFX is a complete, production-shaped application: auth, API, database, file storage, CDN, and IaC all working together. It demonstrates how these pieces connect at a real scale, and the entire infrastructure can be spun up or torn down with one command — or continuously delivered from GitHub via CodePipeline in prod.',
    },
    {
      icon: '💸',
      title: 'Serverless economics in practice',
      body: 'HeatFX runs at effectively zero cost when idle. There are no always-on servers, no reserved capacity, no minimum spend. Lambda charges per invocation. DynamoDB charges per read and write. CloudFront charges per byte transferred. At low-to-moderate usage, the entire stack sits comfortably inside the AWS free tier. This is the economics argument for serverless — demonstrated on a real project, not a slide deck.',
    },
    {
      icon: '🎨',
      title: 'Fun is a feature',
      body: 'Not every project needs to solve a critical problem. HeatFX is enjoyable to use. Watching your own cursor path play back, seeing where you naturally clicked, switching animation themes mid-recording — it is a genuinely entertaining experience. The technical depth is real, but so is the playfulness. A project that people actually want to open and try is more valuable than one that just looks impressive on a resume.',
    },
    {
      icon: '🔓',
      title: 'Open source and self-deployable',
      body: 'The full source code — CloudFormation templates (with Terraform planned as an alternative), Lambda handler, and Next.js frontend — is available on GitHub. Anyone can deploy their own instance into their own AWS account. The infrastructure is designed to be reusable: parameters, deploy scripts, and optional pipeline wiring get a complete independent stack running in minutes.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <button
            type="button"
            onClick={() => window.close()}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}
          >
            ← Close
          </button>
          <h1 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Why <span style={{ color: accent }}>HeatFX</span>?
          </h1>
          <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            The thinking behind the project — what it explores, what it demonstrates, and why it was worth building.
          </p>
        </div>

        {/* Intro */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ padding: '20px 22px', background: 'var(--surface)', borderLeft: `4px solid ${accent}`, borderRadius: 10, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.8 }}>
            HeatFX started as a question: <strong>can you replay exactly what a user did on a page — without recording a video?</strong>
            <br /><br />
            The answer turned out to be yes, and the implementation turned into something broader: a fully serverless, production-shaped web application that demonstrates data collection, cloud infrastructure, and real-time visualisation — wrapped in something genuinely fun to play with.
          </div>
        </section>

        {/* Reasons */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('The reasons behind it')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reasons.map(r => (
              <div
                key={r.title}
                style={{ padding: '20px 22px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>{r.icon}</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{r.title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section>
          <div style={{ padding: '24px 26px', background: 'var(--surface)', border: `1px solid ${accent}44`, borderRadius: 12, textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
              Built by Orie
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
              Full-stack developer with a focus on serverless architecture, developer experience, and building things that are actually enjoyable to use.
            </p>
            <button
              type="button"
              onClick={() => window.close()}
              style={{ padding: '10px 26px', background: accent, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
            >
              Go try it
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
