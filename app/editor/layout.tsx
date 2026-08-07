import type { Metadata } from "next";
import { pageUrlMetadata } from "@/lib/site";

// The editor page itself is a client component, so its metadata lives here.
// Without this the route inherits the landing page's canonical and tells search
// engines /editor and / are the same page.
export const metadata: Metadata = {
  title: "Editor — TypeSmith",
  description:
    "Build a type scale, pair fonts, check WCAG and APCA contrast, and preview the system in live mockups. Runs in your browser — no signup, shareable by link.",
  ...pageUrlMetadata("/editor"),
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
