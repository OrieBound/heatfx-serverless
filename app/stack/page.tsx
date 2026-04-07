'use client';

import { useCursorColor } from '@/contexts/CursorColorContext';

export default function StackPage() {
  const { color: accent } = useCursorColor();

  const sectionTitle = (text: string) => (
    <h2 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>{text}</h2>
  );

  const frontend = [
    { name: 'Next.js 14', role: 'React framework', detail: 'App Router with static export — the entire app compiles to plain HTML/CSS/JS files with no server required at runtime.' },
    { name: 'TypeScript', role: 'Language', detail: 'Strictly typed throughout for reliability. Catches bugs at compile time rather than in production.' },
    { name: 'React 18', role: 'UI library', detail: 'Functional components with hooks (useState, useEffect, useRef, useCallback, useMemo, useContext) and custom contexts for global state.' },
    { name: 'CSS-in-JS (inline)', role: 'Styling', detail: 'No external CSS framework. All styles are written as inline React style objects with CSS custom properties for theming.' },
    { name: 'Canvas API', role: 'Heatmap rendering', detail: 'The heatmap is drawn programmatically onto an HTML5 Canvas element using the 2D context, then exported as a data URL for display.' },
    { name: 'RequestAnimationFrame', role: 'Replay engine', detail: 'The cursor replay is driven by a rAF loop — not video playback. Every frame the cursor position is interpolated from the stored event timestamps.' },
  ];

  const backend = [
    { name: 'AWS Lambda', role: 'API compute', detail: 'A single Node.js 20.x Lambda function handles all API routes. Serverless — runs only when a request arrives, costs nothing when idle.' },
    { name: 'AWS API Gateway (HTTP API)', role: 'API layer', detail: 'Routes HTTP requests to Lambda. JWT authorizer validates Cognito tokens automatically before the Lambda even runs.' },
    { name: 'AWS DynamoDB', role: 'Session metadata', detail: 'NoSQL table storing recording metadata (timestamps, dimensions, event counts, S3 key). Partition key: USER#sub. Sort key: SESSION#createdAt#sessionId for efficient per-user queries.' },
    { name: 'AWS S3', role: 'Event payload storage', detail: 'Raw event arrays (mouse coordinates + timestamps) are stored as JSON objects in S3 under sessions/{sub}/{sessionId}/events.json. S3 presigned URLs give the browser direct read access.' },
    { name: 'AWS Cognito', role: 'Authentication', detail: 'User Pool manages sign-up, email verification, and login. The app uses custom pages with SRP (Secure Remote Password) via amazon-cognito-identity-js. A Cognito domain prefix and OAuth callback/logout URLs are still configured in infrastructure for redirect flows (e.g. /auth/callback). Cognito Groups handle the admin role.' },
  ];

  const infra = [
    { name: 'AWS CloudFormation + SAM', role: 'Infrastructure as Code', detail: 'The stack (Lambda, API Gateway, DynamoDB, S3, Cognito, CloudFront) is defined in YAML under infra/cloudformation/. One deploy tears it down or rebuilds it. A Terraform-based layout is planned under infra/terraform — use one IaC path per environment, not both at once.' },
    { name: 'AWS CloudFront', role: 'CDN', detail: 'Serves the static frontend globally from edge locations. Origin Access Control (OAC) locks the S3 bucket so only CloudFront can read it. A CloudFront Function rewrites clean URLs to .html files.' },
    { name: 'S3 Static Hosting', role: 'Frontend delivery', detail: 'The Next.js static export (out/) is synced to S3 and served through CloudFront over HTTPS. No web server required — completely serverless end to end.' },
    { name: 'IAM Roles & Policies', role: 'Security', detail: 'Lambda has the minimum permissions required: read/write to its own S3 prefix, read/write to DynamoDB, and Cognito admin calls for group management. No wildcard permissions.' },
    { name: 'Nested CloudFormation Stacks', role: 'Modularity', detail: 'The parent stack delegates to four nested stacks: data (DynamoDB + S3), auth (Cognito), api (Lambda + API Gateway), and frontend (S3 + CloudFront). Each can be updated independently.' },
    { name: 'CodePipeline + CodeBuild', role: 'Prod CI/CD (optional)', detail: 'For production, GitHub (AWS CodeConnections) can drive CodePipeline: CodeBuild runs cloudformation package/deploy, builds Next.js using stack outputs as env vars, syncs out/ to the site bucket, and invalidates CloudFront (buildspec.yml at repo root). Dev deploys can still use the scripts locally.' },
  ];

  const devtools = [
    { name: 'Deploy scripts', role: 'Deployment', detail: 'scripts/deploy-aws.sh and deploy-aws.ps1 package Lambda, upload to your packaging bucket, and deploy the parent stack. Pipeline-based prod deploys use the same packaging/deploy steps inside CodeBuild.' },
    { name: 'Git + GitHub', role: 'Version control', detail: 'Full source code is open on GitHub — CloudFormation templates, Lambda code, and Next.js frontend included.' },
    { name: 'AWS CLI', role: 'Cloud operations', detail: 'Used for stack management, Cognito user/group administration, S3 sync, and CloudFront invalidations during deployment.' },
    { name: 'nanoid', role: 'ID generation', detail: 'Lightweight URL-safe unique ID generator used for recording session IDs on the frontend before the API confirms.' },
    { name: 'amazon-cognito-identity-js', role: 'Auth client', detail: 'SRP authentication library that talks directly to the Cognito API without redirecting to a hosted login page.' },
  ];

  const Card = ({ name, role, detail }: { name: string; role: string; detail: string }) => (
    <div style={{ padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: '0.97rem', color: 'var(--text)' }}>{name}</span>
        <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 20, background: `${accent}22`, color: accent, fontWeight: 600, whiteSpace: 'nowrap' }}>{role}</span>
      </div>
      <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{detail}</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

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
            HeatFX <span style={{ color: accent }}>Stack</span>
          </h1>
          <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            A complete breakdown of every technology used to build and run HeatFX — from the browser to the cloud.
          </p>
        </div>

        {/* Architecture summary */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Architecture Overview')}
          <div style={{ padding: '18px 20px', background: 'var(--surface)', borderLeft: `4px solid ${accent}`, borderRadius: 10, fontSize: '0.93rem', color: 'var(--text)', lineHeight: 1.75 }}>
            HeatFX is a <strong>fully serverless</strong> application — there are no always-on servers.
            The frontend is a static Next.js export served from <strong>S3 via CloudFront</strong>.
            All API logic runs in a single <strong>AWS Lambda</strong> function, triggered on demand through <strong>API Gateway</strong>.
            Recording metadata lives in <strong>DynamoDB</strong> and raw event payloads in <strong>S3</strong>.
            Authentication is handled by <strong>AWS Cognito</strong>.
            Infrastructure is defined as code in <strong>CloudFormation</strong> today (with <strong>Terraform</strong> planned under <code style={{ fontSize: '0.88em' }}>infra/terraform</code>).
            You can deploy or tear down with one command from the scripts, or use an optional <strong>CodePipeline</strong> build for production from GitHub.
          </div>
        </section>

        {/* Frontend */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Frontend')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {frontend.map(f => <Card key={f.name} {...f} />)}
          </div>
        </section>

        {/* Backend */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Backend & API')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {backend.map(f => <Card key={f.name} {...f} />)}
          </div>
        </section>

        {/* Infrastructure */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Cloud Infrastructure')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {infra.map(f => <Card key={f.name} {...f} />)}
          </div>
        </section>

        {/* Dev tools */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Developer Tools & Libraries')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {devtools.map(f => <Card key={f.name} {...f} />)}
          </div>
        </section>

        {/* Cost note */}
        <section style={{ marginBottom: 40 }}>
          {sectionTitle('Running Cost')}
          <div style={{ padding: '18px 20px', background: 'var(--surface)', borderLeft: `4px solid ${accent}`, borderRadius: 10, fontSize: '0.93rem', color: 'var(--text)', lineHeight: 1.75 }}>
            At low-to-moderate usage, HeatFX runs for <strong>effectively free</strong> on the AWS free tier.
            Lambda charges per invocation (first 1M requests/month free). DynamoDB charges per read/write (first 25 GB free).
            S3 charges per GB stored (first 5 GB free). CloudFront charges per GB transferred (first 1 TB/month free).
            There are no always-on servers or reserved capacity — cost scales directly with usage and approaches zero when idle.
          </div>
        </section>

      </div>
    </div>
  );
}
