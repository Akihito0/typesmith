import type { Metadata } from "next";
import { pageUrlMetadata } from "@/backend/site";
import { PrivacyPage } from "@/frontend/docs/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy — TypeSmith",
  description:
    "TypeSmith runs entirely in your browser. No account, no server, no tracking — here is exactly what that means.",
  ...pageUrlMetadata("/privacy"),
};

export default function Page() {
  return <PrivacyPage />;
}
