// Email-safe HTML export for the Newsletter layout. Everything is inline
// styles on simple block elements — no external CSS, no web-font @imports
// (clients strip them), just the font stacks with system fallbacks.

import type { ProjectState } from "@/backend/project/store";
import { fontById } from "@/backend/fonts/catalog";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateEmailHtml(state: ProjectState): string {
  const heading = fontById(state.headingFont);
  const body = fontById(state.bodyFont);
  const name = escapeHtml(state.projectName);
  const initials = escapeHtml(
    state.projectName
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(state.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f3f5;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(state.subhead)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${state.background};border-radius:8px;overflow:hidden;">
        <tr><td style="padding:40px 40px 32px 40px;">
          <div style="width:36px;height:36px;border-radius:6px;background:${state.accent};color:#ffffff;font:bold 13px/36px ${body.stack};text-align:center;">${initials}</div>
          <h1 style="margin:20px 0 0 0;font-family:${heading.stack};font-size:26px;font-weight:${state.headingWeight};line-height:${state.headingLeading};letter-spacing:${state.headingTracking}em;color:${state.foreground};">${escapeHtml(state.headline)}</h1>
          <p style="margin:16px 0 0 0;font-family:${body.stack};font-size:15px;font-weight:${state.bodyWeight};line-height:${state.bodyLeading};color:${state.mutedColor};">${escapeHtml(state.body)}</p>
          <a href="https://example.com" style="display:inline-block;margin-top:24px;padding:11px 22px;border-radius:6px;background:${state.accent};color:#ffffff;font-family:${body.stack};font-size:13px;font-weight:600;text-decoration:none;">Read the full story</a>
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid ${state.surfaceColor};font-family:${body.stack};font-size:11px;color:${state.mutedColor};">
          ${name} · You're receiving this because you subscribed. <a href="https://example.com/unsubscribe" style="color:${state.mutedColor};">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}
