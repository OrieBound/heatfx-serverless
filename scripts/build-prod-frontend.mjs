/**
 * Production static build: same NEXT_PUBLIC_* as .env.local except redirect URI,
 * which must match the HTTPS URL users use (Cognito app client callback list).
 *
 * Usage (repo root):
 *   node scripts/build-prod-frontend.mjs
 *
 * Override site origin (no trailing slash):
 *   HEATFX_PUBLIC_SITE_ORIGIN=https://www.example.com node scripts/build-prod-frontend.mjs
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const origin = (process.env.HEATFX_PUBLIC_SITE_ORIGIN || 'https://heatfx.oriehulan.com').replace(
  /\/$/,
  ''
);
const redirect = `${origin}/auth/callback`;
console.log('Building with NEXT_PUBLIC_COGNITO_REDIRECT_URI =', redirect);

const r = spawnSync('npm', ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_COGNITO_REDIRECT_URI: redirect },
});
process.exit(r.status ?? 1);
