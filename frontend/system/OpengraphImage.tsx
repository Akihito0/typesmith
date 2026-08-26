import { ImageResponse } from "next/og";

// Social share card, generated at build time. Colors mirror the app's canvas
// (dark editor) and brand blue from tailwind.config.ts.
export const OG_ALT = "TypeSmith — precision typography and UI design, in one tool";
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export function renderOpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "#171717",
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 18,
            background: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 46,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          T
        </div>
        <div style={{ fontSize: 58, fontWeight: 700 }}>TypeSmith</div>
      </div>

      <div
        style={{
          marginTop: 36,
          fontSize: 29,
          color: "#9ca3af",
          maxWidth: 880,
          lineHeight: 1.45,
        }}
      >
        Type scales, font pairing, WCAG contrast, and live mockups — free, no signup, shareable by
        link.
      </div>

      <div
        style={{
          marginTop: 56,
          display: "flex",
          alignItems: "flex-end",
          gap: 26,
          color: "#4b5563",
        }}
      >
        <div style={{ fontSize: 28 }}>Aa</div>
        <div style={{ fontSize: 40, color: "#6b7280" }}>Aa</div>
        <div style={{ fontSize: 56, color: "#9ca3af" }}>Aa</div>
        <div style={{ fontSize: 76, color: "#e5e7eb" }}>Aa</div>
        <div style={{ fontSize: 100, color: "#2563eb", fontWeight: 700 }}>Aa</div>
      </div>
    </div>,
    { ...OG_SIZE }
  );
}
