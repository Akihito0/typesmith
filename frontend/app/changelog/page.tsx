import type { Metadata } from "next";
import { pageUrlMetadata } from "@/backend/site";
import { ChangelogPage } from "@/frontend/docs/ChangelogPage";

export const metadata: Metadata = {
  title: "Changelog — TypeSmith",
  description: "What has shipped in TypeSmith, newest first.",
  ...pageUrlMetadata("/changelog"),
};

export default function Page() {
  return <ChangelogPage />;
}
