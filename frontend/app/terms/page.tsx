import type { Metadata } from "next";
import { pageUrlMetadata } from "@/backend/site";
import { TermsPage } from "@/frontend/docs/TermsPage";

export const metadata: Metadata = {
  title: "Terms — TypeSmith",
  description:
    "The terms of use for TypeSmith — a free, no-signup typography tool provided as-is during beta.",
  ...pageUrlMetadata("/terms"),
};

export default function Page() {
  return <TermsPage />;
}
