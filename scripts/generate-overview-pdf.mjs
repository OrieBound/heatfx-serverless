/**
 * One-off: docs/project-overview-heatfx-serverless.md → HTML → PDF via Chrome headless.
 * Requires: Node, Google Chrome at default path (override with CHROME_PATH).
 */
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mdPath = join(root, "docs", "project-overview-heatfx-serverless.md");
const htmlPath = join(root, "docs", "_project-overview-print.html");
const pdfPath = join(root, "docs", "project-overview-heatfx-serverless.pdf");

const { marked } = await import("marked");

const md = readFileSync(mdPath, "utf8");
const body = marked.parse(md);
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>HeatFX — project overview</title>
  <style>
    body { font-family: "Segoe UI", system-ui, sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1rem;
      line-height: 1.45; font-size: 11pt; color: #111; }
    code, pre { font-family: Consolas, "Courier New", monospace; font-size: 0.88em; }
    pre { background: #f6f8fa; padding: 0.75rem 1rem; overflow-x: auto; border-radius: 6px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.95em; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; }
    img { max-width: 100%; height: auto; }
    h1, h2, h3, h4 { page-break-after: avoid; }
    tr, img, pre, blockquote { page-break-inside: avoid; }
    a { color: #0366d6; }
    @media print { a { color: #000; text-decoration: none; } }
  </style>
</head>
<body>
${body}
</body>
</html>`;

writeFileSync(htmlPath, html, "utf8");

const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");

execFileSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    `--print-to-pdf=${pdfPath}`,
    "--no-pdf-header-footer",
    fileUrl,
  ],
  { stdio: "inherit" }
);

unlinkSync(htmlPath);
console.log("Wrote:", pdfPath);
